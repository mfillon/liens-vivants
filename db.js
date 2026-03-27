const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('crypto');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'data.db'));

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
`);

// Idempotent: add project_id column to existing nodes table if missing
try {
  db.exec('ALTER TABLE nodes ADD COLUMN project_id INTEGER REFERENCES projects(id)');
} catch (_) { /* column already exists */ }

const insertProject = db.prepare('INSERT INTO projects (uuid, center_label) VALUES (?, ?)');
const insertBranchLabel = db.prepare('INSERT INTO project_branch_labels (project_id, position, label) VALUES (?, ?, ?)');
const selectProjectByUUID = db.prepare('SELECT * FROM projects WHERE uuid = ?');
const selectBranchLabels = db.prepare('SELECT * FROM project_branch_labels WHERE project_id = ? ORDER BY position');
const selectAllProjects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
const selectNodeCountByProject = db.prepare('SELECT COUNT(*) as count FROM nodes WHERE project_id = ?');

const insertNode = db.prepare('INSERT INTO nodes (project_id, center_text) VALUES (?, ?)');
const insertBranch = db.prepare('INSERT INTO branches (node_id, position, text) VALUES (?, ?, ?)');
const selectNodes = db.prepare('SELECT * FROM nodes ORDER BY created_at DESC');
const selectBranches = db.prepare('SELECT * FROM branches WHERE node_id = ? ORDER BY position');

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

function createNode(project_id, center_text, branches) {
  const nodeResult = insertNode.run(project_id, center_text);
  const nodeId = nodeResult.lastInsertRowid;
  for (let i = 0; i < branches.length; i++) {
    const text = branches[i];
    if (text && text.trim()) {
      insertBranch.run(nodeId, i + 1, text.trim());
    }
  }
  return nodeId;
}

function getAllNodes() {
  const nodes = selectNodes.all();
  return nodes.map(node => ({
    ...node,
    branches: selectBranches.all(node.id),
  }));
}

module.exports = { createProject, getProjectByUUID, getAllProjects, createNode, getAllNodes };
