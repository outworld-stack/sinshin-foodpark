import { Elysia, t } from "elysia";
import type { HealthService } from "./health.service";

/**
 * Elysia plugins are composition units; everything with actual logic
 * lives in classes (HealthService etc.) that get injected here.
 */
export const healthModule = (health: HealthService) =>
  new Elysia({ prefix: "/health", tags: ["Health"] }).get(
    "/",
    async ({ set }) => {
      const result = await health.check();
      if (result.status === "degraded") set.status = 503;
      return result;
    },
    {
      detail: { summary: "Liveness/readiness of api + postgres + redis" },
      response: {
        200: t.Object({
          status: t.String(),
          db: t.String(),
          redis: t.String(),
          uptimeSeconds: t.Number(),
        }),
      },
    },
  );