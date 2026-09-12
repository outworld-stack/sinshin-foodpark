// src/utils/deviceId.ts
// شناسه‌ی پایدار دستگاه برای قرارداد ورود بک‌اند (apps/api — auth/otp/verify).
// fingerprint باید ~ /^[A-Za-z0-9_-]{8,64}$/ باشد → UUID استاندارد کاملاً می‌خورد.

const DEVICE_KEY = 'sinshin-device-id'

/** fingerprint پایدار — یک UUID که در localStorage می‌ماند */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr-placeholder'
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    // حالت privado/حافظه‌ی پر — هر بار یک شناسه‌ی تصادفی بهتر از خطاست
    return crypto.randomUUID()
  }
}

/** تشخیص پلتفرم از user-agent — با سقف ۲۰ کاراکتر بک‌اند */
function detectPlatform(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/android/i.test(ua)) return 'Android'
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac os x|macintosh/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'web'
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet'
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari'
  return 'Browser'
}

/** اطلاعات دستگاه برای بدنه‌ی verify — name حداکثر ۱۰۰ کاراکتر */
export function getDeviceInfo(): {
  fingerprint: string
  name: string
  platform: string
} {
  const fingerprint = getDeviceFingerprint()
  if (typeof window === 'undefined') {
    return { fingerprint, name: 'SSR', platform: 'web' }
  }
  const ua = navigator.userAgent
  const platform = detectPlatform(ua)
  const browser = detectBrowser(ua)
  return {
    fingerprint,
    platform,
    name: `${browser} • ${platform}`.slice(0, 100),
  }
}