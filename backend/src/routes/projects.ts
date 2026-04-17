import { Router, Request, Response } from 'express';
import {
  createProject,
  getAllProjects,
  getConnectionsByProject,
  getNodeCountByProject,
  getNodesByProject,
  getProjectByUUID,
} from '../db';
import { basicAuth } from '../middleware/auth';

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
