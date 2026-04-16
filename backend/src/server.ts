import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  createProject,
  getProjectByUUID,
  getAllProjects,
  createNode,
  getAllNodes,
  getNodesByProject,
  getConnectionsByProject,
  recomputeAllConnections,
  saveBranchMedia,
  getBranchById,
} from './db';

const uploadsDir = path.join(__dirname, '../uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
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

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [user, pass] = credentials.split(':');

  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    next();
    return;
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  res.status(401).json({ error: 'Invalid credentials' });
}

// Admin: create a project
app.post('/api/projects', basicAuth, (req: Request, res: Response) => {
  const { center_label, branch_labels } = req.body as {
    center_label?: string;
    branch_labels?: string[];
  };

  if (!center_label?.trim()) {
    res.status(400).json({ error: 'center_label is required' });
    return;
  }

  const labels = Array.isArray(branch_labels) ? branch_labels : [];
  if (labels.length > 5) {
    res.status(400).json({ error: 'branch_labels must have at most 5 items' });
    return;
  }

  const project = createProject(center_label.trim(), labels);
  res.status(201).json(project);
});

// Admin: list all projects
app.get('/api/projects', basicAuth, (_req: Request, res: Response) => {
  res.json(getAllProjects());
});

// Public: get project by UUID (for form rendering)
app.get('/api/projects/:uuid', (req: Request, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

// Public: get all nodes for a project (for graph rendering)
app.get('/api/projects/:uuid/nodes', (req: Request, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(getNodesByProject(project.id));
});

// Public: get connections for a project
app.get('/api/projects/:uuid/connections', (req: Request, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(getConnectionsByProject(project.id));
});

// Public: submit a node (requires valid project_uuid)
app.post('/api/nodes', (req: Request, res: Response) => {
  const { project_uuid, center_text, branches } = req.body as {
    project_uuid?: string;
    center_text?: string;
    branches?: string[];
  };

  if (!project_uuid) {
    res.status(400).json({ error: 'project_uuid is required' });
    return;
  }

  const project = getProjectByUUID(project_uuid);
  if (!project) {
    res.status(404).json({ error: 'Invalid or unknown project link' });
    return;
  }

  if (!center_text?.trim()) {
    res.status(400).json({ error: 'center_text is required' });
    return;
  }

  if (!Array.isArray(branches) || branches.length > 5) {
    res.status(400).json({ error: 'branches must be an array of up to 5 items' });
    return;
  }

  const { nodeId, branchIds } = createNode(project.id, center_text.trim(), branches);
  res.status(201).json({ id: nodeId, branchIds });
});

// Public: upload media for a branch
app.post('/api/branches/:id/media', upload.single('file'), (req: Request, res: Response) => {
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
});

// Multer error handler
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.status === 400 || err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Admin: list all nodes
app.get('/api/nodes', basicAuth, (_req: Request, res: Response) => {
  res.json(getAllNodes());
});

// Admin: recompute all connections (use after changing keyword logic)
app.post('/api/admin/recompute-connections', basicAuth, (_req: Request, res: Response) => {
  recomputeAllConnections();
  res.json({ ok: true });
});

// In production, serve the built frontend and handle client-side routes
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distDir));
  app.get('/submit/:uuid', (_req, res) => res.sendFile(path.join(distDir, 'submit.html')));
  app.get('/graph/:uuid', (_req, res) => res.sendFile(path.join(distDir, 'graph.html')));
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
