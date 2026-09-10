# ─────────────────────────────────────────────────────────────────────────────
# apps/web — Layer 3: frontend image (TanStack Start / vite / nitro)
#
# Targets:
#   dev      → vite dev server with HMR   (docker compose --profile dev)
#   runtime  → built SSR server            (default, prod-like)
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-slim AS base
WORKDIR /app
ENV TZ=Asia/Tehran

# ── install deps (layer-cached on manifests only) ──
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── dev: vite dev server (source bind-mounted by compose) ──
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# ── build the SSR bundle ──
FROM deps AS build
COPY . .
RUN bun run build

# ── runtime: minimal production image ──
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]