import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { users } from './users'

/**
 * دستگاه‌های هر کاربر — fingerprint توسط فرانت‌اند (UUID در localStorage)
 * تولید و ارسال می‌شود؛ یک دستگاه = یک نشست فعال.
 */
export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
    name: text('name').notNull().default('دستگاه بدون نام'),
    platform: varchar('platform', { length: 20 }).notNull().default('web'),
    userAgent: text('user_agent'),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('devices_user_fingerprint_key').on(t.userId, t.fingerprint),
    index('devices_user_idx').on(t.userId),
  ],
)

export type DeviceRow = typeof devices.$inferSelect
export type NewDeviceRow = typeof devices.$inferInsert