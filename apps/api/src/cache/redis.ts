/**
 * Redis — Bun's native client (Bun.redis, Bun ≥ 1.2).
 * No `ioredis`, no `redis` package.
 *
 * Responsibilities:
 *   - cache (hot reads: menu, restaurant status)
 *   - distributed locks (cron jobs run exactly once across replicas)
 *   - pub/sub bridge (SSE fan-out across api replicas → LB-ready)
 *
 * NOTE: Bun's RedisClient hangs forever (instead of throwing) when the
 * server is unreachable — every operation here is timeout-guarded so a
 * Redis outage degrades us, never deadlocks us.
 */
import { RedisClient } from "bun";

const OP_TIMEOUT_MS = 2_500;

export class RedisService {
  private readonly client: RedisClient;

  constructor(url: string) {
    this.client = new RedisClient(url);
  }

  private async t<T>(op: Promise<T>, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        op,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), OP_TIMEOUT_MS);
        }),
      ]);
    } catch {
      return fallback;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Connectivity probe. Never throws, never hangs. */
  async connect(): Promise<boolean> {
    const res = await this.t(this.client.set("health:boot", "1"), null);
    return res === "OK";
  }

  async ping(): Promise<boolean> {
    const res = await this.t(this.client.set("health:ping", "1"), null);
    return res === "OK";
  }

  // ── cache helpers ────────────────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    return this.t<string | null>(this.client.get(key), null);
  }

  async set(
    key: string,
    value: string,
    opts?: { ex?: number },
  ): Promise<string | null> {
    const op =
      opts?.ex !== undefined
        ? this.client.set(key, value, "EX", opts.ex)
        : this.client.set(key, value);
    return this.t<string | null>(op, null);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    opts?: { ex?: number },
  ): Promise<void> {
    await this.set(key, JSON.stringify(value), opts);
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.t<number>(this.client.del(...keys), 0);
  }

  // ── pub/sub (SSE scale-out bridge) ──────────────────────────────────
  async publish(channel: string, message: string): Promise<number> {
    return this.t<number>(this.client.publish(channel, message), 0);
  }

  async close(): Promise<void> {
    this.client.close();
  }
}