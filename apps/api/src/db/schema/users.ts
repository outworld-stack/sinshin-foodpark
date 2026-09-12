import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

/**
 * کاربران — ورود با شماره موبایل (OTP).
 * role: user | admin | superadmin
 * token_version: با هر «خروج از همه‌ی دستگاه‌ها» یکی زیاد می‌شود
 *   تا همه‌ی access token های قدیمی بی‌اعتبار شوند.
 *
 * حلقه‌ی معرفی و قوانین:
 *  - referral_code: کد معرف یکتای هر کاربر (مثل SIN-4KD9PA) — هنگام ثبت‌نام ساخته می‌شود
 *  - referred_by: اگر کاربر با کد معرف ثبت‌نام کرده، شناسه‌ی معرف (خودارجاعی مجاز نیست)
 *  - terms_accepted_at / terms_version: لحظه و نسخه‌ی قوانینی که کاربر پذیرفته
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
    referralCode: varchar('referral_code', { length: 16 }),
    referredBy: uuid('referred_by').references((): AnyPgColumn => users.id),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    termsVersion: varchar('terms_version', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_phone_key').on(t.phone),
    index('users_token_version_idx').on(t.tokenVersion),
    uniqueIndex('users_referral_code_key').on(t.referralCode),
    index('users_referred_by_idx').on(t.referredBy),
  ],
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert