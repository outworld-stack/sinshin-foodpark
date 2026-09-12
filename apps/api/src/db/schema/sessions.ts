import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { devices } from './devices'
import { users } from './users'

/**
 * نشست‌ها — یک نشست به ازای هر «ورود دستگاه» (خانواده‌ی refresh token).
 * refresh_hash: sha256 توکن refresh «فعلی» — با هر rotate به‌روز می‌شود.
 *   ارائه‌ی توکن قدیمی (hash ناهمخوان) = احتمال سرقت → کل نشست فوراً
 *   باطل می‌شود (reuse detection / ابطال خانواده).
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    refreshHash: varchar('refresh_hash', { length: 64 }).notNull(),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: varchar('revoked_reason', { length: 30 }),
  },
  (t) => [
    uniqueIndex('sessions_refresh_hash_key').on(t.refreshHash),
    index('sessions_user_idx').on(t.userId),
    index('sessions_device_idx').on(t.deviceId),
  ],
)

export type SessionRow = typeof sessions.$inferSelect
export type NewSessionRow = typeof sessions.$inferInsert