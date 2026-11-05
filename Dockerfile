# Stage 0: Base — Node + pnpm (Corepack is no longer bundled since Node 26).
# The pnpm version is read from package.json "packageManager" (single source of truth).
FROM node:lts-alpine AS base

WORKDIR /app

COPY package.json ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.replace(/^pnpm@|\+.*$/g, '')")"

# Stage 1: Build
FROM base AS builder

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile

COPY backend/src ./backend/src
COPY backend/tsconfig.json backend/tsconfig.build.json ./backend/
COPY frontend/src ./frontend/src
COPY frontend/*.html ./frontend/
COPY frontend/tsconfig.json frontend/vite.config.ts ./frontend/

RUN pnpm build

# Stage 2: Runtime
FROM base AS runtime

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /data/uploads

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/data.db
ENV UPLOADS_DIR=/data/uploads

EXPOSE 3000

CMD ["node", "--experimental-sqlite", "backend/dist/server.js"]
