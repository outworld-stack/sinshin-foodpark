# ─────────────────────────────────────────────────────────────────────────────
# apps/api — ایمیج بک‌اند (Bun + Elysia)
#
# Targets:
#   migrate  → یک‌بارمصرف؛ مهاجرت‌های drizzle را اعمال می‌کند (سرویس migrate)
#   runtime  → اجرای production (پیش‌فرض)
#
# توسعه‌ی روزمره روی خود سیستم انجام می‌شود (bun run dev)؛
# ایمیج فقط برای شبیه‌سازی کامل و سرور ساخته می‌شود.
# ─────────────────────────────────────────────────────────────────────────────
FROM oven/bun:1.3-slim AS base
WORKDIR /app
ENV TZ=Asia/Tehran
# tzdata → زمان صحیح Asia/Tehran برای زمان‌بند cron (بعداً وصل می‌شود)
RUN apt-get update \
  && apt-get install -y --no-install-recommends tzdata \
  && rm -rf /var/lib/apt/lists/*

# ── نصب همه‌ی وابستگی‌ها (شامل devDeps برای drizzle-kit) ──
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── migrate: اعمال SQL های drizzle — idempotent، فقط دیتابیس را می‌خواهد ──
FROM deps AS migrate
COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.ts ./
CMD ["bun", "run", "db:migrate"]

# ── runtime: production ──
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src ./src
EXPOSE 3000
CMD ["bun", "src/index.ts"]