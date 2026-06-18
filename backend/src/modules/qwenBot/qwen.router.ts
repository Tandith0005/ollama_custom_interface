import { Router } from 'express';
import { QwenController } from './qwen.controller.js';

const router = Router();

// Chat endpoints
router.post('/chat', QwenController.sendMessage);
router.post('/chat/history', QwenController.sendChatHistory);

// Model endpoints
router.get('/models', QwenController.getModels);
router.get('/models/:model', QwenController.getModelInfo);

export const QwenRoutes = router;