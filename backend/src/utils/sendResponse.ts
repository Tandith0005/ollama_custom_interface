import { Response } from 'express';

interface SendResponseOptions {
  statusCode: number;
  success: boolean;
  message: string;
  data?: any;
  meta?: any;
}

export const sendResponse = (res: Response, options: SendResponseOptions) => {
  const { statusCode, success, message, data, meta } = options;
  
  const response: any = {
    success: success || false,
    message: message || null,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
};