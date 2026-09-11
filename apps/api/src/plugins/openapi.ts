import { openapi } from "@elysiajs/openapi";
import type { AppConfig } from "../config/env";

/**
 * OpenAPI 3.1 + Swagger UI — live, always in sync with the code,
 * because Elysia generates the schema from the same TypeBox types
 * that validate every request.
 */
export const openapiPlugin = (config: AppConfig) =>
  openapi({
    path: "/swagger",
    documentation: {
      info: {
        title: "Sinshin FoodPark API",
        version: "0.1.0",
        description:
          "Backend for sinshin.localhost — dev sim. All routes prefixed with /api.",
      },
      servers: [{ url: "/", description: "current host" }],
      tags: [
        { name: "Health", description: "Liveness/readiness" },
        { name: "Realtime", description: "SSE live feeds" },
        { name: "Auth", description: "OTP login & sessions (next step)" },
        { name: "Orders", description: "Order lifecycle (next step)" },
      ],
    },
    ...(config.env === "production"
      ? { swaggerOptions: { persistAuthorization: false } }
      : {}),
  });