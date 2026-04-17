import path from 'path';

export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(__dirname, '../uploads');
