# --- Build stage (pnpm + Angular production build) ---
FROM node:24-alpine AS builder
WORKDIR /app

ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# --- Runtime stage (Nginx Alpine) ---
FROM nginx:1.27-alpine AS final

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/toystore-web/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1
