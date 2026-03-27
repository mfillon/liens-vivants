# Mental Map Connections

![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

A web app for submitting and exploring mental map nodes — a central concept linked to up to 5 related branches. Built to grow incrementally toward a 3D interactive knowledge graph.

---

## Functional Description

- **Users** submit a mental map node: a central concept + up to 5 branch ideas.
- **Admins** view all submitted nodes in a protected interface, with branch details and timestamps.
- Future steps will add media attachments per branch, 2D/3D graph visualization, and automatic cross-node linking by keyword.

---

## Technical Description

| Layer | Technology |
|-------|-----------|
| Server | Node.js + Express |
| Database | SQLite via built-in `node:sqlite` (Node 22.5+) |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Auth | HTTP Basic Auth (middleware on admin routes) |
| Config | `.env` via `dotenv` |

**Data model:**
- `nodes` — one row per submission (`id`, `center_text`, `created_at`)
- `branches` — up to 5 rows per node (`node_id`, `position`, `text`)

**API:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/nodes` | none | Create a node + branches |
| GET | `/api/nodes` | Basic | List all nodes with branches |

---

## Getting Started

**Prerequisites:** Node.js 22.5 or later (uses built-in `node:sqlite`)

```bash
# 1. Install dependencies
npm install

# 2. Create your local config from the template
cp .env.example .env

# 3. Edit .env and change the default credentials before running
# ADMIN_USER and ADMIN_PASS must be set to something secret

# 4. Start the server
npm start
```

> **Note:** On startup you will see `ExperimentalWarning: SQLite is an experimental feature`. This is expected — `node:sqlite` is built into Node 22.5+ but still flagged experimental. It works reliably for this use case.

- User form: http://localhost:3000
- Admin view: http://localhost:3000/admin.html

> **Warning:** Do not expose this app to the internet without changing the default credentials in `.env` and adding HTTPS. HTTP Basic Auth sends credentials in base64, which is not encrypted.

**Inspect the database:**
```bash
sqlite3 data.db "SELECT * FROM nodes;"
sqlite3 data.db "SELECT * FROM branches;"
```

---

## Project Structure

```
mental-map-connections/
├── server.js          # Express app, routes, Basic Auth middleware
├── db.js              # SQLite setup and query functions
├── public/
│   ├── index.html     # User-facing submission form
│   ├── admin.html     # Admin node list
│   └── style.css
├── .claude/
│   ├── PLAN.md        # Incremental implementation plan (with checkboxes)
│   └── SESSIONS.md    # Per-session notes for AI-assisted work
├── .env               # ADMIN_USER, ADMIN_PASS, PORT (git-ignored)
├── .env.example       # Template for .env
├── LICENSE            # GNU GPL v3
└── package.json
```

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
Derivatives must also be distributed under GPL v3.
