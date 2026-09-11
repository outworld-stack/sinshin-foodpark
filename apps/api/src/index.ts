/**
 * Entry point — wiring & lifecycle.
 *
 * Boot order: config → infra (db, redis, hub) → server → cron.
 * Infra failures are logged, never fatal at boot (healthcheck reports,
 * restart policy recovers) — so a slow-starting postgres doesn't kill
 * the api container.
 */
import { AppConfig } from "./config/env";
import { Database } from "./db/client";
import { RedisService } from "./cache/redis";
import { SseHub } from "./realtime/sse-hub";
import { CronScheduler } from "./jobs/CronScheduler";
import { CouponScanJob } from "./jobs/coupon-scan.job";
import { CouponNudgeSmsJob } from "./jobs/coupon-nudge.job";
import { SmsService } from "./modules/sms/sms.service";
import { buildApp } from "./app";

const config = new AppConfig();
const db = new Database(config.databaseUrl);
const redis = new RedisService(config.redisUrl);
const sseHub = new SseHub(redis);
const sms = new SmsService(config);

const scheduler = new CronScheduler(redis);
scheduler.register(new CouponScanJob({ config, db }));
scheduler.register(new CouponNudgeSmsJob({ config, db, sms }));

// ── boot ──────────────────────────────────────────────────────────────
const dbUp = await db.connect();
const redisUp = await redis.connect();
if (!dbUp) console.error("[boot] postgres unreachable — /api/health will report down");
if (!redisUp) console.error("[boot] redis unreachable — /api/health will report down");

await scheduler.start();

const app = buildApp({ config, db, redis, sseHub });
app.listen({ port: config.port, hostname: config.host });

console.log(
  `┌─────────────────────────────────────────────┐
│  Sinshin FoodPark API                       │
│  env      : ${config.env.padEnd(29)}│
│  url      : http://${`${config.host}:${config.port}`.padEnd(30)}│
│  openapi  : ${`http://${config.host}:${config.port}/swagger`.padEnd(30)}│
│  postgres : ${(dbUp ? "connected" : "DOWN").padEnd(29)}│
│  redis    : ${(redisUp ? "connected" : "DOWN").padEnd(29)}│
└─────────────────────────────────────────────┘`,
);

// ── graceful shutdown ─────────────────────────────────────────────────
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[boot] ${signal} → graceful shutdown`);
  scheduler.stop();
  app.stop();
  await db.close().catch(() => {});
  await redis.close().catch(() => {});
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));