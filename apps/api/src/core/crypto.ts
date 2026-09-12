import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** توکن تصادفی امن (برای refresh token) */
export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url')
}

/** مقایسه‌ی زمان-ثابت برای جلوگیری از timing attack */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** کد عددی OTP با تولید رمزنگارانه (بدون bias) */
export function randomOtpCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) code += String(randomInt(0, 10))
  return code
}