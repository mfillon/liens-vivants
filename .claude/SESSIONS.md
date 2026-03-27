# Session Notes

Context and decisions for future AI-assisted sessions on this project.

---

## Session 1 — 2026-03-27

**Goal:** Implement Step 1 (core form + API + admin list).

**Completed:**
- Full project scaffold: `server.js`, `db.js`, `public/index.html`, `public/admin.html`, `public/style.css`
- SQLite schema: `nodes` + `branches` tables
- `POST /api/nodes` — public endpoint to submit a node
- `GET /api/nodes` — Basic Auth protected, returns all nodes with branches
- Admin HTML page with login form + node cards

**Key technical issues encountered:**
- `better-sqlite3` fails to compile on Node 24 (C++20 / Apple Clang incompatibility) → switched to built-in `node:sqlite`
- `PRAGMA foreign_keys = ON` inside `exec()` throws "disk I/O error" in `node:sqlite` → removed; integrity enforced at app level

**State at end of session:**
- Server runs with `npm start` (`node --experimental-sqlite server.js`)
- Form submission and admin view both work end-to-end
- Ready for Step 2 (media attachments)

---

## Session 2 — 2026-03-27

**Goal:** Admin projects + UUID-gated submission links.

**Completed:**
- New `projects` and `project_branch_labels` tables in `db.js`
- `ALTER TABLE nodes ADD COLUMN project_id` wrapped in try/catch for idempotency
- `createProject`, `getProjectByUUID`, `getAllProjects` DB functions
- `createNode` updated to accept `project_id`
- 3 new API routes: `POST /api/projects`, `GET /api/projects`, `GET /api/projects/:uuid`
- `POST /api/nodes` now validates `project_uuid`
- `/submit/:uuid` Express route → serves `public/index.html`
- `public/index.html` rewritten: reads UUID from URL, fetches project labels, renders dynamic form
- `public/admin.html` rewritten: login → dashboard with create-project form + projects list + copy link + expandable submissions
- CSS extended with `.section`, `.link-box`, `.link-row`, `.copy-btn`, `.toggle-btn`, `.submission-card`

**State at end of session:**
- Server runs with `npm start`
- Admin creates projects at `/admin.html`, copies UUID link
- Users submit via `/submit/<uuid>` with custom-labeled form

---

## Session 3 — 2026-03-27

**Goal:** Autolink + 2D force graph visualization (reprioritized roadmap).

**Completed:**
- `keywords.js`: pure-JS keyword extraction, stop-word list (EN + FR), `extractKeywordsFromTexts`, `intersect`
- `connections` table in `db.js`; `computeConnections` called from `createNode`
- `getConnectionsByProject`, `getNodesByProject` exported from `db.js`
- `GET /api/projects/:uuid/nodes` and `GET /api/projects/:uuid/connections` (public)
- `/graph/:uuid` Express route → `public/graph.html`
- `public/graph.html`: D3.js v7 force-directed graph, dark theme, zoom/pan/drag, click-to-inspect sidebar
- Admin panel: "View graph →" link per project card
- CSS: `.graph-link`

**State at end of session:**
- Autolink fires on every node insert
- Graph page at `/graph/<uuid>` shows nodes + connections
- Ready for Step 4 (3D) or Step 5 (media attachments)

---

## Session 4 — 2026-03-27

**Goal:** Graph UX polish — hub connections, clickable lines, hub text legibility.

**Completed:**
- Hub links now drawn manually (separate `hubLinkSel`/`hubLinkHitSel` from `nodes` data, positions updated directly from `d.x`/`d.y` in tick) — bypasses D3 forceLink ID resolution which was silently failing
- All nodes connect to hub (not just isolated ones — eliminates type-comparison bug entirely)
- Click on connection line → sidebar shows both nodes' full answers + shared keyword tags
- Click on hub dashed line → sidebar shows single node answer
- Click hub node → shows project question + branch labels
- Clear selection on empty canvas click
- 28px invisible hit-area lines (`link-hit`, `hub-link-hit`) over both real and hub lines
- Visual lines have `pointer-events: none`; only hit-area lines capture clicks
- Hub text changed from `#111` to `#fff` — visible on orange circle and dark background overflow
- README fully rewritten to reflect current feature set
- FR stop words expanded (~80 entries)
- `computeConnections` uses branch texts only (not center text) to avoid false connections
- Admin panel: "Recompute all connections" button + `POST /api/admin/recompute-connections`
- `.hidden { display: none !important }` fix for submissions toggle

**Key technical decisions:**
- Hub links kept out of D3 forceLink entirely — draw manually in tick using node object refs
- Use `nodes` (all) for hub links, not `isolatedNodes` — avoids fragile type comparison of IDs

**State at end of session:**
- Graph fully interactive: click nodes, connections, hub lines, hub node
- Ready for Step 4 (3D) or Step 5 (media attachments)

---

## How to Resume

1. Read `.claude/PLAN.md` for the full roadmap and step status.
2. Read `.claude/SESSIONS.md` (this file) for prior decisions and gotchas.
3. Check `server.js` and `db.js` for current API and schema.
4. Pick up from the first unchecked step in `.claude/PLAN.md`.
