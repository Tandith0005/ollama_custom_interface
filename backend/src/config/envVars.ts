import dotenv from "dotenv";

dotenv.config();
interface EnvConfig {
  PORT: string;
  APP_URL: string;
  NODE_ENV: string;
  OLLAMA_URL: string;
}

const loadEnvVars = (): EnvConfig => {
  const requireEnvVariable = ["PORT", "APP_URL", "NODE_ENV", "OLLAMA_URL"];

  requireEnvVariable.forEach((key) => {
    if (!process.env[key]) {
      throw new Error(`Missing env var ${key}`);
    }
  });

  return {
    PORT: process.env.PORT as string,
    APP_URL: process.env.APP_URL as string,
    NODE_ENV: process.env.NODE_ENV as string,
    OLLAMA_URL: process.env.OLLAMA_URL as string,
  };
};

export const envVars = loadEnvVars();
