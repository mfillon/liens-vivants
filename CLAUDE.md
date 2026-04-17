# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Scripts are defined in the root `package.json` and delegate to sub-packages. Run from the repo root.

To run a single test file: `pnpm --dir backend exec vitest run tests/db.test.ts`

**After every change** (including unplanned ones): run `pnpm typecheck && pnpm lint && pnpm format && pnpm test`, then update `.claude/PLAN.md`.

## Architecture

### Monorepo layout

pnpm workspaces with two packages: `backend/` (Node.js + Express) and `frontend/` (Vite MPA). The root `package.json` delegates all scripts to the sub-packages.

### Backend (`backend/src/`)

- **`server.ts`** — Express app, all REST routes, multer (50 MB file uploads), HTTP Basic Auth for admin routes
- **`db.ts`** — SQLite schema (5 tables), all prepared statements and DB functions. Schema migrations use try-catch around `ALTER TABLE` so they're safe to re-run.
- **`keywords.ts`** — `extractKeywordsFromTexts()` + EN/FR stop-word lists; used to compute keyword intersections for auto-connections

Runtime: `node:sqlite` is a built-in Node.js 22.5+ module; it requires the `--experimental-sqlite` flag (set via `NODE_OPTIONS` in dev, and in the `start` script for production).

### Frontend (`frontend/src/`)

Three TypeScript entry points (one per HTML page):

- **`admin.ts`** — project CRUD, submission list, recompute-connections button
- **`submit.ts`** — two-step participant form (node creation → media uploads per branch)
- **`graph.ts`** — 3D force-directed graph using `3d-force-graph` (Three.js/WebGL), orbit camera, sidebar on click

Shared: `i18n.ts` (EN/FR strings), `utils.ts` (escapeHtml, truncate, mediaHtml, branchesHtml), `types.ts`.

### Frontend → Backend communication

In dev, Vite proxies `/api` and `/uploads` to `http://localhost:3000`. A custom Vite plugin rewrites pretty URLs (`/submit/:uuid` → `submit.html`, `/graph/:uuid` → `graph.html`) in dev. In production, Express serves `frontend/dist/` and handles all dynamic routes.

### Data model

| Table                   | Purpose                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `projects`              | One row per project (uuid, center_label, language)                                                                              |
| `project_branch_labels` | Labels for each branch position (1–N)                                                                                           |
| `nodes`                 | One row per participant submission (center_text = participant name)                                                             |
| `branches`              | One row per answer (node_id, position, text, media_path, media_type)                                                            |
| `connections`           | Auto-computed keyword links between branch pairs (node_id_a, branch_position_a ↔ node_id_b, branch_position_b, shared_keywords) |

Connections are computed on every `POST /api/nodes` and can be fully recomputed via `POST /api/admin/recompute-connections`.

### Graph rendering

The 3D graph has two node types: real participant nodes and a synthetic hub node at the center. Hub-to-node links **cannot** be added to `forceLink` because mixed ID types (string vs number) fail silently — they are instead drawn manually in the `onEngineTick` callback. Clickable link hit areas use 28 px invisible `LineSegments` overlaid on the visible links.

### CSS

`.hidden { display: none !important; }` — the `!important` is required because later single-class rules (e.g. `.submissions { display: flex }`) have equal specificity and would otherwise win.

## Environment

Copy `.env.example` to `.env` at the root. Required variables: `ADMIN_USER`, `ADMIN_PASS`, `PORT` (defaults to 3000).

## Conventions

- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Branch naming: `feat/`, `fix/`, `chore/`
- At the end of each work session, update `.claude/PLAN.md` **and** `README.md` together — both must stay in sync.
