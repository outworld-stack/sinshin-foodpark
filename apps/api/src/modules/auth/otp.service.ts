import { randomOtpCode, safeEqual, sha256 } from '../../core/crypto'
import { env } from '../../core/env'
import { Err } from '../../core/errors'
import { redis } from '../../core/redis'

const K = {
  code: (p: string) => `otp:code:${p}`,
  cooldown: (p: string) => `otp:cd:${p}`,
  attempts: (p: string) => `otp:att:${p}`,
  hour: (p: string) => `otp:h:${p}`,
  day: (p: string) => `otp:d:${p}`,
}

function smsProvider(): string {
  return (process.env.SMS_PROVIDER ?? '').trim().toLowerCase()
}

/** در dev (یا prod با SMS_PROVIDER=console) کد در پاسخ برمی‌گردد تا بدون پنل SMS تست کنی */
function canRevealCode(): boolean {
  return !env.isProd || smsProvider() === 'console'
}

async function deliverSms(phone: string, code: string): Promise<void> {
  if (!env.isProd || smsProvider() === 'console') {
    console.log(`[otp] کد ورود ${phone}: ${code}`)
    return
  }
  // ── نقطه‌ی اتصال سرویس پیامک (Kavenegar / SMS.ir) — Part بعدی ──
  throw new Error('[otp] SMS_PROVIDER در production تنظیم نشده است.')
}

export async function sendOtp(phone: string): Promise<{
  cooldownSeconds: number
  devCode?: string
}> {
  const { ttlSeconds: ttl, resendCooldownSeconds: cooldown } = env.otp

  // ۱) فاصله‌ی بین دو درخواست
  if (await redis.exists(K.cooldown(phone))) {
    throw Err.rateLimited(`کد قبلی هنوز معتبر است؛ ${cooldown} ثانیه دیگر تلاش کن.`, cooldown)
  }

  // ۲) سقف ساعتی و روزانه برای هر شماره
  const hourCount = Number((await redis.get(K.hour(phone))) ?? 0)
  if (hourCount >= env.otp.maxPerHourPerPhone) {
    throw Err.rateLimited('سقف درخواست کد در این ساعت پر شده است.', 3600)
  }
  const dayCount = Number((await redis.get(K.day(phone))) ?? 0)
  if (dayCount >= env.otp.maxPerDayPerPhone) {
    throw Err.rateLimited('سقف درخواست کد در امروز پر شده است.', 86400)
  }

  // ۳) تولید کد و ذخیره‌ی «هش» آن (نه خود کد) در Redis
  const code = randomOtpCode(6)
  const codeHash = sha256(`${code}:${phone}`)

  await redis
    .multi()
    .set(K.code(phone), codeHash, 'EX', ttl)
    .set(K.cooldown(phone), '1', 'EX', cooldown)
    .incr(K.hour(phone))
    .expire(K.hour(phone), 3600)
    .incr(K.day(phone))
    .expire(K.day(phone), 86400)
    .del(K.attempts(phone))
    .exec()

  await deliverSms(phone, code)

  return {
    cooldownSeconds: cooldown,
    ...(canRevealCode() ? { devCode: code } : {}),
  }
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const stored = await redis.get(K.code(phone))
  if (!stored) {
    throw Err.validation('کدی برای این شماره صادر نشده یا منقضی شده است.')
  }

  const attempts = Number((await redis.get(K.attempts(phone))) ?? 0)
  if (attempts >= env.otp.maxVerifyAttempts) {
    await redis.del(K.code(phone))
    throw Err.rateLimited('تعداد تلاش‌های ناموفق زیاد است؛ کد جدید بگیر.')
  }

  if (!safeEqual(stored, sha256(`${code}:${phone}`))) {
    await redis.incr(K.attempts(phone))
    await redis.expire(K.attempts(phone), env.otp.ttlSeconds)
    throw Err.validation('کد وارد شده صحیح نیست.')
  }

  // کد درست بود → مصرف شود
  await redis.del(K.code(phone))
}