import express from "express";
import cors from "cors";
import { envVars } from "./config/envVars.js";
import { notFound } from "./middlewares/notFound.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import { IndexRoutes } from "./routes/indexRoutes.js";



const app = express();

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: [envVars.APP_URL],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "stripe-signature",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
  }),
);


// all module routes
app.use("/api/v1", IndexRoutes);


// not found
app.use(notFound);

app.get("/", (_req, res) => {
  res.send("Ollama AI Backend Interface is running!");
});

// global error handler
app.use(globalErrorHandler);

export default app;
