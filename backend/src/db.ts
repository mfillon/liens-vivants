import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'crypto';
import path from 'path';
import { extractKeywordsFromTexts, intersect } from './keywords';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BranchLabel {
  id: number;
  project_id: number;
  position: number;
  label: string;
}

export interface Project {
  id: number;
  uuid: string;
  center_label: string;
  created_at: string;
  branch_labels: BranchLabel[];
}

export interface Branch {
  id: number;
  node_id: number;
  position: number;
  text: string;
  media_path: string | null;
  media_type: string | null;
}

export interface Node {
  id: number;
  project_id: number | null;
  center_text: string;
  created_at: string;
  branches: Branch[];
}

export interface Connection {
  id: number;
  project_id: number;
  node_id_a: number;
  node_id_b: number;
  shared_keywords: string[];
  created_at: string;
}

// Raw row shapes from SQLite (before joining related records)
type ProjectRow = Omit<Project, 'branch_labels'>;
type NodeRow = Omit<Node, 'branches'>;

// ── Database setup ─────────────────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data.db');
const db = new DatabaseSync(DB_PATH);

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
} catch {
  /* column already exists */
}
try {
  db.exec('ALTER TABLE branches ADD COLUMN media_path TEXT');
} catch {
  /* column already exists */
}
try {
  db.exec('ALTER TABLE branches ADD COLUMN media_type TEXT');
} catch {
  /* column already exists */
}

// ── Prepared statements ────────────────────────────────────────────────────

const insertProject = db.prepare('INSERT INTO projects (uuid, center_label) VALUES (?, ?)');
const insertBranchLabel = db.prepare(
  'INSERT INTO project_branch_labels (project_id, position, label) VALUES (?, ?, ?)',
);
const selectProjectByUUID = db.prepare('SELECT * FROM projects WHERE uuid = ?');
const selectBranchLabels = db.prepare(
  'SELECT * FROM project_branch_labels WHERE project_id = ? ORDER BY position',
);
const selectAllProjects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
const selectNodeCountByProject = db.prepare(
  'SELECT COUNT(*) as count FROM nodes WHERE project_id = ?',
);
const insertNode = db.prepare('INSERT INTO nodes (project_id, center_text) VALUES (?, ?)');
const insertBranch = db.prepare('INSERT INTO branches (node_id, position, text) VALUES (?, ?, ?)');
const selectNodes = db.prepare('SELECT * FROM nodes ORDER BY created_at DESC');
const selectBranches = db.prepare('SELECT * FROM branches WHERE node_id = ? ORDER BY position');
const selectNodesByProject = db.prepare(
  'SELECT * FROM nodes WHERE project_id = ? ORDER BY created_at DESC',
);
const updateBranchMedia = db.prepare(
  'UPDATE branches SET media_path = ?, media_type = ? WHERE id = ?',
);
const selectBranchById = db.prepare('SELECT * FROM branches WHERE id = ?');
const insertConnection = db.prepare(
  'INSERT INTO connections (project_id, node_id_a, node_id_b, shared_keywords) VALUES (?, ?, ?, ?)',
);
const deleteConnectionsForNode = db.prepare(
  'DELETE FROM connections WHERE node_id_a = ? OR node_id_b = ?',
);
const selectConnectionsByProject = db.prepare(
  'SELECT * FROM connections WHERE project_id = ? ORDER BY created_at DESC',
);

// ── Projects ───────────────────────────────────────────────────────────────

export function createProject(
  center_label: string,
  branch_labels: string[],
): Pick<Project, 'id' | 'uuid'> {
  const uuid = randomUUID();
  const result = insertProject.run(uuid, center_label);
  const projectId = result.lastInsertRowid as number;
  for (let i = 0; i < branch_labels.length; i++) {
    const label = branch_labels[i];
    if (label?.trim()) {
      insertBranchLabel.run(projectId, i + 1, label.trim());
    }
  }
  return { id: projectId, uuid };
}

export function getProjectByUUID(uuid: string): Project | undefined {
  const project = selectProjectByUUID.get(uuid) as ProjectRow | undefined;
  if (!project) return undefined;
  return {
    ...project,
    branch_labels: selectBranchLabels.all(project.id) as unknown as BranchLabel[],
  };
}

export function getAllProjects(): Array<Project & { submission_count: number }> {
  const projects = selectAllProjects.all() as unknown as ProjectRow[];
  return projects.map((project) => ({
    ...project,
    branch_labels: selectBranchLabels.all(project.id) as unknown as BranchLabel[],
    submission_count: (selectNodeCountByProject.get(project.id) as { count: number }).count,
  }));
}

// ── Nodes ──────────────────────────────────────────────────────────────────

export function createNode(
  project_id: number,
  center_text: string,
  branches: string[],
): { nodeId: number; branchIds: Array<{ position: number; id: number }> } {
  const nodeResult = insertNode.run(project_id, center_text);
  const nodeId = nodeResult.lastInsertRowid as number;
  const branchIds: Array<{ position: number; id: number }> = [];
  for (let i = 0; i < branches.length; i++) {
    const text = branches[i];
    if (text?.trim()) {
      const r = insertBranch.run(nodeId, i + 1, text.trim());
      branchIds.push({ position: i + 1, id: Number(r.lastInsertRowid) });
    }
  }
  if (project_id) {
    computeConnections(project_id, nodeId);
  }
  return { nodeId: Number(nodeId), branchIds };
}

export function saveBranchMedia(
  branchId: number,
  mediaPath: string,
  mediaType: string,
): boolean | null {
  const branch = selectBranchById.get(branchId);
  if (!branch) return null;
  updateBranchMedia.run(mediaPath, mediaType, branchId);
  return true;
}

export function getBranchById(branchId: number): Branch | undefined {
  return selectBranchById.get(branchId) as Branch | undefined;
}

export function getAllNodes(): Node[] {
  const nodes = selectNodes.all() as unknown as NodeRow[];
  return nodes.map((node) => ({
    ...node,
    branches: selectBranches.all(node.id) as unknown as Branch[],
  }));
}

export function getNodesByProject(projectId: number): Node[] {
  const nodes = selectNodesByProject.all(projectId) as unknown as NodeRow[];
  return nodes.map((node) => ({
    ...node,
    branches: selectBranches.all(node.id) as unknown as Branch[],
  }));
}

// ── Connections ────────────────────────────────────────────────────────────

function computeConnections(projectId: number, newNodeId: number): void {
  deleteConnectionsForNode.run(newNodeId, newNodeId);

  const newBranches = selectBranches.all(newNodeId) as unknown as Branch[];
  const newKeywords = extractKeywordsFromTexts(newBranches.map((b) => b.text));
  if (newKeywords.size === 0) return;

  const otherNodes = db
    .prepare('SELECT * FROM nodes WHERE project_id = ? AND id != ?')
    .all(projectId, newNodeId) as unknown as NodeRow[];

  for (const other of otherNodes) {
    const otherBranches = selectBranches.all(other.id) as unknown as Branch[];
    const otherKeywords = extractKeywordsFromTexts(otherBranches.map((b) => b.text));
    const shared = intersect(newKeywords, otherKeywords);
    if (shared.length > 0) {
      insertConnection.run(projectId, newNodeId, other.id, JSON.stringify(shared));
    }
  }
}

export function getConnectionsByProject(projectId: number): Connection[] {
  type RawConnection = Omit<Connection, 'shared_keywords'> & { shared_keywords: string };
  return (selectConnectionsByProject.all(projectId) as unknown as RawConnection[]).map((c) => ({
    ...c,
    shared_keywords: JSON.parse(c.shared_keywords) as string[],
  }));
}

export function recomputeAllConnections(): void {
  db.exec('DELETE FROM connections');
  const allNodes = db
    .prepare('SELECT * FROM nodes WHERE project_id IS NOT NULL')
    .all() as unknown as NodeRow[];
  for (const node of allNodes) {
    if (node.project_id !== null) {
      computeConnections(node.project_id, node.id);
    }
  }
}

/** Truncate all data — only call from tests. */
export function _resetForTests(): void {
  db.exec(
    'DELETE FROM connections; DELETE FROM branches; DELETE FROM nodes; DELETE FROM project_branch_labels; DELETE FROM projects;',
  );
}
