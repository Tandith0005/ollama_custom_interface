import { Router } from 'express';
import { ChatHistoryController } from './chatHistory.controller.js';

const router = Router();

// Session routes
router.post('/sessions', ChatHistoryController.createSession);
router.get('/sessions', ChatHistoryController.getAllSessions);
router.get('/sessions/:sessionId', ChatHistoryController.getSession);
router.patch('/sessions/:sessionId', ChatHistoryController.updateSession);
router.delete('/sessions/:sessionId', ChatHistoryController.deleteSession);
router.delete('/sessions/:sessionId/permanent', ChatHistoryController.permanentlyDeleteSession);

// Message routes
router.post('/sessions/:sessionId/messages', ChatHistoryController.addMessage);
router.get('/sessions/:sessionId/messages', ChatHistoryController.getMessages);
router.delete('/messages/:messageId', ChatHistoryController.deleteMessage);
router.delete('/sessions/:sessionId/messages/clear', ChatHistoryController.clearMessages);

// Model settings routes
router.get('/settings/:modelName', ChatHistoryController.getModelSettings);
router.patch('/settings/:modelName', ChatHistoryController.updateModelSettings);

// Statistics route
router.get('/stats', ChatHistoryController.getStats);

// Export routes
router.get('/sessions/:sessionId/export', ChatHistoryController.exportSession);
router.get('/export/all', ChatHistoryController.exportAllSessions);

export const ChatHistoryRoutes = router;