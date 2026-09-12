// src/integrations/api/eden.ts
// کلاینت تایپ‌سیف بک‌اند (Elysia + Eden treaty).
//
// توپولوژی: همه‌چیز پشت یک دامنه است (Caddy) → مرورگر مستقیم و same-origin
// به /api/* می‌زند؛ کوکی HttpOnly ریفرش‌توکن بدون CORS جابه‌جا می‌شود.
// در dev روی host هم vite (فایل vite.config.ts) همین مسیر /api را پراکسی می‌کند.
//
// تایپ App فقط type-import است — در باندل فرانت هیچ کدی از بک‌اند نمی‌آید.
// (پکیج elysia در apps/web فقط برای تایپ‌های Eden است — devDependency؛
//  tsconfig با paths آن را به کپی apps/api هدایت می‌کند تا فقط یک کپی در
//  برنامه‌ی تایپ باشد.)
import { treaty } from '@elysiajs/eden'
import { useAuthStore } from '#/stores/authStore'
import type { App } from '../../../../api/src/index'

/** کلاینت خام — مسیرها تایپ‌سیف از خود API می‌آیند */
export const api = treaty<App>('/api', {
  // '/api' را همان‌طور نگه دار — پیشوند پروتکل اضافه نکن (relative same-origin)
  keepDomain: true,
  // تزریق داینامیک Bearer — توکن از authStore خوانده می‌شود (حافظه‌ای)
  onRequest(_path, options) {
    const token = useAuthStore.getState().accessToken
    if (token) {
      return {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      }
    }
  },
})

// ═══════════════ نرمال‌سازی خطا ═══════════════
// بک‌اند همه‌ی خطاها را به شکل { error: { code, message } } برمی‌گرداند؛
// این تابع پیام فارسی قابل‌نمایش استخراج می‌کند.

export function apiErrorMessage(error: unknown, fallback = 'خطایی رخ داد؛ دوباره تلاش کنید.'): string {
  if (error && typeof error === 'object') {
    const e = error as { value?: { error?: { message?: string } }; message?: string }
    const serverMessage = e.value?.error?.message
    if (serverMessage) return serverMessage
    if (e.message && !e.message.startsWith('[ Eden')) return e.message
  }
  return fallback
}

/** برای خطای RATE_LIMITED — چند ثانیه دیگر؟ (اگر سرور فرستاده باشد) */
export function apiRetryAfter(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const e = error as { value?: { error?: { code?: string; details?: { retryAfterSeconds?: number } } } }
    if (e.value?.error?.code === 'RATE_LIMITED') {
      const s = e.value.error.details?.retryAfterSeconds
      if (typeof s === 'number' && s > 0) return s
    }
  }
  return null
}

/** خطای نرمال‌شده — پیام فارسی سرور + retryAfter برای همگام‌سازی تایمرها */
export class ApiCallError extends Error {
  readonly retryAfter: number | null
  constructor(error: unknown) {
    super(apiErrorMessage(error))
    this.name = 'ApiCallError'
    this.retryAfter = apiRetryAfter(error)
  }
}

/** شکل پاسخ Eden — اتحاد موفق/خطا (data در خطا null و error در موفقیت null) */
interface EdenResult<T> {
  data: T | null
  error: unknown
}

/** نتیجه‌ی موفق را برمی‌گرداند؛ در خطا، ApiCallError با پیام فارسی پرتاب می‌کند */
export async function unwrap<T>(res: EdenResult<T> | Promise<EdenResult<T>>): Promise<T> {
  const r = await res
  if (r.error) throw new ApiCallError(r.error)
  return r.data as T
}

// ═══════════════ نقش‌ها ═══════════════
// بک‌اند: 'user' | 'admin' | 'superadmin' — فرانت: 'user' | 'admin'
// (ادمین۲ هنوز بک‌اند ندارد — پل موقت login.tsx تا مرحله‌ی ادمین)
export type ApiRole = 'user' | 'admin' | 'superadmin' | null

export function mapRole(role: ApiRole): 'user' | 'admin' {
  return role === 'admin' || role === 'superadmin' ? 'admin' : 'user'
}

// ═══════════════ چرخش refresh token ═══════════════
// تک‌پرواز (single-flight): هر تعداد فراخوان هم‌زمان، فقط یک درخواست refresh.

let refreshing: Promise<boolean> | null = null

/** با کوکی HttpOnly نشست را تمدید می‌کند؛ توکن جدید را در authStore می‌گذارد */
export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    try {
      const res = await api.auth.refresh.post()
      if (res.error || !res.data) return false
      const { accessToken, user } = res.data
      useAuthStore.getState().setAccessToken(accessToken)
      // نقش از سرور — منبع حقیقت
      const role = mapRole(user.role as ApiRole)
      if (useAuthStore.getState().role !== role) {
        useAuthStore.getState().login(role === 'admin', role)
      }
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/**
 * بوت‌استرپ نشست بعد از رفرش صفحه — فلگ‌های persist شده ممکن است کهنه باشند؛
 * با یک refresh واقعی (کوکی) توکن حافظه‌ای را زنده می‌کنیم یا state را می‌شوییم.
 */
export function initSession(): void {
  if (typeof window === 'undefined') return
  const s = useAuthStore.getState()
  if (!s.isAuthenticated || s.accessToken) return
  void refreshSession().then((ok) => {
    if (!ok) useAuthStore.getState().logout()
  })
}

/** خروج شبکه‌ای — نشست سمت سرور بسته و کوکی ریفرش پاک می‌شود */
export async function signOutRemote(): Promise<void> {
  try {
    // اگر access منقضی شده، اول تمدید تا بتوانیم logout معتبر بزنیم
    const hasToken = !!useAuthStore.getState().accessToken
    if (!hasToken) await refreshSession()
    await api.auth.logout.post()
  } catch {
    // حتی اگر سرور نپذیرفت، state سمت کلاینت پاک می‌شود
  }
}