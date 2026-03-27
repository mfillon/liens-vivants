# Liens Vivants

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

A web app for collaborative mental mapping. Admins create projects with structured questions, share unique links with participants, and explore collective responses as an interactive force-directed graph — with connections automatically drawn between nodes that share keywords.

---

## How it works

1. **Admin creates a project** — defines a central question and up to 5 branch questions, generating a unique shareable link.
2. **Participants submit responses** — via the private UUID link, they answer the central question and each branch.
3. **Connections form automatically** — on submission, branch answers are tokenized and compared across all responses. Nodes that share meaningful keywords are linked.
4. **Explore the graph** — the admin (or anyone with the graph link) can view an interactive 2D force-directed graph. Click a node to see its answers, click a connection to compare both sides, click the central hub to see isolated responses.

---

## Features

- **Projects**: each project has a custom center label + up to 5 branch labels, and a UUID-gated submission link
- **Autolink**: keyword extraction (EN + FR stop-word filtering) connects nodes at submission time; recompute available from admin panel
- **Interactive graph**: D3.js force-directed visualization with zoom, pan, drag, node inspection, and connection inspection
- **Hub node**: unconnected responses anchor to a central hub so nothing floats off-screen; hub connections are dashed and visually distinct
- **Admin dashboard**: create projects, copy links, view submissions per project, trigger connection recompute, open graph

---

## Technical stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js + Express |
| Database | SQLite via built-in `node:sqlite` (Node 22.5+) |
| Frontend | Vanilla HTML/CSS/JS — no framework, no build step |
| Graph | D3.js v7 (CDN) |
| Auth | HTTP Basic Auth on all admin routes |
| Config | `.env` via `dotenv` |

**Data model:**

| Table | Description |
|-------|-------------|
| `projects` | One per admin session — uuid, center_label |
| `project_branch_labels` | Up to 5 labels per project |
| `nodes` | One per participant submission |
| `branches` | Up to 5 branch answers per node |
| `connections` | Auto-computed keyword overlaps between nodes |

**API:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/projects` | Basic | Create a project |
| GET | `/api/projects` | Basic | List all projects |
| GET | `/api/projects/:uuid` | — | Get project labels (for form) |
| GET | `/api/projects/:uuid/nodes` | — | Get all nodes for a project |
| GET | `/api/projects/:uuid/connections` | — | Get keyword connections |
| POST | `/api/nodes` | — | Submit a node (requires `project_uuid`) |
| GET | `/api/nodes` | Basic | List all nodes with branches |
| POST | `/api/admin/recompute-connections` | Basic | Recompute all connections |

---

## Getting started

**Requires Node.js 22.5+** (uses built-in `node:sqlite`)

```bash
# 1. Install dependencies
npm install

# 2. Create your local config
cp .env.example .env
# Edit .env — set ADMIN_USER and ADMIN_PASS before running

# 3. Start the server
npm start
```

> You will see `ExperimentalWarning: SQLite is an experimental feature` on startup. This is expected and harmless.

| URL | Description |
|-----|-------------|
| `http://localhost:3000/admin.html` | Admin dashboard |
| `http://localhost:3000/submit/<uuid>` | Participant submission form |
| `http://localhost:3000/graph/<uuid>` | Interactive graph for a project |

> **Security note:** HTTP Basic Auth sends credentials in base64 (not encrypted). Do not expose this app to the internet without HTTPS.

**Inspect the database:**
```bash
sqlite3 data.db "SELECT * FROM projects;"
sqlite3 data.db "SELECT * FROM connections;"
```

---

## Project structure

```
liens-vivants/
├── server.js          # Express app, routes, Basic Auth middleware
├── db.js              # SQLite schema, queries, autolink logic
├── keywords.js        # Keyword extraction + EN/FR stop-word list
├── public/
│   ├── index.html     # Participant submission form (UUID-gated)
│   ├── admin.html     # Admin dashboard
│   ├── graph.html     # D3 force-directed graph
│   └── style.css
├── .claude/
│   ├── PLAN.md        # Incremental implementation roadmap
│   └── SESSIONS.md    # Per-session notes for AI-assisted work
├── .env               # ADMIN_USER, ADMIN_PASS, PORT (git-ignored)
├── .env.example       # Config template
├── LICENSE            # GNU GPL v3
└── package.json
```

---

## License

[GNU General Public License v3.0](LICENSE) — derivatives must also be GPL v3.
