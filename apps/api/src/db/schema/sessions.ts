import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { DeviceId, SessionId, UserId } from "../../types/brand";
import { devices } from "./devices";
import { users } from "./users";

/**
 * Sessions — the REFRESH side of auth: opaque, revocable, device-bound.
 *
 * Design (peak-load & PWA ready):
 *   - ACCESS side = short-lived JWT (stateless, LB-friendly; 15m default).
 *   - REFRESH side = the raw token behind this row (cookie `sinshin_session`,
 *     httpOnly, for the web app; the future PWA reuses the same endpoints).
 *   - The DATABASE stores only sha256(token) — a leaked DB cannot forge
 *     sessions.
 *   - Each session is bound to (user, device) → per-device "log out"
 *     is one UPDATE, and the device audit trail comes for free.
 *   - Instant revocation (logout, admin kill, device revoke) works because
 *     the refresh side is stateful; a stolen access JWT dies within
 *     ACCESS_TOKEN_TTL at worst.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey().$type<SessionId>(),

    /** sha256(raw token) — 64 hex chars. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),

    /**
     * Rotation family: all tokens descending from one login share this id.
     * Refresh rotates the token; replaying an ALREADY-ROTATED token is
     * treated as theft → the whole family is revoked (reuse detection).
     */
    familyId: uuid("family_id").notNull().defaultRandom(),

    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .$type<DeviceId>()
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),

    ip: varchar("ip", { length: 45 }),
    userAgent: varchar("user_agent", { length: 400 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_device_idx").on(t.deviceId),
    index("sessions_expires_idx").on(t.expiresAt),
    index("sessions_family_idx").on(t.familyId),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;