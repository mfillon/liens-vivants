# Mental Map Connections — Implementation Plan

## Vision

A webapp where users submit mental map nodes (center concept + branches), data is stored server-side, and the knowledge base is visualized as an interactive 3D force-directed graph. Nodes are auto-connected based on shared keywords.

---

## Step 1 — Core submission + admin list ✓

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

## Step 3 — Graph visualization ✓

- [x] `graph.html` with `3d-force-graph` (WebGL, 3D force-directed)
- [x] Nodes = center concepts, edges = shared keyword connections
- [x] Hub node (fixed at origin, orange) anchors all nodes via faint links
- [x] Click node → sidebar shows branches
- [x] Click connection → sidebar shows both answers + shared keyword tags
- [x] Camera auto-orbits on load; pauses on any canvas click; toggle button
- [x] "View graph →" link in admin project cards
- [x] `/graph/:uuid` Express route

---

## Step 1T (Technical) — Frontend build pipeline ✓

- [x] pnpm workspaces monorepo (`frontend/`, `backend/`)
- [x] Vite MPA config: `submit.html`, `admin.html`, `graph.html` as separate entry points
- [x] Custom Vite plugin rewrites `/submit/:uuid` and `/graph/:uuid` to static HTML in dev
- [x] Vite dev proxy: `/api` and `/uploads` → `localhost:3000`
- [x] Single root command: `pnpm dev` starts both servers via `concurrently`
- [x] Production: Express serves `frontend/dist/` + handles dynamic routes

---

## Step 4 — Media attachments per branch ✓

- [x] Optional image / video / audio upload per branch (`multer`)
- [x] Files stored on disk (`backend/uploads/`)
- [x] Schema: `ALTER TABLE branches ADD COLUMN media_path TEXT` + `media_type`
- [x] Submission form: optional file input per branch
- [x] Graph sidebar and admin view: inline image / audio / video players
- [x] Lightbox for full-screen image viewing in graph sidebar
- [x] `/uploads` served as static at both Express level and via Vite proxy

---

## Step 5 — Adaptations (next)

- [ ] Remove main node text
- [ ] Localise app: admin page in browser language only French and English are supported
- [ ] Localise app: project should have a language as parameter (admin browser language by default) only French and English are supported
- [ ] Add optional participant name field with default value "Participant 1", then "Participant 2", ... If French, "Participant·e X"
- [ ] Display participant name for each node
- [ ] For each branch, add a mini-node, for connections, link the mini-nodes instead of the main ones
- [ ] To test: display each node in different colour
- [ ] Display icon on mini-node if there is an image, video or audio attached
- [ ] Later: When auto-orbiting, sometimes, stop on a random mini-node, zoom and display details for 10 seconds

---

## Step 1T — TypeScript migration ✓

- [x] Backend: `keywords.ts`, `db.ts`, `server.ts` — strict TS with named exports, interfaces for all DB entities
- [x] Backend: `tsconfig.json` (CommonJS, ES2022), `tsx` dev runner, `tsc` production build
- [x] Backend devDeps: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/multer`
- [x] Frontend: `submit.ts`, `admin.ts`, `graph.ts`, `types.ts`, `vite.config.ts`
- [x] Frontend: `tsconfig.json` (bundler resolution, noEmit, strict)
- [x] Frontend devDeps: `typescript`; HTML entry points updated to `.ts`

---

## Step 2T — Code quality

- [ ] oxlint + oxfmt setup (workspace root)
- [ ] `.editorconfig`
- [ ] Lint and format scripts in root `package.json`

---

## Step 3T — Testing

- [ ] Vitest for unit tests (keyword extraction, connection logic)
- [ ] Supertest for API integration tests
- [ ] Coverage threshold

---

## Step 4T — Containerization & CI/CD

- [ ] Dockerfile + `.dockerignore`
- [ ] `docker-compose.yml`
- [ ] GitHub Actions CI (lint + test + build)
- [ ] CD to Railway / Render / Fly.io

---

## Step 5T — Production hardening

- [ ] `helmet`, `express-rate-limit`
- [ ] Structured logging (Pino)
- [ ] Sentry error tracking
- [ ] `GET /health` endpoint
- [ ] Consistent error response format

---

## Technical Constraints & Decisions

- `better-sqlite3` was rejected: fails to compile on Node 24 / Apple Clang (C++20 issue). Using built-in `node:sqlite` instead (requires `--experimental-sqlite` flag, Node 22.5+).
- `PRAGMA foreign_keys = ON` cannot be used inside a multi-statement `exec()` in `node:sqlite` — omitted (integrity enforced at app level).
- D3.js 2D graph replaced by `3d-force-graph` (Three.js/WebGL) — better visual impact for collective data.
- npm replaced by pnpm (v10) with workspaces — faster installs, shared lockfile.
- All source files migrated to TypeScript (strict mode). Backend runs via `tsx` in dev, compiled with `tsc` for production. Frontend uses Vite's native TS support.
