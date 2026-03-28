# Technical Roadmap — Liens Vivants

This file guides Claude Code on the technical decisions and production-readiness steps for this project.
Complete these phases in order unless instructed otherwise.

---

## Project Structure

```
/
├── .claude/
│   ├── PLAN.md
│   └── TECHNICAL.md
├── backend/               # Node.js / Express API
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── db.js
│   │   └── keywords.js
│   ├── uploads/           # Uploaded media files (git-ignored)
│   └── data.db            # SQLite database (git-ignored)
├── frontend/              # Vite + Vanilla JS
│   ├── package.json
│   ├── vite.config.js
│   ├── submit.html
│   ├── admin.html
│   ├── graph.html
│   └── src/
│       ├── submit.js
│       ├── admin.js
│       ├── graph.js
│       └── style.css
├── package.json           # Root: dev/build/start scripts via pnpm
├── pnpm-workspace.yaml
└── .github/
    └── workflows/
```

### Backend
- **Runtime**: Node.js 22.5+ with Express
- **Language**: CommonJS (require/module.exports)
- **Role**: REST API only — serves JSON, never HTML (except prod static serving)
- **Database**: `node:sqlite` (built-in, requires `--experimental-sqlite` flag)
- **Port**: `3000`

### Frontend
- **Build tool**: Vite 8
- **Language**: Vanilla JS (ES Modules)
- **Graph library**: `3d-force-graph` + `three-spritetext` (WebGL 3D)
- **Port**: `5173` (Vite dev server)
- **Build output**: `frontend/dist/` — static files served by Express in production

### Frontend → Backend communication
- Frontend calls the backend API via `fetch`
- In development: Vite proxies `/api` and `/uploads` to `localhost:3000`
- In production: Express serves `frontend/dist/` and handles dynamic routes

---

## Phase 0 — Frontend Build Setup ✓ DONE

- [x] pnpm workspaces monorepo
- [x] Vite MPA with `rollupOptions.input` for 3 HTML entry points
- [x] Custom Vite plugin rewrites `/submit/:uuid` → `submit.html`, `/graph/:uuid` → `graph.html` in dev
- [x] Vite dev proxy: `/api` and `/uploads` → `localhost:3000`
- [x] Root `pnpm dev` starts both servers via `concurrently`
- [x] Production: Express serves `frontend/dist/` + dynamic route handlers

---

## Phase 1 — Code Quality

Set up linting and formatting before touching any other code.

### Tasks
- [ ] Install and configure **ESLint** with the `eslint:recommended` ruleset
- [ ] Install and configure **Prettier** — integrate with ESLint via `eslint-config-prettier`
- [ ] Add `.editorconfig` for cross-editor consistency (2-space indent, LF line endings, UTF-8)
- [ ] Add lint and format scripts to root `package.json`:
  ```json
  "lint": "eslint .",
  "format": "prettier --write ."
  ```

---

## Phase 2 — Environment Management ✓ DONE

- [x] `dotenv` installed, `.env` loaded with explicit path from `backend/src/`
- [x] `.env.example` documents all required variables
- [x] `ADMIN_USER`, `ADMIN_PASS`, `PORT` configurable

---

## Phase 3 — Testing

Focus on critical paths first: node creation, branch linking, connection/matching logic.

### Tasks
- [ ] Install **Vitest** as dev dependency (ESM-native, compatible with Vite)
- [ ] Install **Supertest** for HTTP integration tests
- [ ] Create `backend/tests/` directory
- [ ] Write unit tests for:
    - Keyword extraction + stop-word filtering
    - Connection computation logic
- [ ] Write integration tests for:
    - `POST /api/nodes` — create a node
    - `POST /api/projects` — create a project
    - `GET /api/projects/:uuid/connections` — connection results
- [ ] Enforce minimum coverage threshold (suggested: 70%)

---

## Phase 4 — Containerization

### Tasks
- [ ] Create `Dockerfile` (multi-stage: build frontend → copy dist into backend image)
- [ ] Create `.dockerignore`
- [ ] Create `docker-compose.yml` for local development
- [ ] Verify app starts cleanly with `docker compose up`

---

## Phase 5 — CI Pipeline

### Tasks
- [ ] Create `.github/workflows/ci.yml` (GitHub Actions)
- [ ] Pipeline: checkout → Node.js setup → `pnpm install` → lint → test → build
- [ ] Mark pipeline as required check before merging PRs

---

## Phase 6 — CD & Cloud Deployment

- [ ] Choose provider (Railway, Render, or Fly.io — all support Docker)
- [ ] Add deployment step to CI (runs only on `main` after tests pass)
- [ ] Store secrets in provider's secret manager
- [ ] Configure env vars matching `.env.example`
- [ ] Staging environment before production

---

## Phase 7 — Production Hardening

### Security
- [ ] Install `helmet` — secure HTTP headers
- [ ] Install `express-rate-limit` — protect against abuse
- [ ] Validate and sanitise all user inputs

### Observability
- [ ] **Pino** for structured JSON logging
- [ ] **Sentry** for error tracking
- [ ] `GET /health` endpoint

### Reliability
- [ ] Handle uncaught exceptions and unhandled rejections gracefully
- [ ] Consistent error response format: `{ "error": "message", "code": "ERROR_CODE" }`

---

## Conventions

- Branch naming: `feat/`, `fix/`, `chore/`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- PRs must pass CI before merging
- `main` branch is always deployable
