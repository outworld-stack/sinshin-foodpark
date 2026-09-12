import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * کاربران — ورود با شماره موبایل (OTP).
 * role: user | admin | superadmin
 * token_version: با هر «خروج از همه‌ی دستگاه‌ها» یکی زیاد می‌شود
 *   تا همه‌ی access token های قدیمی بی‌اعتبار شوند.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: varchar('phone', { length: 11 }).notNull(),
    name: text('name'),
    role: varchar('role', { length: 20 }).notNull().default('user'),
    tokenVersion: integer('token_version').notNull().default(0),
    bannedAt: timestamp('banned_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_phone_key').on(t.phone),
    index('users_token_version_idx').on(t.tokenVersion),
  ],
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert