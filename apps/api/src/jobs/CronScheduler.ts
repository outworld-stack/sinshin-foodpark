/**
 * CronScheduler — daily jobs at a fixed Asia/Tehran time.
 *
 * Design decisions (peak-load & LB ready):
 *   - A 30s tick + Redis lock keyed by (job, Tehran-date) → each job runs
 *     EXACTLY once per day even with N api replicas behind a load balancer.
 *   - No cron-expression dependency, no server-TZ headaches: we compute
 *     Tehran wall-clock via Intl, independent of the host timezone.
 *   - `catchUp: true` jobs that were missed (server down at 02:00) run at
 *     boot if their time already passed today — the nightly scan MUST
 *     happen before the 11:00 SMS wave.
 *   - When sub-daily schedules are ever needed, swap the tick for Bun.cron
 *     (Bun ≥ 1.3) — the lock layer stays identical.
 */
import type { RedisService } from "../cache/redis";

export interface DailyJob {
  /** unique, stable — used in lock keys and logs */
  name: string;
  /** "HH:MM" in Asia/Tehran */
  time: string;
  /** run at boot if today's slot was already missed */
  catchUp?: boolean;
  run: () => Promise<void>;
}

const LOCK_TTL_SECONDS = 60 * 60 * 6; // a job "owns" its day-slot for 6h
const TICK_MS = 30_000;

const tehranParts = (d = new Date()): { date: string; hm: string } => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hm: `${parts.hour}:${parts.minute}`,
  };
};

export class CronScheduler {
  private readonly jobs: DailyJob[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly running = new Set<string>();

  constructor(private readonly redis: RedisService) {}

  register(job: DailyJob): void {
    this.jobs.push(job);
    console.log(`[cron] registered "${job.name}" at ${job.time} Asia/Tehran`);
  }

  async start(): Promise<void> {
    // catch-up pass for missed daily slots (e.g. server booted at 09:00)
    for (const job of this.jobs) {
      if (!job.catchUp) continue;
      const { date, hm } = tehranParts();
      if (hm >= job.time) {
        // only if nobody ran it today (replica or previous boot)
        const lockKey = `cron:lock:${job.name}:${date}`;
        const got = await this.tryLock(lockKey);
        if (got) {
          console.log(`[cron] catch-up run for "${job.name}"`);
          void this.execute(job);
        }
      }
    }

    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    const { date, hm } = tehranParts();
    for (const job of this.jobs) {
      if (hm !== job.time) continue; // fire within the matching minute
      if (this.running.has(job.name)) continue;

      const lockKey = `cron:lock:${job.name}:${date}`;
      const got = await this.tryLock(lockKey);
      if (!got) continue; // another replica owns today's run
      void this.execute(job);
    }
  }

  private async tryLock(lockKey: string): Promise<boolean> {
    try {
      const res = await this.redis.set(lockKey, "1", { ex: LOCK_TTL_SECONDS });
      return res === "OK";
    } catch {
      // Redis down → fail CLOSED (don't risk duplicate SMS waves);
      // the job will retry on the next tick once Redis recovers.
      return false;
    }
  }

  private async execute(job: DailyJob): Promise<void> {
    this.running.add(job.name);
    const t0 = performance.now();
    try {
      await job.run();
      console.log(
        `[cron] "${job.name}" finished in ${(performance.now() - t0).toFixed(0)}ms`,
      );
    } catch (err) {
      console.error(`[cron] "${job.name}" FAILED:`, err);
    } finally {
      this.running.delete(job.name);
    }
  }
}