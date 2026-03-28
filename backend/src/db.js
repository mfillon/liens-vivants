const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('crypto');
const path = require('path');
const { extractKeywordsFromTexts, intersect } = require('./keywords');

const db = new DatabaseSync(path.join(__dirname, '..', 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    center_label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_branch_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    position INTEGER NOT NULL,
    label TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    center_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    text TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    node_id_a INTEGER NOT NULL REFERENCES nodes(id),
    node_id_b INTEGER NOT NULL REFERENCES nodes(id),
    shared_keywords TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Idempotent migrations
try {
  db.exec('ALTER TABLE nodes ADD COLUMN project_id INTEGER REFERENCES projects(id)');
} catch (_) { /* column already exists */ }
try {
  db.exec('ALTER TABLE branches ADD COLUMN media_path TEXT');
} catch (_) { /* column already exists */ }
try {
  db.exec('ALTER TABLE branches ADD COLUMN media_type TEXT');
} catch (_) { /* column already exists */ }

// --- Projects ---
const insertProject = db.prepare('INSERT INTO projects (uuid, center_label) VALUES (?, ?)');
const insertBranchLabel = db.prepare('INSERT INTO project_branch_labels (project_id, position, label) VALUES (?, ?, ?)');
const selectProjectByUUID = db.prepare('SELECT * FROM projects WHERE uuid = ?');
const selectBranchLabels = db.prepare('SELECT * FROM project_branch_labels WHERE project_id = ? ORDER BY position');
const selectAllProjects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
const selectNodeCountByProject = db.prepare('SELECT COUNT(*) as count FROM nodes WHERE project_id = ?');

function createProject(center_label, branch_labels) {
  const uuid = randomUUID();
  const result = insertProject.run(uuid, center_label);
  const projectId = result.lastInsertRowid;
  for (let i = 0; i < branch_labels.length; i++) {
    const label = branch_labels[i];
    if (label && label.trim()) {
      insertBranchLabel.run(projectId, i + 1, label.trim());
    }
  }
  return { id: projectId, uuid };
}

function getProjectByUUID(uuid) {
  const project = selectProjectByUUID.get(uuid);
  if (!project) return undefined;
  return {
    ...project,
    branch_labels: selectBranchLabels.all(project.id),
  };
}

function getAllProjects() {
  const projects = selectAllProjects.all();
  return projects.map(project => ({
    ...project,
    branch_labels: selectBranchLabels.all(project.id),
    submission_count: selectNodeCountByProject.get(project.id).count,
  }));
}

// --- Nodes ---
const insertNode = db.prepare('INSERT INTO nodes (project_id, center_text) VALUES (?, ?)');
const insertBranch = db.prepare('INSERT INTO branches (node_id, position, text) VALUES (?, ?, ?)');
const selectNodes = db.prepare('SELECT * FROM nodes ORDER BY created_at DESC');
const selectBranches = db.prepare('SELECT * FROM branches WHERE node_id = ? ORDER BY position');
const selectNodesByProject = db.prepare('SELECT * FROM nodes WHERE project_id = ? ORDER BY created_at DESC');
const updateBranchMedia = db.prepare('UPDATE branches SET media_path = ?, media_type = ? WHERE id = ?');
const selectBranchById = db.prepare('SELECT * FROM branches WHERE id = ?');

function createNode(project_id, center_text, branches) {
  const nodeResult = insertNode.run(project_id, center_text);
  const nodeId = nodeResult.lastInsertRowid;
  const branchIds = [];
  for (let i = 0; i < branches.length; i++) {
    const text = branches[i];
    if (text && text.trim()) {
      const r = insertBranch.run(nodeId, i + 1, text.trim());
      branchIds.push({ position: i + 1, id: Number(r.lastInsertRowid) });
    }
  }
  if (project_id) {
    computeConnections(project_id, nodeId);
  }
  return { nodeId: Number(nodeId), branchIds };
}

function saveBranchMedia(branchId, mediaPath, mediaType) {
  const branch = selectBranchById.get(branchId);
  if (!branch) return null;
  updateBranchMedia.run(mediaPath, mediaType, branchId);
  return true;
}

function getBranchById(branchId) {
  return selectBranchById.get(branchId);
}

function getAllNodes() {
  const nodes = selectNodes.all();
  return nodes.map(node => ({
    ...node,
    branches: selectBranches.all(node.id),
  }));
}

function getNodesByProject(projectId) {
  const nodes = selectNodesByProject.all(projectId);
  return nodes.map(node => ({
    ...node,
    branches: selectBranches.all(node.id),
  }));
}

// --- Connections (autolink) ---
const insertConnection = db.prepare(
  'INSERT INTO connections (project_id, node_id_a, node_id_b, shared_keywords) VALUES (?, ?, ?, ?)'
);
const deleteConnectionsForNode = db.prepare(
  'DELETE FROM connections WHERE node_id_a = ? OR node_id_b = ?'
);
const selectConnectionsByProject = db.prepare(
  'SELECT * FROM connections WHERE project_id = ? ORDER BY created_at DESC'
);

function computeConnections(projectId, newNodeId) {
  // Clear existing connections involving this node
  deleteConnectionsForNode.run(newNodeId, newNodeId);

  // Build keyword set from branches only (not center text — center text answers the
  // same question for all nodes, so shared words there don't indicate a real connection)
  const newBranches = selectBranches.all(newNodeId);
  const newKeywords = extractKeywordsFromTexts(newBranches.map(b => b.text));

  if (newKeywords.size === 0) return;

  // Compare against all other nodes in the project
  const otherNodes = db.prepare(
    'SELECT * FROM nodes WHERE project_id = ? AND id != ?'
  ).all(projectId, newNodeId);

  for (const other of otherNodes) {
    const otherBranches = selectBranches.all(other.id);
    const otherKeywords = extractKeywordsFromTexts(otherBranches.map(b => b.text));

    const shared = intersect(newKeywords, otherKeywords);
    if (shared.length > 0) {
      insertConnection.run(projectId, newNodeId, other.id, JSON.stringify(shared));
    }
  }
}

function getConnectionsByProject(projectId) {
  return selectConnectionsByProject.all(projectId).map(c => ({
    ...c,
    shared_keywords: JSON.parse(c.shared_keywords),
  }));
}

function recomputeAllConnections() {
  db.exec('DELETE FROM connections');
  const allNodes = db.prepare('SELECT * FROM nodes WHERE project_id IS NOT NULL').all();
  for (const node of allNodes) {
    computeConnections(node.project_id, node.id);
  }
}

module.exports = {
  createProject, getProjectByUUID, getAllProjects,
  createNode, getAllNodes, getNodesByProject,
  getConnectionsByProject, recomputeAllConnections,
  saveBranchMedia, getBranchById,
};
