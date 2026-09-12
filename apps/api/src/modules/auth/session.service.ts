import { and, desc, eq, isNull } from 'drizzle-orm'

import { db } from '../../db'
import { devices, users, type UserRow } from '../../db/schema'
import { env, isSuperAdmin } from '../../core/env'
import { Err } from '../../core/errors'
import { sendOtp, verifyOtp } from './otp.service'
import { createSession, type DeviceInput, type SessionIssue } from './session.service'


export interface PublicUser {
  id: string
  phone: string
  name: string | null
  role: string
  referralCode: string | null
  createdAt: Date
  lastLoginAt: Date | null
}

export function publicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    referralCode: u.referralCode,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }
}

export function requestOtp(phone: string) {
  return sendOtp(phone)
}

/** گزینه‌های ورود — حلقه‌ی معرفی و پذیرش قوانین (فقط برای ثبت‌نام معنا دارد) */
export interface LoginOptions {
  /** کد معرفی که کاربر از لینک ?ref=... آورده */
  refCode?: string | null
  /** کاربر جدید باید قوانین را پذیرفته باشد */
  termsAccepted?: boolean
  /** نسخه‌ی قوانینی که فرانت به کاربر نشان داده (مثل "1") */
  termsVersion?: string | null
}

// الفبای بدون حروف گیج‌کننده (I و L و O و 0 و 1 حذف) — کد معرف مثل SIN-4KD9PA
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function randomReferralCode(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  let s = ''
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length]
  return `SIN-${s}`
}

/** کد معرف یکتا می‌سازد — در برخورد نادر، دوباره تلاش می‌کند */
async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = i < 4 ? randomReferralCode(6) : randomReferralCode(10)
    const clash = await db.query.users.findFirst({ where: eq(users.referralCode, code) })
    if (!clash) return code
  }
  // عملاً ناممکن — فالبک زمان‌محور که همیشه یکتاست
  return `SIN-${Date.now().toString(36).toUpperCase()}`
}

/** چکِ سبکِ قبل از ارسال کد — بدون هزینه‌ی پیامک (قرارداد checkIsNewUser فرانت) */
export async function checkPhone(phone: string): Promise<{
  isNewUser: boolean
  needsTerms: boolean
  role: string | null
}> {
  const user = await db.query.users.findFirst({ where: eq(users.phone, phone) })
  if (!user) return { isNewUser: true, needsTerms: true, role: null }
  return {
    isNewUser: false,
    // کاربرِ قدیمی که هنوز قوانین را نپذیرفته (رکوردهای قبل از این نسخه)
    needsTerms: user.termsAcceptedAt === null,
    role: user.role,
  }
}

/**
 * ورود با OTP:
 *  ۱) کد چک می‌شود
 *  ۲) کاربر پیدا یا ساخته می‌شود (شماره‌های SUPER_ADMIN_PHONES نقش superadmin می‌گیرند)
 *  ۳) سهمیه‌ی دستگاه چک می‌شود (ابرمدیرها معاف‌اند)
 *  ۴) نشست ساخته می‌شود
 *
 * ثبت‌نام کاربر جدید بدون پذیرش قوانین ممکن نیست؛ کد معرف اختیاری است و
 * اگر نامعتبر باشد بی‌صدا نادیده گرفته می‌شود (ثبت‌نام بدون معرف ادامه می‌یابد).
 */
export async function loginWithOtp(
  phone: string,
  code: string,
  device: DeviceInput,
  ip?: string | null,
  opts: LoginOptions = {},
): Promise<SessionIssue & { isNewUser: boolean }> {
  await verifyOtp(phone, code)

  let user = await db.query.users.findFirst({ where: eq(users.phone, phone) })
  let isNewUser = false

  if (!user) {
    isNewUser = true
    if (!opts.termsAccepted) {
      throw Err.validation('پذیرش قوانین برای ثبت‌نام الزامی است.')
    }

    // معرف — با کد یکتا پیدا می‌شود (خودارجاعی برای کاربر جدید ناممکن است)
    let referredBy: string | null = null
    if (opts.refCode) {
      const refCode = opts.refCode.trim().toUpperCase().slice(0, 16)
      const referrer = await db.query.users.findFirst({ where: eq(users.referralCode, refCode) })
      referredBy = referrer?.id ?? null
    }

    const [created] = await db
      .insert(users)
      .values({
        phone,
        role: isSuperAdmin(phone) ? 'superadmin' : 'user',
        lastLoginAt: new Date(),
        referralCode: await generateUniqueReferralCode(),
        referredBy,
        termsAcceptedAt: new Date(),
        termsVersion: opts.termsVersion ?? null,
      })
      .returning()
    user = created
  } else {
    if (user.bannedAt) throw Err.banned()

    const patch: Partial<typeof users.$inferInsert> = { lastLoginAt: new Date() }
    if (isSuperAdmin(phone) && user.role !== 'superadmin') patch.role = 'superadmin'
    // کاربر قدیمی که قوانین را نپذیرفته بود و حالا پذیرفت
    if (opts.termsAccepted && !user.termsAcceptedAt) {
      patch.termsAcceptedAt = new Date()
      patch.termsVersion = opts.termsVersion ?? null
    }

    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, user.id))
      .returning()
    user = updated
  }

  if (!user) throw Err.internal('ذخیره‌سازی کاربر ناموفق بود؛ دوباره تلاش کن.')

  if (env.deviceEnforcement && !isSuperAdmin(phone)) {
    const activeDevices = await db.query.devices.findMany({
      where: and(eq(devices.userId, user.id), isNull(devices.revokedAt)),
    })
    const isKnownDevice = activeDevices.some((d) => d.fingerprint === device.fingerprint)
    if (!isKnownDevice && activeDevices.length >= env.maxDevicesPerUser) {
      throw Err.deviceLimit(env.maxDevicesPerUser)
    }
  }

  const issue = await createSession(user, device, ip)
  return { ...issue, isNewUser }
}

/** پروفایل کاربر + لیست دستگاه‌های فعال (برای صفحه‌ی «دستگاه‌های من») */
export async function getAccount(userId: string, currentDeviceId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) throw Err.unauthorized()

  const activeDevices = await db.query.devices.findMany({
    where: and(eq(devices.userId, userId), isNull(devices.revokedAt)),
    orderBy: [desc(devices.lastActiveAt)],
  })

  return {
    user: publicUser(user),
    devices: activeDevices.map((d) => ({
      id: d.id,
      name: d.name,
      platform: d.platform,
      lastActiveAt: d.lastActiveAt,
      createdAt: d.createdAt,
      current: d.id === currentDeviceId,
    })),
  }
}