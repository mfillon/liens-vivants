import { Router, Request, Response } from 'express';
import { recomputeAllConnections } from '../db';
import { basicAuth } from '../middleware/auth';

export const adminRouter = Router();

adminRouter.post('/recompute-connections', basicAuth, (_req: Request, res: Response) => {
  recomputeAllConnections();
  res.json({ ok: true });
});
