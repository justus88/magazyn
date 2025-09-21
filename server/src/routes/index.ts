import { Express } from 'express';
import authRouter from './auth.routes';
import categoriesRouter from './categories.routes';
import partsRouter from './parts.routes';

export function registerRoutes(app: Express) {
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/parts', partsRouter);
}
