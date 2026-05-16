import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  createNode,
  deleteNode,
  getAllNodes,
  getNodeCountByProject,
  getProjectByUUID,
} from '../db';
import { defaultParticipantName } from '../domain';
import { basicAuth } from '../middleware/auth';
import { UPLOADS_DIR } from '../config';

export const nodesRouter = Router();

nodesRouter.post('/', (req: Request, res: Response) => {
  const { project_uuid, participant_name, branches } = req.body as {
    project_uuid?: string;
    participant_name?: string;
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

  if (!Array.isArray(branches) || branches.length > 5) {
    res.status(400).json({ error: 'branches must be an array of up to 5 items' });
    return;
  }

  const name =
    participant_name?.trim() ||
    defaultParticipantName(getNodeCountByProject(project.id) + 1, project.language);

  const { nodeId, branchIds } = createNode(project.id, name, branches);
  res.status(201).json({ id: nodeId, branchIds });
});

nodesRouter.get('/', basicAuth, (_req: Request, res: Response) => {
  res.json(getAllNodes());
});

nodesRouter.delete('/:id', basicAuth, (req: Request<{ id: string }>, res: Response) => {
  const nodeId = parseInt(req.params.id, 10);
  if (isNaN(nodeId)) {
    res.status(400).json({ error: 'Invalid node id' });
    return;
  }
  const result = deleteNode(nodeId);
  if (!result) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }
  for (const filename of result.mediaPaths) {
    fs.unlink(path.join(UPLOADS_DIR, filename), () => {});
  }
  res.status(204).end();
});
