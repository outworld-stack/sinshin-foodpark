import type { Database } from "../../db/client";
import type { RedisService } from "../../cache/redis";

/**
 * Liveness/readiness. Degrades to 503 when a dependency is down so
 * Caddy (health_uri) pulls the replica from rotation — this is the
 * behavior you want behind a future load balancer.
 */
export class HealthService {
  constructor(
    private readonly deps: { db: Database; redis: RedisService },
  ) {}

  async check(): Promise<{
    status: "ok" | "degraded";
    db: "up" | "down";
    redis: "up" | "down";
    uptimeSeconds: number;
  }> {
    const [dbUp, redisUp] = await Promise.all([
      this.deps.db.ping(),
      this.deps.redis.ping(),
    ]);

    return {
      status: dbUp && redisUp ? "ok" : "degraded",
      db: dbUp ? "up" : "down",
      redis: redisUp ? "up" : "down",
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}