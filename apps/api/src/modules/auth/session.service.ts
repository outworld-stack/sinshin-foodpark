import { and, eq, isNull, sql } from 'drizzle-orm'

import { db } from '../../db'
import {
  devices,
  sessions,
  users,
  type DeviceRow,
  type SessionRow,
  type UserRow,
} from '../../db/schema'
import { randomToken, sha256 } from '../../core/crypto'
import { env } from '../../core/env'
import { Err } from '../../core/errors'
import { signAccessToken } from '../../core/jwt'
import { redis } from '../../core/redis'

const SESSION_TTL_SECONDS = env.sessionTtlDays * 24 * 60 * 60
/** پنجره‌ی تشخیص استفاده‌ی مجدد از توکنی که قبلاً rotate شده */
const REUSE_WINDOW_SECONDS = env.accessTokenTtlMinutes * 60 + 300

const usedRtKey = (hash: string) => `usedrt:${hash}`

export interface DeviceInput {
  fingerprint: string
  name?: string
  platform?: string
  userAgent?: string | null
}

export interface SessionIssue {
  accessToken: string
  refreshToken: string
  user: UserRow
  session: SessionRow
  device: DeviceRow
}

/**
 * ورود: نشست جدید می‌سازد.
 * قاعده: یک دستگاه = حداکثر یک نشست فعال → با ورود مجدد، نشست قبلی همان
 * دستگاه باطل می‌شود (relogin).
 */
export async function createSession(
  user: UserRow,
  device: DeviceInput,
  ip?: string | null,
): Promise<SessionIssue> {
  // ۱) upsert دستگاه بر اساس (userId, fingerprint)
  let deviceRow = await db.query.devices.findFirst({
    where: and(eq(devices.userId, user.id), eq(devices.fingerprint, device.fingerprint)),
  })

  if (deviceRow) {
    await db
      .update(devices)
      .set({
        lastActiveAt: new Date(),
        revokedAt: null, // اگر قبلاً حذف شده بود، با ورود دوباره فعال می‌شود
        ...(device.name ? { name: device.name } : {}),
        ...(device.platform ? { platform: device.platform } : {}),
        ...(device.userAgent ? { userAgent: device.userAgent } : {}),
      })
      .where(eq(devices.id, deviceRow.id))

    await db
      .update(sessions)
      .set({ revokedAt: new Date(), revokedReason: 'relogin' })
      .where(and(eq(sessions.deviceId, deviceRow.id), isNull(sessions.revokedAt)))
  } else {
    const [created] = await db
      .insert(devices)
      .values({
        userId: user.id,
        fingerprint: device.fingerprint,
        name: device.name ?? 'دستگاه بدون نام',
        platform: device.platform ?? 'web',
        userAgent: device.userAgent ?? null,
      })
      .returning()
    deviceRow = created
  }

  // ۲) ساخت نشست + refresh token
  const refreshToken = randomToken(48)
  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      deviceId: deviceRow.id,
      refreshHash: sha256(refreshToken),
      ip: ip ?? null,
      userAgent: device.userAgent ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    })
    .returning()

  const accessToken = await signAccessToken({
    sub: user.id,
    dev: deviceRow.id,
    ses: session.id,
    tv: user.tokenVersion,
  })

  return { accessToken, refreshToken, user, session, device: deviceRow }
}

/**
 * چرخش refresh token:
 *  - توکن درست و فعال → توکن جدید صادر و قدیمی می‌سوزد (rotate)
 *  - توکنی که قبلاً استفاده و rotate شده دوباره ارائه شود → «سرقت» →
 *    کل خانواده‌ی آن نشست (همه‌ی توکن‌های نسل آن) فوراً باطل می‌شود
 */
export async function rotateSession(
  refreshToken: string,
  ip?: string | null,
): Promise<{ accessToken: string; refreshToken: string; user: UserRow; session: SessionRow }> {
  const hash = sha256(refreshToken)
  const row = await db.query.sessions.findFirst({ where: eq(sessions.refreshHash, hash) })

  if (row) {
    if (row.revokedAt) {
      throw Err.unauthorized('نشست شما بسته شده است؛ دوباره وارد شوید.')
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw Err.unauthorized('نشست شما منقضی شده است؛ دوباره وارد شوید.')
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) })
    if (!user) throw Err.unauthorized()
    if (user.bannedAt) throw Err.banned()

    const newRefreshToken = randomToken(48)

    // شرط «hash هنوز همان باشد» برای جلوگیری از race بین دو refresh هم‌زمان
    const [updated] = await db
      .update(sessions)
      .set({
        refreshHash: sha256(newRefreshToken),
        lastUsedAt: new Date(),
        rotatedAt: new Date(),
        ...(ip ? { ip } : {}),
      })
      .where(
        and(
          eq(sessions.id, row.id),
          eq(sessions.refreshHash, hash),
          isNull(sessions.revokedAt),
        ),
      )
      .returning()

    if (!updated) {
      throw Err.unauthorized('نشست شما بسته شده است؛ دوباره وارد شوید.')
    }

    // hash قدیمی را برای پنجره‌ی تشخیص reuse نگه می‌داریم
    await redis.set(usedRtKey(hash), row.id, 'EX', REUSE_WINDOW_SECONDS)

    const accessToken = await signAccessToken({
      sub: user.id,
      dev: row.deviceId,
      ses: row.id,
      tv: user.tokenVersion,
    })

    return { accessToken, refreshToken: newRefreshToken, user, session: updated }
  }

  // نشستی با این hash نیست → اگر تا چند دقیقه پیش معتبر بوده، یعنی reuse
  const reusedSessionId = await redis.get(usedRtKey(hash))
  if (reusedSessionId) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date(), revokedReason: 'reuse_detected' })
      .where(eq(sessions.id, reusedSessionId))
    throw Err.unauthorized(
      'فعالیت مشکوکی در نشست شما شناسایی شد و نشست بسته شد؛ دوباره وارد شوید.',
    )
  }

  throw Err.unauthorized('نشست یافت نشد؛ دوباره وارد شوید.')
}

/** خروج از همین دستگاه */
export async function revokeSession(
  sessionId: string,
  userId: string,
  reason = 'logout',
): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
}

/**
 * خروج از همه‌ی دستگاه‌ها:
 * همه‌ی نشست‌ها باطل + token_version زیاد می‌شود → همه‌ی access token های
 * در دست جریان هم بلافاصله بی‌اعتبار می‌شوند.
 */
export async function revokeAllSessions(userId: string, reason = 'logout_all'): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))

  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

/** حذف یک دستگاه + همه‌ی نشست‌های آن */
export async function revokeDevice(userId: string, deviceId: string): Promise<boolean> {
  const device = await db.query.devices.findFirst({
    where: and(eq(devices.id, deviceId), eq(devices.userId, userId)),
  })
  if (!device) return false

  await db.update(devices).set({ revokedAt: new Date() }).where(eq(devices.id, deviceId))
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), revokedReason: 'device_removed' })
    .where(and(eq(sessions.deviceId, deviceId), isNull(sessions.revokedAt)))
  return true
}

/**
 * اعتبارسنجی کامل access token (بعد از چک امضا در guards):
 * کاربر هست؟ بن نیست؟ token_version با دیتابیس می‌خواند؟ نشست هنوز زنده است؟
 */
export async function validateAccess(ctx: {
  userId: string
  sessionId: string
  tokenVersion: number
}): Promise<{ user: UserRow; session: SessionRow }> {
  const user = await db.query.users.findFirst({ where: eq(users.id, ctx.userId) })
  if (!user) throw Err.unauthorized()
  if (user.bannedAt) throw Err.banned()

  if (user.tokenVersion !== ctx.tokenVersion) {
    throw Err.unauthorized('نشست‌های شما بسته شده‌اند؛ دوباره وارد شوید.')
  }

  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, ctx.sessionId) })
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw Err.unauthorized('نشست شما بسته شده است؛ دوباره وارد شوید.')
  }

  // به‌روزرسانی lastUsedAt حداکثر یک‌بار در دقیقه (نوشتن در هر درخواست لازم نیست)
  if (Date.now() - session.lastUsedAt.getTime() > 60_000) {
    await db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, session.id))
    await db.update(devices).set({ lastActiveAt: new Date() }).where(eq(devices.id, session.deviceId))
  }

  return { user, session }
}