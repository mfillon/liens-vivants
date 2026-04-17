import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { app } from './app';
import { logger } from './logger';

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
