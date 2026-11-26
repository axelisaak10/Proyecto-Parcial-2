# Multi-stage optimized Node 24 + Express API Dockerfile (pnpm + node:sqlite)

# --- Build stage ---
FROM node:24-alpine AS build
WORKDIR /app

ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Install dependencies first for layer caching
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml backend/.npmrc ./
RUN pnpm install --frozen-lockfile

# Build TypeScript sources and prune devDependencies
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN pnpm run build && pnpm prune --prod

# --- Runtime stage ---
FROM node:24-alpine AS final
WORKDIR /app

RUN mkdir -p /app/data /app/backups

EXPOSE 80

ENV NODE_ENV=production
ENV PORT=80
ENV DB_PATH=/app/data/toystore.db
ENV BACKUP_DIR=/app/backups

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/server.js"]
