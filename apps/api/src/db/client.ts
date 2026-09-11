/**
 * Database — Drizzle ORM over Bun's native PostgreSQL client (Bun.sql).
 *
 * Zero extra driver dependency (no `pg`, no `postgres`): Bun.sql ships with
 * Bun ≥ 1.2 and handles connection pooling natively.
 */
import { SQL } from "bun";
import { drizzle, type BunSQLDatabase } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

export class Database {
  private readonly client: SQL;
  readonly db: BunSQLDatabase<typeof schema>;

  constructor(url: string) {
    this.client = new SQL(url);
    this.db = drizzle(this.client, { schema });
  }

  /** Warm-up + connectivity probe. Never throws (health route reports). */
  async connect(): Promise<boolean> {
    try {
      await this.client`select 1`;
      return true;
    } catch {
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.client`select 1`;
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}