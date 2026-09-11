import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { DeviceId, DeviceFingerprint, UserId } from "../../types/brand";
import { users } from "./users";

/**
 * DEVICE MANAGEMENT — the heart of the anti-fraud rules:
 *
 *  1. A device is identified by a client-generated device token (UUID the
 *     web app stores in localStorage; the future PWA will keep it in
 *     persistent storage). The server only ever sees its salted SHA-256
 *     fingerprint — a stolen database cannot reconstruct device tokens.
 *
 *  2. REGISTRATION burns the device: `bound_user_id` is set exactly once
 *     (registration transaction) and is IMMUTABLE afterwards. A burned
 *     device can never be used to register another account.
 *
 *  3. The registration device is the user's DEFAULT device (`is_default`),
 *     fixed forever — logins from other devices never flip it.
 *
 *  4. LOGIN is unrestricted: any user may log in on any device. Every login
 *     leaves a session row (see sessions.ts) → full audit trail of who
 *     used which device, without restricting anyone.
 */
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey().$type<DeviceId>(),

    /** sha256(deviceToken + secret) — 64 hex chars, unique. */
    fingerprint: varchar("fingerprint", { length: 64 })
      .$type<DeviceFingerprint>()
      .notNull()
      .unique(),

    /** Human label, e.g. "Chrome · Android" (parsed from User-Agent). */
    label: varchar("label", { length: 120 }).notNull().default(""),
    userAgent: varchar("user_agent", { length: 400 }).notNull().default(""),

    /**
     * BURN — the user who registered on this device. Immutable by design:
     * the only code path that writes it is the registration transaction,
     * guarded by `where bound_user_id is null`.
     */
    boundUserId: uuid("bound_user_id")
      .$type<UserId>()
      .references(() => users.id, { onDelete: "set null" }),

    /** True only for the device the user registered with. */
    isDefault: boolean("is_default").notNull().default(false),

    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("devices_bound_user_idx").on(t.boundUserId)],
);

export type DeviceRow = typeof devices.$inferSelect;