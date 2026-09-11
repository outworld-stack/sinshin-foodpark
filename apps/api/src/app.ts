/**
 * Elysia application factory.
 *
 * `buildApp(deps)` composes plugins + modules around injected class
 * instances (Database, RedisService, SseHub, services, jobs).
 *
 * Route layout:
 *   /swagger            → OpenAPI UI (no /api prefix)
 *   /api/health, /api/realtime/*  → business modules
 *
 * Eden treaty (frontend) imports `App` — the FULLY wired type — so every
 * route, request body and response shape is compile-time checked on the
 * web side. Change the API → the frontend build breaks with exact lines.
 */
import { Elysia, NotFoundError, ValidationError } from "elysia";
import type { AppConfig } from "./config/env";
import type { Database } from "./db/client";
import type { RedisService } from "./cache/redis";
import type { SseHub } from "./realtime/sse-hub";
import { openapiPlugin } from "./plugins/openapi";
import { healthModule } from "./modules/health/health.module";
import { HealthService } from "./modules/health/health.service";
import { realtimeModule } from "./modules/realtime/realtime.module";
import { AppError } from "./core/errors";

export interface AppDeps {
  config: AppConfig;
  db: Database;
  redis: RedisService;
  sseHub: SseHub;
}

export const buildApp = (deps: AppDeps) => {
  const health = new HealthService({ db: deps.db, redis: deps.redis });

  const api = new Elysia({ prefix: "/api" })
    .use(healthModule(health))
    .use(realtimeModule(deps.sseHub));
  // next steps (each = one module folder + class trio):
  //   .use(authModule(deps))          // OTP login, sessions, role guards
  //   .use(ordersModule(deps))        // order lifecycle + SSE publishing
  //   .use(couponsModule(deps))       // campaign CRUD
  //   .use(menuModule(deps))          // categories/products
  //   .use(addressesModule(deps))
  //   .use(deliveryZonesModule(deps))
  //   .use(paymentsModule(deps))      // direct gateway + signed webhook
  //   .use(adminsModule(deps))        // MAIN_ADMIN / ADMIN_L2 permissions

  return new Elysia()
    .use(openapiPlugin(deps.config))
    .onError(({ error, set }) => {
      if (error instanceof AppError) {
        set.status = error.status;
        return error.toJSON();
      }
      if (error instanceof NotFoundError) {
        set.status = 404;
        return { error: { code: "NOT_FOUND", message: "مسیر یافت نشد" } };
      }
      if (error instanceof ValidationError) {
        set.status = 422;
        return {
          error: { code: "VALIDATION_ERROR", message: "داده ارسالی نامعتبر است" },
        };
      }
      console.error("[api] unhandled error:", error);
      set.status = 500;
      return {
        error: { code: "INTERNAL_ERROR", message: "خطای داخلی سرور" },
      };
    })
    .use(api);
};

export type App = ReturnType<typeof buildApp>;