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
  createdAt: Date
  lastLoginAt: Date | null
}

export function publicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }
}

export function requestOtp(phone: string) {
  return sendOtp(phone)
}

/**
 * ورود با OTP:
 *  ۱) کد چک می‌شود
 *  ۲) کاربر پیدا یا ساخته می‌شود (شماره‌های SUPER_ADMIN_PHONES نقش superadmin می‌گیرند)
 *  ۳) سهمیه‌ی دستگاه چک می‌شود (ابرمدیرها معاف‌اند)
 *  ۴) نشست ساخته می‌شود
 */
export async function loginWithOtp(
  phone: string,
  code: string,
  device: DeviceInput,
  ip?: string | null,
): Promise<SessionIssue> {
  await verifyOtp(phone, code)

  let user = await db.query.users.findFirst({ where: eq(users.phone, phone) })

  if (!user) {
    const [created] = await db
      .insert(users)
      .values({
        phone,
        role: isSuperAdmin(phone) ? 'superadmin' : 'user',
        lastLoginAt: new Date(),
      })
      .returning()
    user = created
  } else {
    if (user.bannedAt) throw Err.banned()

    const [updated] = await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        ...(isSuperAdmin(phone) && user.role !== 'superadmin' ? { role: 'superadmin' } : {}),
      })
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

  return createSession(user, device, ip)
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