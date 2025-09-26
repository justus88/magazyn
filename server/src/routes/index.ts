import { Express } from 'express';
import authRouter from './auth.routes';
import categoriesRouter from './categories.routes';
import partsRouter from './parts.routes';
import adminRouter from './admin.routes';
import movementsRouter from './movements.routes';
import importsRouter from './imports.routes';
import reportsRouter from './reports.routes';

export function registerRoutes(app: Express) {
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/parts', partsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/movements', movementsRouter);
  app.use('/api/imports', importsRouter);
  app.use('/api/reports', reportsRouter);
}
