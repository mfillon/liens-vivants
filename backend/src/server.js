require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const path = require('path');
const { createProject, getProjectByUUID, getAllProjects, createNode, getAllNodes, getNodesByProject, getConnectionsByProject, recomputeAllConnections } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [user, pass] = credentials.split(':');

  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).json({ error: 'Invalid credentials' });
}

// Admin: create a project
app.post('/api/projects', basicAuth, (req, res) => {
  const { center_label, branch_labels } = req.body;

  if (!center_label || !center_label.trim()) {
    return res.status(400).json({ error: 'center_label is required' });
  }

  const labels = Array.isArray(branch_labels) ? branch_labels : [];
  if (labels.length > 5) {
    return res.status(400).json({ error: 'branch_labels must have at most 5 items' });
  }

  const project = createProject(center_label.trim(), labels);
  return res.status(201).json(project);
});

// Admin: list all projects
app.get('/api/projects', basicAuth, (req, res) => {
  return res.json(getAllProjects());
});

// Public: get project by UUID (for form rendering)
app.get('/api/projects/:uuid', (req, res) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return res.json(project);
});

// Public: get all nodes for a project (for graph rendering)
app.get('/api/projects/:uuid/nodes', (req, res) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return res.json(getNodesByProject(project.id));
});

// Public: get connections for a project
app.get('/api/projects/:uuid/connections', (req, res) => {
  const project = getProjectByUUID(req.params.uuid);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return res.json(getConnectionsByProject(project.id));
});

// Public: submit a node (requires valid project_uuid)
app.post('/api/nodes', (req, res) => {
  const { project_uuid, center_text, branches } = req.body;

  if (!project_uuid) {
    return res.status(400).json({ error: 'project_uuid is required' });
  }

  const project = getProjectByUUID(project_uuid);
  if (!project) {
    return res.status(404).json({ error: 'Invalid or unknown project link' });
  }

  if (!center_text || !center_text.trim()) {
    return res.status(400).json({ error: 'center_text is required' });
  }

  if (!Array.isArray(branches) || branches.length > 5) {
    return res.status(400).json({ error: 'branches must be an array of up to 5 items' });
  }

  const nodeId = createNode(project.id, center_text.trim(), branches);
  return res.status(201).json({ id: nodeId });
});

// Admin: list all nodes
app.get('/api/nodes', basicAuth, (req, res) => {
  return res.json(getAllNodes());
});

// Admin: recompute all connections (use after changing keyword logic)
app.post('/api/admin/recompute-connections', basicAuth, (req, res) => {
  recomputeAllConnections();
  return res.json({ ok: true });
});

// In production, serve the built frontend and handle client-side routes
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distDir));
  app.get('/submit/:uuid', (_req, res) => res.sendFile(path.join(distDir, 'submit.html')));
  app.get('/graph/:uuid', (_req, res) => res.sendFile(path.join(distDir, 'graph.html')));
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
