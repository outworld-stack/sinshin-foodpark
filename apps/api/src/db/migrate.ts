/**
 * Migration runner — same driver as the app (Bun.sql), no extra tooling.
 *
 *   bun run db:generate  # drizzle-kit: schema → ./drizzle SQL files
 *   bun run db:migrate   # this script: apply pending migrations
 */
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { Database } from "./client";
import { AppConfig } from "../config/env";

const config = new AppConfig();
const database = new Database(config.databaseUrl);

const t0 = performance.now();
await migrate(database.db, { migrationsFolder: "./drizzle" });
console.log(
  `[db] migrations applied in ${(performance.now() - t0).toFixed(0)}ms`,
);
await database.close();