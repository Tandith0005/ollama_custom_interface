import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import ChatHistoryService from './chatHistory.service.js';
import { 
  createSessionSchema,
  updateSessionSchema,
  addMessageSchema,
  getSessionsQuerySchema,
  sessionIdParamSchema,
  messageIdParamSchema,
  modelSettingsSchema
} from './chatHistory.validation.js';

const createSession = catchAsync(async (req: Request, res: Response) => {
  const validatedData = createSessionSchema.parse(req.body);
  const session = ChatHistoryService.createSession(validatedData);
  
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Chat session created successfully',
    data: session,
  });
});

const getSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  const session = ChatHistoryService.getSessionWithMessages(sessionId);
  
  if (!session) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: 'Session not found',
      data: null,
    });
  }
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Session retrieved successfully',
    data: session,
  });
});

const getAllSessions = catchAsync(async (req: Request, res: Response) => {
  const query = getSessionsQuerySchema.parse(req.query);
  const sessions = ChatHistoryService.getAllSessions(query);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Sessions retrieved successfully',
    data: sessions,
    meta: {
      count: sessions.length,
    },
  });
});

const updateSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  const validatedData = updateSessionSchema.parse(req.body);
  
  const session = ChatHistoryService.updateSession(sessionId, validatedData);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Session updated successfully',
    data: session,
  });
});

const deleteSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  ChatHistoryService.deleteSession(sessionId);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Session deleted successfully',
    data: null,
  });
});

const permanentlyDeleteSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  ChatHistoryService.permanentlyDeleteSession(sessionId);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Session permanently deleted',
    data: null,
  });
});

const addMessage = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  const validatedData = addMessageSchema.parse(req.body);
  
  const message = ChatHistoryService.addMessage({
    session_id: sessionId,
    ...validatedData,
  });
  
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Message added successfully',
    data: message,
  });
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  const messages = ChatHistoryService.getSessionMessages(sessionId);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Messages retrieved successfully',
    data: messages,
    meta: {
      count: messages.length,
    },
  });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = messageIdParamSchema.parse({ messageId: parseInt(req.params.messageId) });
  ChatHistoryService.deleteMessage(messageId);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Message deleted successfully',
    data: null,
  });
});

const clearMessages = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  ChatHistoryService.clearSessionMessages(sessionId);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All messages cleared from session',
    data: null,
  });
});

const getModelSettings = catchAsync(async (req: Request, res: Response) => {
  const { modelName } = req.params;
  const settings = ChatHistoryService.getModelSettings(modelName);
  
  if (!settings) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: `Model "${modelName}" settings not found`,
      data: null,
    });
  }
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Model settings retrieved successfully',
    data: settings,
  });
});

const updateModelSettings = catchAsync(async (req: Request, res: Response) => {
  const { modelName } = req.params;
  const validatedData = modelSettingsSchema.parse(req.body);
  
  const settings = ChatHistoryService.updateModelSettings(modelName, validatedData);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Model settings updated successfully',
    data: settings,
  });
});

const getStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = ChatHistoryService.getSessionStats();
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Statistics retrieved successfully',
    data: stats,
  });
});

const exportSession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = sessionIdParamSchema.parse({ sessionId: req.params.sessionId });
  const session = ChatHistoryService.exportSession(sessionId);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.json"`);
  res.json(session);
});

const exportAllSessions = catchAsync(async (_req: Request, res: Response) => {
  const sessions = ChatHistoryService.exportAllSessions();
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="all-sessions.json"');
  res.json(sessions);
});

export const ChatHistoryController = {
  createSession,
  getSession,
  getAllSessions,
  updateSession,
  deleteSession,
  permanentlyDeleteSession,
  addMessage,
  getMessages,
  deleteMessage,
  clearMessages,
  getModelSettings,
  updateModelSettings,
  getStats,
  exportSession,
  exportAllSessions,
};