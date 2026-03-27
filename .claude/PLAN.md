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

## Step 2 — Media attachments per branch

- [ ] Optional image / video / audio upload per branch
- [ ] Files stored on disk (e.g. `uploads/`)
- [ ] Schema: add `branches.media_path` and `branches.media_type`
- [ ] Admin view updated to display thumbnails / media players inline

---

## Step 3 — 2D force graph visualization

- [ ] Add D3.js force-directed graph in admin view
- [ ] Nodes = center concepts, edges = shared keywords between branches
- [ ] Click a node to expand its branches
- [ ] Replace or augment the card list

---

## Step 4 — 3D rotating graph

- [ ] Replace or layer over D3 graph with Three.js / `3d-force-graph`
- [ ] Orbiting camera, node labels, click-to-focus

---

## Step 5 — Automatic branch connections

- [ ] On insert: extract keywords from branch texts (simple tokenization or NLP)
- [ ] Store keyword index; compute overlaps between nodes
- [ ] Expose connections via API; visualize as edges in the graph

---

## Technical Constraints & Decisions

- `better-sqlite3` was rejected: fails to compile on Node 24 / Apple Clang (C++20 issue). Using built-in `node:sqlite` instead (requires `--experimental-sqlite` flag, Node 22.5+).
- `PRAGMA foreign_keys = ON` cannot be used inside a multi-statement `exec()` in `node:sqlite` — omitted (integrity enforced at app level).
- No build step by design — keep it runnable with `node server.js`.
