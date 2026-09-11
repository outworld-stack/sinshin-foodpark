# ─────────────────────────────────────────────────────────────────────────────
# apps/api — Layer 3: backend image (Bun + Elysia)
#
# Targets:
#   dev      → devDeps included, for bun --hot / drizzle-kit   (profile dev)
#   runtime  → production deps only, runs src/index.ts         (default)
#
# Bun-native everything: Bun.serve (via Elysia), Bun.sql (Postgres),
# Bun.redis, Bun.password, Bun.fetch. Only 3 runtime npm deps.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-slim AS base
WORKDIR /app
ENV TZ=Asia/Tehran
# tzdata → correct Asia/Tehran times for the cron scheduler
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata \
  && rm -rf /var/lib/apt/lists/*

# ── install all deps (incl. devDeps for drizzle-kit/tsc) ──
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── dev: hot-reload (source bind-mounted by compose) ──
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["bun", "--hot", "src/index.ts"]

# ── runtime: production ──
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.ts ./
EXPOSE 3000
CMD ["bun", "src/index.ts"]