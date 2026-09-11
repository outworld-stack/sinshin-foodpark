import { index, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import type { UserId } from "../../types/brand";

/**
 * Roles: MAIN_ADMIN = ادمین اصلی, ADMIN_L2 = ادمین سطح ۲.
 * Role checks for admin routes are enforced SERVER-side (Elysia guards);
 * the frontend merely mirrors them for UX.
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("users_role_idx").on(t.role)],
);