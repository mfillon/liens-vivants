import { Request, Response, NextFunction } from 'express';

export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const colonIdx = credentials.indexOf(':');
  const user = credentials.slice(0, colonIdx);
  const pass = credentials.slice(colonIdx + 1);

  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    next();
    return;
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  res.status(401).json({ error: 'Invalid credentials' });
}
