import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import QwenService from './qwen.service.js';
import { 
  chatValidationSchema, 
  modelValidationSchema,
  chatHistoryValidationSchema 
} from './qwen.validation.js';
import { logger } from '../../utils/logger.js';
import AppError from '../../utils/appError.js';

export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const validatedData = chatValidationSchema.parse(req.body);
  const { message, model, stream, options, sessionId } = validatedData;

  if (stream) {
    // Handle streaming response with history saving
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const streamGenerator = QwenService.sendMessageStreamAndSave(
        { message, model, stream: true, options },
        sessionId
      );

      let currentSessionId = sessionId;

      for await (const { chunk, sessionId: streamSessionId } of streamGenerator) {
        currentSessionId = streamSessionId;
        res.write(`data: ${JSON.stringify({ ...chunk, sessionId: streamSessionId })}\n\n`);
        
        if (chunk.done) {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Stream error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Handle regular response with history saving
    const { response, sessionId: newSessionId } = await QwenService.sendMessageAndSave(
      { message, model, stream: false, options },
      sessionId
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Chat response received successfully',
      data: {
        ...response,
        sessionId: newSessionId,
      },
    });
  }
});

export const getModels = catchAsync(async (_req: Request, res: Response) => {
  const result = await QwenService.getModels();
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Models fetched successfully',
    data: result,
  });
});

export const getModelInfo = catchAsync(async (req: Request, res: Response) => {
  const { model } = modelValidationSchema.parse({ model: req.params.model });
  const result = await QwenService.getModelInfo(model);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Model "${model}" info fetched successfully`,
    data: result,
  });
});

export const sendChatHistory = catchAsync(async (req: Request, res: Response) => {
  const validatedData = chatHistoryValidationSchema.parse(req.body);
  const { messages, model, stream } = validatedData;

  if (stream) {
    // Handle streaming with history
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const requestBody = {
        model,
        messages,
        stream: true,
      };

      const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new AppError('Failed to stream from Ollama', 503);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new AppError('Failed to get response stream', 500);
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const chunk = JSON.parse(line);
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            
            if (chunk.done) {
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }
          } catch (parseError) {
            logger.warn('Failed to parse stream chunk', { line, error: parseError });
          }
        }
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Stream error' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Handle regular response with history
    const requestBody = {
      model,
      messages,
      stream: false,
    };

    const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new AppError('Failed to get response from Ollama', 503);
    }

    const data = await response.json();
    
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Chat response received successfully',
      data,
    });
  }
});

// Export all controller functions as an object
export const QwenController = {
  sendMessage,
  getModels,
  getModelInfo,
  sendChatHistory,
};