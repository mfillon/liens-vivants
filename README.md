# Liens Vivants

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

A web app for collaborative mental mapping. Admins create projects with structured questions, share unique links with participants, and explore collective responses as an interactive 3D force-directed graph — with connections automatically drawn between nodes that share keywords.

---

## How it works

1. **Admin creates a project** — defines a central question, up to 5 branch questions, and the participant form language (EN/FR), generating a unique shareable link.
2. **Participants submit responses** — via the UUID link, they optionally enter their name (pre-filled as "Participant N") and answer each branch question, with optional image/audio/video per branch.
3. **Connections form automatically** — on submission, branch answers are tokenized and compared across all responses. Nodes that share meaningful keywords are linked.
4. **Explore the graph** — anyone with the graph link can view an interactive 3D WebGL graph. Click a node to see its responses and media, click a connection to compare both sides and their shared keywords.

---

## Features

- **Projects**: each project has a custom center label + up to 5 branch labels, a language (EN/FR), and a UUID-gated submission link
- **Participant names**: auto-suggested as "Participant N" / "Participant·e N" (French), editable by the user before submission
- **Localisation**: admin dashboard in browser language (EN/FR); participant form in the project's configured language
- **Autolink**: keyword extraction (EN + FR stop-word filtering) connects nodes at submission time; recompute available from admin panel
- **3D graph**: WebGL force-directed visualization (`3d-force-graph`); auto-orbiting camera that pauses on any click; click nodes or connections to inspect responses in the sidebar
- **Hub node**: central orange node anchors all responses; keyword connections highlighted in blue
- **Media attachments**: optional image, audio, or video upload per branch; displayed inline in sidebar and admin view; images open in full-screen lightbox on click
- **Admin dashboard**: create projects, copy links, view submissions with media, trigger connection recompute

---

## Technical stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js 22.5+ + Express |
| Database | SQLite via built-in `node:sqlite` (`--experimental-sqlite`) |
| Frontend | Vite 8 + Vanilla JS (ES Modules) |
| Graph | `3d-force-graph` + `three-spritetext` (WebGL / Three.js) |
| File uploads | `multer` — stored in `backend/uploads/` |
| Auth | HTTP Basic Auth on all admin routes |
| Config | `.env` via `dotenv` |
| Package manager | pnpm 10 (workspaces) |

**Data model:**

| Table | Description |
|-------|-------------|
| `projects` | One per admin session — uuid, center_label, language |
| `project_branch_labels` | Up to 5 labels per project |
| `nodes` | One per participant submission — stores participant_name (via center_text column) |
| `branches` | Up to 5 branch answers per node; optional `media_path` + `media_type` |
| `connections` | Auto-computed keyword overlaps between nodes |

**API:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/projects` | Basic | Create a project (accepts `language`: `en`\|`fr`) |
| GET | `/api/projects` | Basic | List all projects |
| GET | `/api/projects/:uuid` | — | Get project labels + `next_participant_number` (for form) |
| GET | `/api/projects/:uuid/nodes` | — | Get all nodes for a project |
| GET | `/api/projects/:uuid/connections` | — | Get keyword connections |
| POST | `/api/nodes` | — | Submit a node (`project_uuid` required, `participant_name` optional — auto-generated if missing) |
| GET | `/api/nodes` | Basic | List all nodes with branches |
| POST | `/api/branches/:id/media` | — | Upload media for a branch (image/audio/video, max 50 MB) |
| POST | `/api/admin/recompute-connections` | Basic | Recompute all connections |

---

## Getting started

**Requires Node.js 22.5+** and **pnpm 10+**

```bash
# 1. Install dependencies (all workspaces)
pnpm install

# 2. Create your local config
cp .env.example .env
# Edit .env — set ADMIN_USER and ADMIN_PASS before running

# 3. Start both servers (backend :3000 + frontend :5173)
pnpm dev
```

> You will see `ExperimentalWarning: SQLite is an experimental feature` on startup. This is expected and harmless.

| URL | Description |
|-----|-------------|
| `http://localhost:5173/admin.html` | Admin dashboard |
| `http://localhost:5173/submit/<uuid>` | Participant submission form |
| `http://localhost:5173/graph/<uuid>` | Interactive 3D graph |

**Production build:**

```bash
pnpm build       # builds frontend/dist/
pnpm start       # starts backend only (serves frontend/dist/ statically)
```

> **Security note:** HTTP Basic Auth sends credentials in base64 (not encrypted). Do not expose this app to the internet without HTTPS.

---

## Project structure

```
liens-vivants/
├── backend/
│   ├── src/
│   │   ├── server.js      # Express app, routes, Basic Auth, multer
│   │   ├── db.js          # SQLite schema, queries, autolink logic
│   │   └── keywords.js    # Keyword extraction + EN/FR stop-word list
│   ├── uploads/           # Uploaded media files (git-ignored)
│   ├── data.db            # SQLite database (git-ignored)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── submit.js      # Submission form logic (two-step: node + media)
│   │   ├── admin.js       # Admin dashboard logic
│   │   ├── graph.js       # 3D graph: force layout, orbit, sidebar
│   │   └── style.css
│   ├── submit.html
│   ├── admin.html
│   ├── graph.html
│   ├── vite.config.js     # MPA config, proxy, route rewriting
│   └── package.json
├── .claude/
│   ├── PLAN.md            # Incremental implementation roadmap
│   └── TECHNICAL.md       # Production-readiness phases
├── package.json           # Root: dev/build/start scripts
├── pnpm-workspace.yaml
├── .env                   # ADMIN_USER, ADMIN_PASS, PORT (git-ignored)
├── .env.example           # Config template
└── LICENSE                # GNU GPL v3
```

---

## License

[GNU General Public License v3.0](LICENSE) — derivatives must also be GPL v3.
