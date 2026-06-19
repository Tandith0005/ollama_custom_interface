import { envVars } from '../../config/envVars.js';
import AppError from '../../utils/appError.js';
import { logger } from '../../utils/logger.js';
import ChatHistoryService from '../chatHistory/chatHistory.service.js';
import { 
  QwenChatRequest, 
  QwenChatResponse, 
  QwenStreamChunk,
  OllamaModelsResponse 
} from './qwen.types.js';

const ollamaUrl = envVars.OLLAMA_URL;

// ============ CORE SERVICE FUNCTIONS ============

export const sendMessage = async (request: QwenChatRequest): Promise<QwenChatResponse> => {
  const { message, model = 'qwen:latest', stream = false, options } = request;

  logger.info('Sending message to Ollama', { model, stream, messageLength: message.length });

  const requestBody = {
    model,
    messages: [{ role: 'user', content: message }],
    stream,
    options: options || {},
  };

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Ollama API error', { status: response.status, error: errorText });
      throw new AppError(
        `Ollama API error: ${response.status} - ${errorText}`,
        response.status === 404 ? 404 : 503
      );
    }

    const data = await response.json() as QwenChatResponse;
    logger.info('Received response from Ollama', { 
      model: data.model, 
      done: data.done,
      evalCount: data.eval_count 
    });

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AppError(
        'Ollama service is unavailable. Please ensure Ollama is running on ' + ollamaUrl,
        503
      );
    }
    
    logger.error('Error sending message to Ollama', { error });
    throw new AppError('Failed to communicate with Ollama service', 500);
  }
};

export const sendMessageStream = async function* (request: QwenChatRequest): AsyncGenerator<QwenStreamChunk> {
  const { message, model = 'qwen:latest', options } = request;

  logger.info('Sending streaming message to Ollama', { model, messageLength: message.length });

  const requestBody = {
    model,
    messages: [{ role: 'user', content: message }],
    stream: true,
    options: options || {},
  };

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(
        `Ollama API error: ${response.status} - ${errorText}`,
        response.status === 404 ? 404 : 503
      );
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
          const chunk = JSON.parse(line) as QwenStreamChunk;
          yield chunk;
          
          if (chunk.done) {
            logger.info('Stream completed', { model: chunk.model });
            return;
          }
        } catch (parseError) {
          logger.warn('Failed to parse stream chunk', { line, error: parseError });
        }
      }
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AppError(
        'Ollama service is unavailable. Please ensure Ollama is running on ' + ollamaUrl,
        503
      );
    }
    
    logger.error('Error streaming message to Ollama', { error });
    throw new AppError('Failed to stream from Ollama service', 500);
  }
};

export const getModels = async (): Promise<OllamaModelsResponse> => {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    
    if (!response.ok) {
      throw new AppError('Failed to fetch models from Ollama', 503);
    }

    const data = await response.json() as OllamaModelsResponse;
    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AppError(
        'Ollama service is unavailable. Please ensure Ollama is running on ' + ollamaUrl,
        503
      );
    }
    
    logger.error('Error fetching models from Ollama', { error });
    throw new AppError('Failed to fetch models from Ollama service', 500);
  }
};

export const getModelInfo = async (model: string): Promise<any> => {
  try {
    const response = await fetch(`${ollamaUrl}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model }),
    });

    if (!response.ok) {
      throw new AppError(`Model "${model}" not found`, 404);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`Error fetching model info for ${model}`, { error });
    throw new AppError(`Failed to fetch model info for "${model}"`, 500);
  }
};

// ============ FUNCTIONS WITH CHAT HISTORY ============

/**
 * Send a message and automatically save to chat history
 * @param request - Chat request
 * @param sessionId - Optional existing session ID
 * @returns Response with session ID
 */
export const sendMessageAndSave = async (
  request: QwenChatRequest, 
  sessionId?: string
): Promise<{
  response: QwenChatResponse;
  sessionId: string;
}> => {
  // Create or get session
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    const session = ChatHistoryService.createSession({
      model: request.model || 'qwen:latest',
      title: request.message.slice(0, 50) + (request.message.length > 50 ? '...' : '')
    });
    currentSessionId = session.session_id;
  }

  // Save user message
  ChatHistoryService.addMessage({
    session_id: currentSessionId,
    role: 'user',
    content: request.message,
  });

  // Get response from Ollama
  const response = await sendMessage(request);

  // Save assistant response
  ChatHistoryService.addMessage({
    session_id: currentSessionId,
    role: 'assistant',
    content: response.message.content,
    tokens_used: response.eval_count || 0,
  });

  return { response, sessionId: currentSessionId };
};

/**
 * Send a streaming message and automatically save to chat history
 * @param request - Chat request
 * @param sessionId - Optional existing session ID
 * @returns AsyncGenerator with chunks and session ID
 */
export const sendMessageStreamAndSave = async function* (
  request: QwenChatRequest, 
  sessionId?: string
): AsyncGenerator<{
  chunk: QwenStreamChunk;
  sessionId: string;
}> {
  let currentSessionId = sessionId;
  let fullResponse = '';

  // Create or get session
  if (!currentSessionId) {
    const session = ChatHistoryService.createSession({
      model: request.model || 'qwen:latest',
      title: request.message.slice(0, 50) + (request.message.length > 50 ? '...' : '')
    });
    currentSessionId = session.session_id;
  }

  // Save user message
  ChatHistoryService.addMessage({
    session_id: currentSessionId,
    role: 'user',
    content: request.message,
  });

  // Get streaming response
  const stream = sendMessageStream({ ...request, stream: true });

  for await (const chunk of stream) {
    if (!chunk.done) {
      fullResponse += chunk.message.content;
    }
    yield { chunk, sessionId: currentSessionId };
  }

  // Save assistant response
  ChatHistoryService.addMessage({
    session_id: currentSessionId,
    role: 'assistant',
    content: fullResponse,
    tokens_used: 0, // Ollama doesn't provide token count in streaming mode
  });
};

// Export as object for compatibility with existing imports
const QwenService = {
  sendMessage,
  sendMessageStream,
  getModels,
  getModelInfo,
  sendMessageAndSave,
  sendMessageStreamAndSave,
};

export default QwenService;