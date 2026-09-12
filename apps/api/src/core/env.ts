import { normalizePhone } from './phone'

function required(name: string, value: string | undefined): string {
  const v = value?.trim()
  if (!v) {
    throw new Error(
      `[env] متغیر محیطی الزامی «${name}» تنظیم نشده است. فایل .env را بررسی کن.`,
    )
  }
  return v
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const appEnv =
  (process.env.APP_ENV ?? 'development').toLowerCase() === 'production'
    ? ('production' as const)
    : ('development' as const)

const enforcementRaw = (process.env.DEVICE_ENFORCEMENT ?? '').trim().toLowerCase()

export const env = {
  appEnv,
  isProd: appEnv === 'production',

  databaseUrl: required('DATABASE_URL', process.env.DATABASE_URL),
  redisUrl: process.env.REDIS_URL?.trim() || 'redis://redis:6379',
  jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
  siteUrl: required('SITE_URL', process.env.SITE_URL).replace(/\/+$/, ''),

  sessionTtlDays: num(process.env.SESSION_TTL_DAYS, 30),
  accessTokenTtlMinutes: 15,

  /** اگر DEVICE_ENFORCEMENT تنظیم شده باشد همان اعمال می‌شود؛ وگرنه در prod روشن و در dev خاموش */
  deviceEnforcement:
    enforcementRaw !== '' ? enforcementRaw === 'on' : appEnv === 'production',
  maxDevicesPerUser: num(process.env.MAX_DEVICES_PER_USER, 5),

  /** شماره‌های ابرمدیر (نرمال‌شده) — معاف از محدودیت دستگاه */
  superAdminPhones: (process.env.SUPER_ADMIN_PHONES ?? '')
    .split(',')
    .map((p) => normalizePhone(p))
    .filter((p): p is string => p !== null),

  otp: {
    ttlSeconds: 120,
    resendCooldownSeconds: 90,
    maxVerifyAttempts: 5,
    maxPerHourPerPhone: 5,
    maxPerDayPerPhone: 20,
  },
} as const

export function isSuperAdmin(phone: string): boolean {
  return env.superAdminPhones.includes(phone)
}