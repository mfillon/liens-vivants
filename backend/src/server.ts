import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { app } from './app';
import { logger } from './logger';

const PORT = process.env.PORT ?? 3000;
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
