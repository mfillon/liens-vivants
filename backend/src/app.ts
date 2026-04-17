import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import path from 'path';
import { UPLOADS_DIR } from './config';
import { logger } from './logger';
import { healthRouter } from './routes/health';
import { projectsRouter } from './routes/projects';
import { nodesRouter } from './routes/nodes';
import { branchesRouter } from './routes/branches';
import { adminRouter } from './routes/admin';

export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }),
);
app.use(pinoHttp({ logger }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/health', healthRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/nodes', nodesRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/admin', adminRouter);

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distDir));
  app.get('/submit/:uuid', (_req, res) => res.sendFile(path.join(distDir, 'submit.html')));
  app.get('/graph/:uuid', (_req, res) => res.sendFile(path.join(distDir, 'graph.html')));
}
