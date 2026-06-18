import { Router } from "express";
import { QwenRoutes } from "../modules/qwenBot/qwen.router.js";
import { ChatHistoryRoutes } from "../modules/chatHistory/chatHistory.router.js";


const router = Router();

// Qwen AI routes
router.use("/qwen", QwenRoutes);
// Chat history routes
router.use("/history", ChatHistoryRoutes);

// Health check
router.get("/health", (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

export const IndexRoutes = router;