import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  createProject,
  deleteProject,
  getAllProjects,
  getConnectionsByProject,
  getNodeCountByProject,
  getNodesByProject,
  getProjectByUUID,
  updateProject,
} from '../db';
import { basicAuth } from '../middleware/auth';
import { UPLOADS_DIR } from '../config';

export const projectsRouter = Router();

projectsRouter.post('/', basicAuth, (req: Request, res: Response) => {
  const { center_label, branch_labels, language } = req.body as {
    center_label?: string;
    branch_labels?: string[];
    language?: string;
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

  const lang = language === 'fr' ? 'fr' : 'en';
  res.status(201).json(createProject(center_label.trim(), labels, lang));
});

projectsRouter.get('/', basicAuth, (_req: Request, res: Response) => {
  res.json(getAllProjects());
});

projectsRouter.get('/:uuid', (req: Request<{ uuid: string }>, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json({ ...project, next_participant_number: getNodeCountByProject(project.id) + 1 });
});

projectsRouter.get('/:uuid/nodes', (req: Request<{ uuid: string }>, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(getNodesByProject(project.id));
});

projectsRouter.get('/:uuid/connections', (req: Request<{ uuid: string }>, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(getConnectionsByProject(project.id));
});

projectsRouter.patch('/:uuid', basicAuth, (req: Request<{ uuid: string }>, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const { center_label, language, branch_labels } = req.body as {
    center_label?: string;
    language?: string;
    branch_labels?: string[];
  };
  const trimmedLabel = center_label?.trim();
  if (trimmedLabel !== undefined && !trimmedLabel) {
    res.status(400).json({ error: 'center_label cannot be empty' });
    return;
  }
  if (language !== undefined && language !== 'en' && language !== 'fr') {
    res.status(400).json({ error: 'language must be en or fr' });
    return;
  }
  if (branch_labels !== undefined && (!Array.isArray(branch_labels) || branch_labels.length > 5)) {
    res.status(400).json({ error: 'branch_labels must be an array of at most 5 items' });
    return;
  }
  if (trimmedLabel === undefined && language === undefined && branch_labels === undefined) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  updateProject(project.id, trimmedLabel, language, branch_labels);
  res.status(200).json({ ok: true });
});

projectsRouter.delete('/:uuid', basicAuth, (req: Request<{ uuid: string }>, res: Response) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const result = deleteProject(project.id);
  if (!result) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  for (const filename of result.mediaPaths) {
    fs.unlink(path.join(UPLOADS_DIR, filename), () => {});
  }
  res.status(204).end();
});
