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

## How to Resume

1. Read `.claude/PLAN.md` for the full roadmap and step status.
2. Read `.claude/SESSIONS.md` (this file) for prior decisions and gotchas.
3. Check `server.js` and `db.js` for current API and schema.
4. Pick up from the first unchecked step in `.claude/PLAN.md`.
