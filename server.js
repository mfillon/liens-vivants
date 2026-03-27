require('dotenv').config();
const express = require('express');
const path = require('path');
const { createNode, getAllNodes } = require('./db');

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

app.post('/api/nodes', (req, res) => {
  const { center_text, branches } = req.body;

  if (!center_text || !center_text.trim()) {
    return res.status(400).json({ error: 'center_text is required' });
  }

  if (!Array.isArray(branches) || branches.length > 5) {
    return res.status(400).json({ error: 'branches must be an array of up to 5 items' });
  }

  const nodeId = createNode(center_text.trim(), branches);
  return res.status(201).json({ id: nodeId });
});

app.get('/api/nodes', basicAuth, (req, res) => {
  const nodes = getAllNodes();
  return res.json(nodes);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
