# Technical Roadmap — Liens Vivants

This file guides Claude Code on the technical decisions and production-readiness steps for this project.
Complete these phases in order unless instructed otherwise.

---

## Project Structure

The project currently runs as a single Node.js/Express app with frontend files served directly. Phase 0 will migrate it to the following target structure:

```
/
├── .claude/
│   ├── PLAN.md
│   └── TECHNICAL.md
├── backend/               # Node.js / Express API
│   ├── package.json
│   ├── src/
│   └── tests/
├── frontend/              # Vite + Vanilla JS (Vue.js later)
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── components/
│       └── styles/
├── docker-compose.yml
└── .github/
    └── workflows/
```

### Backend
- **Runtime**: Node.js with Express
- **Language**: JavaScript (ES Modules)
- **Role**: REST API only — serves JSON, never HTML
- **Port**: `3000`

### Frontend
- **Build tool**: Vite
- **Language**: Vanilla JS (ES Modules)
- **Framework**: None for now — migrate to **Vue.js** when UI complexity justifies it (graph visualization phase is the likely trigger)
- **Graph library**: **Cytoscape.js** — purpose-built for interactive node/graph UIs
- **Port**: `5173` (Vite dev server)
- **Build output**: `frontend/dist/` — static files served by Express in production (or a CDN)

### Frontend → Backend communication
- Frontend calls the backend API via `fetch`
- In development: Vite proxies `/api` requests to `localhost:3000` (configured in `vite.config.js`)
- In production: both are served from the same origin via Express serving `frontend/dist/`

---

## Phase 0 — Frontend Build Setup

Migrate from CDN imports to a proper Vite build pipeline.

### Tasks
- [ ] Create `frontend/` directory
- [ ] Initialise with `npm create vite@latest frontend -- --template vanilla`
- [ ] Move all existing frontend files (`*.html`, `*.css`, `*.js`) into `frontend/src/`
- [ ] Replace all CDN `<script>` tags with proper `npm install` + ES module imports
- [ ] Configure Vite dev proxy in `frontend/vite.config.js`:
  ```js
  export default {
    server: {
      proxy: {
        '/api': 'http://localhost:3000'
      }
    }
  }
  ```
- [ ] Add scripts to `frontend/package.json`:
  ```json
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
  ```
- [ ] Configure Express to serve `frontend/dist/` as static files in production:
  ```js
  app.use(express.static('../frontend/dist'))
  ```
- [ ] Update root `.gitignore` to cover `frontend/dist/` and `frontend/node_modules/`
- [ ] Verify: `npm run dev` in `frontend/` and `npm run dev` in `backend/` both run concurrently

### On Vue.js adoption
Do not migrate to Vue.js yet. Revisit when the graph visualization feature is being built.
At that point, run `npm create vue@latest` inside `frontend/` and migrate incrementally.

---

## Phase 1 — Code Quality

Set up linting and formatting before touching any other code.

### Tasks
- [ ] Install and configure **ESLint** with the `eslint:recommended` ruleset
- [ ] Install and configure **Prettier** — integrate with ESLint via `eslint-config-prettier`
- [ ] Add `.editorconfig` for cross-editor consistency (2-space indent, LF line endings, UTF-8)
- [ ] Ensure `.gitignore` covers: `node_modules/`, `.env`, `dist/`, `coverage/`
- [ ] Add lint and format scripts to `package.json`:
  ```json
  "lint": "eslint .",
  "format": "prettier --write ."
  ```

---

## Phase 2 — Environment Management

Never hardcode secrets or environment-specific values.

### Tasks
- [ ] Install `dotenv`
- [ ] Create `.env.example` documenting every required variable with placeholder values
- [ ] Load env in `app.js` or entry point: `import 'dotenv/config'`
- [ ] Support three environments via `NODE_ENV`: `development`, `test`, `production`
- [ ] Validate required env variables at startup — fail fast if any are missing

### Required variables to document in `.env.example`
```
NODE_ENV=development
PORT=3000
# Add DB connection strings, API keys, etc. here as the project grows
```

---

## Phase 3 — Testing

Focus on critical paths first: node creation, branch linking, connection/matching logic.

### Tasks
- [ ] Install **Jest** (or **Vitest** if ESM is preferred) as dev dependency
- [ ] Install **Supertest** for HTTP integration tests
- [ ] Create `tests/` directory with structure mirroring `src/`
- [ ] Add test script to `package.json`:
  ```json
  "test": "jest --coverage"
  ```
- [ ] Write unit tests for:
    - Node and branch creation logic
    - Keyword matching / connection algorithm
- [ ] Write integration tests for:
    - `POST /nodes` — create a node
    - `POST /nodes/:id/branches` — add a branch
    - `GET /nodes` — retrieve graph data
- [ ] Enforce minimum coverage threshold (suggested: 70%)

---

## Phase 4 — Containerization

Containerize early to stay cloud-provider agnostic.

### Tasks
- [ ] Create `Dockerfile`:
  ```dockerfile
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  EXPOSE 3000
  CMD ["node", "src/index.js"]
  ```
- [ ] Create `.dockerignore`: `node_modules`, `.env`, `coverage`, `*.md`
- [ ] Create `docker-compose.yml` for local development:
    - `app` service (the Express server, with hot reload)
    - Any database service if applicable
- [ ] Verify app starts cleanly with `docker compose up`

---

## Phase 5 — CI Pipeline

Run on every pull request and push to `main`.

### Tasks
- [ ] Create `.github/workflows/ci.yml` (GitHub Actions)
- [ ] Pipeline steps in order:
    1. Checkout code
    2. Set up Node.js (version 20)
    3. Install dependencies (`npm ci`)
    4. Run lint (`npm run lint`)
    5. Run tests (`npm test`)
    6. Build Docker image (`docker build .`)
- [ ] Mark pipeline as required check before merging PRs

### Example workflow trigger
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

---

## Phase 6 — CD & Cloud Deployment

Keep provider-agnostic via Docker. Suggested providers for low-ops Node.js: **Railway**, **Render**, or **Fly.io**.

### Tasks
- [ ] Choose a cloud provider
- [ ] Add deployment step to CI pipeline (runs only on `main` after tests pass)
- [ ] Store all secrets in the provider's secret manager (never in the repo)
- [ ] Configure environment variables in provider dashboard matching `.env.example`
- [ ] Set up a staging environment before production

---

## Phase 7 — Production Hardening

### Security
- [ ] Install `helmet` — sets secure HTTP headers
- [ ] Install `express-rate-limit` — protect against abuse
- [ ] Ensure all user inputs are validated and sanitised

### Observability
- [ ] Install **Pino** for structured JSON logging (fast, production-friendly)
- [ ] Add **Sentry** for error tracking (free tier sufficient for academic project)
- [ ] Add a health check endpoint:
  ```
  GET /health → 200 OK { status: "ok" }
  ```

### Reliability
- [ ] Handle uncaught exceptions and unhandled promise rejections gracefully
- [ ] Return consistent error response format:
  ```json
  { "error": "message", "code": "ERROR_CODE" }
  ```

---

## Conventions

- Branch naming: `feat/`, `fix/`, `chore/`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- PRs must pass CI before merging
- `main` branch is always deployable