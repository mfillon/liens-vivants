# Mental Map Connections — Implementation Plan

## Vision

A webapp where users submit mental map nodes (center concept + branches), data is stored server-side, and the knowledge base is visualized as an interactive 2D then 3D graph. Nodes are auto-connected based on shared keywords.

---

## Step 1 — Core submission + admin list

- [x] User form: center text + up to 5 branches
- [x] SQLite storage via Express API
- [x] Admin view (Basic Auth): HTML list of all nodes + branches + timestamps

**Stack:** Node.js, Express, `node:sqlite` (built-in), dotenv, vanilla HTML/CSS/JS

---

## Step 1b — Admin projects + UUID-gated links ✓

- [x] `projects` table: uuid, center_label, branch_labels
- [x] `POST /api/projects` (admin): create project, returns UUID
- [x] `GET /api/projects` (admin): list projects with submission counts
- [x] `GET /api/projects/:uuid` (public): return labels for form rendering
- [x] `POST /api/nodes` now requires `project_uuid`; validates against DB
- [x] `/submit/:uuid` route serves user form with dynamic labels
- [x] Admin dashboard: create project form + projects list + copy link + expandable submissions

---

## Step 2 — Automatic branch connections (autolink) ✓

- [x] `connections` table: project_id, node_id_a, node_id_b, shared_keywords (JSON)
- [x] `keywords.js`: pure-JS keyword extraction + stop-word filter (EN + FR)
- [x] `computeConnections(projectId, newNodeId)` called inside `createNode`
- [x] `GET /api/projects/:uuid/connections` — public endpoint
- [x] `GET /api/projects/:uuid/nodes` — public endpoint (for graph page)

---

## Step 3 — 2D force graph visualization ✓

- [x] `public/graph.html` with D3.js v7 (CDN, no build step)
- [x] Nodes = center concepts, edges = shared keyword connections
- [x] Zoom + pan; drag nodes
- [x] Click node → sidebar shows branches
- [x] Click connection → sidebar shows both answers + shared keyword tags
- [x] Click hub line → sidebar shows single node answer
- [x] Hub node (fixed center, orange) anchors all nodes via dashed lines
- [x] Hub lines drawn manually (bypass D3 forceLink ID resolution)
- [x] All connections + hub lines have 28px invisible hit-area for easy clicking
- [x] Hub text white (readable on both orange circle and dark background)
- [x] "View graph →" link in admin project cards
- [x] `/graph/:uuid` Express route

---

## Step 4 — 3D rotating graph

- [ ] Replace or layer over D3 graph with `3d-force-graph` (CDN)
- [ ] Orbiting camera, node labels, click-to-focus

---

## Step 5 — Media attachments per branch

- [ ] Optional image / video / audio upload per branch (`multer`)
- [ ] Files stored on disk (`uploads/`)
- [ ] Schema: `ALTER TABLE branches ADD COLUMN media_path TEXT` + `media_type`
- [ ] Submission form: optional file input per branch
- [ ] Admin view: thumbnails / media players inline

---

## Technical Constraints & Decisions

- `better-sqlite3` was rejected: fails to compile on Node 24 / Apple Clang (C++20 issue). Using built-in `node:sqlite` instead (requires `--experimental-sqlite` flag, Node 22.5+).
- `PRAGMA foreign_keys = ON` cannot be used inside a multi-statement `exec()` in `node:sqlite` — omitted (integrity enforced at app level).
- No build step by design — keep it runnable with `node server.js`.
