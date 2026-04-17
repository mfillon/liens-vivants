# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /build

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
FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /build/backend/dist ./backend/dist
COPY --from=builder /build/frontend/dist ./frontend/dist

RUN mkdir -p /data/uploads

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /app /data

USER appuser

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/data.db
ENV UPLOADS_DIR=/data/uploads

EXPOSE 3000

CMD ["node", "--experimental-sqlite", "backend/dist/server.js"]
