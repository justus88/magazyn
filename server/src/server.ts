import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { registerRoutes } from './routes';

export default function createApp() {
  const app = express();

  const allowedOrigins = env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : '*',
    }),
  );
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  registerRoutes(app);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}
