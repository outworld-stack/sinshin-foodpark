import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { UserId } from "../../types/brand";

/**
 * Roles: MAIN_ADMIN = ادمین اصلی, ADMIN_L2 = ادمین سطح ۲.
 * Role checks for admin routes are enforced SERVER-side (Elysia guards);
 * the frontend merely mirrors them for UX.
 *
 * One phone number = one registration, forever (unique index below).
 * The device used at registration becomes that user's DEFAULT device and
 * is permanently "burned" to them (see devices.ts).
 */
export const userRoleEnum = pgEnum("user_role", [
  "CUSTOMER",
  "ADMIN_L2",
  "MAIN_ADMIN",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey().$type<UserId>(),
    phone: varchar("phone", { length: 16 }).notNull().unique(),
    role: userRoleEnum("role").notNull().default("CUSTOMER"),

    /** Optional display name captured at registration or profile edit. */
    fullName: varchar("full_name", { length: 120 }),

    /** Referral loop (F-45): my code others can quote at THEIR registration. */
    referralCode: varchar("referral_code", { length: 16 }).unique(),
    /** The user whose referral code I quoted at registration (nullable). */
    referrerId: uuid("referrer_id")
      .$type<UserId>()
      .references((): AnyPgColumn => users.id, { onDelete: "set null" }),

    /** Terms-of-service acceptance snapshot (B-33). */
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    termsVersion: varchar("terms_version", { length: 16 }),

    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    /**
     * Global kill-switch version. Bumped on "log out everywhere": access
     * JWTs issued before the bump are rejected at the next refresh, and
     * cookie sessions are revoked outright.
     */
    tokenVersion: integer("token_version").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("users_role_idx").on(t.role),
    index("users_referrer_idx").on(t.referrerId),
  ],
);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserRow = typeof users.$inferSelect;