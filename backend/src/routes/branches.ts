import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import { getBranchById, saveBranchMedia } from '../db';
import { UPLOADS_DIR } from '../config';

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `branch-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^(image|audio|video)\//.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        Object.assign(new Error('Only image, audio, and video files are allowed'), { status: 400 }),
      );
    }
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

export const branchesRouter = Router();

branchesRouter.post(
  '/:id/media',
  uploadLimiter,
  upload.single('file'),
  (req: Request<{ id: string }>, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const branchId = parseInt(req.params.id, 10);
    if (!getBranchById(branchId)) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }
    saveBranchMedia(branchId, req.file.filename, req.file.mimetype);
    res.status(201).json({ path: `/uploads/${req.file.filename}` });
  },
);

branchesRouter.use(
  (err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.status === 400 || err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  },
);
