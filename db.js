const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

const insertNode = db.prepare('INSERT INTO nodes (center_text) VALUES (?)');
const insertBranch = db.prepare('INSERT INTO branches (node_id, position, text) VALUES (?, ?, ?)');
const selectNodes = db.prepare('SELECT * FROM nodes ORDER BY created_at DESC');
const selectBranches = db.prepare('SELECT * FROM branches WHERE node_id = ? ORDER BY position');

function createNode(center_text, branches) {
  const nodeResult = insertNode.run(center_text);
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

module.exports = { createNode, getAllNodes };
