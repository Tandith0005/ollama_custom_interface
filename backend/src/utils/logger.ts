import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { envVars } from "../config/envVars.js";

// Create logs directory if it doesn't exist
const logDir = join(process.cwd(), "logs");
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

// Create write streams for file logging
const errorStream = createWriteStream(join(logDir, "error.log"), {
  flags: "a",
});
const infoStream = createWriteStream(join(logDir, "info.log"), { flags: "a" });

// Check if we should log based on environment
const shouldLog = () => envVars.NODE_ENV === "development";

const log = (level: "info" | "error" | "warn", message: string, meta?: any) => {
  const timestamp = new Date().toISOString();

  // Format for file logging (JSON)
  const logEntry =
    JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    }) + "\n";

  // Write to file (always write, even in production for debugging)
  if (level === "error") {
    errorStream.write(logEntry);
  } else {
    infoStream.write(logEntry);
  }

  // Console output only in development
  if (shouldLog()) {
    const consoleMethod =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;

    if (meta) {
      consoleMethod(prefix, message, meta);
    } else {
      consoleMethod(prefix, message);
    }
  }
};

export const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog()) {
      console.log(...args);
    }
  },

  error: (message: string, meta?: any) => log("error", message, meta),

  warn: (message: string, meta?: any) => log("warn", message, meta),

  info: (message: string, meta?: any) => log("info", message, meta),
};
