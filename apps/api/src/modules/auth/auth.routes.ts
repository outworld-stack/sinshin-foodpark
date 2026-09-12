import { Elysia, t } from 'elysia'

import { env } from '../../core/env'
import { Err } from '../../core/errors'
import { getAuthContext, parseCookies, serializeCookie } from '../../core/guards'
import { normalizePhone, toEnglishDigits } from '../../core/phone'
import * as auth from './auth.service'
import * as sessionService from './session.service'

const RT_COOKIE = 'sinshin_rt'
const RT_MAX_AGE = env.sessionTtlDays * 24 * 60 * 60

function rtCookie(token: string): string {
  return serializeCookie(RT_COOKIE, token, {
    maxAge: RT_MAX_AGE,
    httpOnly: true,
    secure: env.isProd, // در dev خاموش تا روی http://localhost:3010 هم کار کند
    sameSite: 'Lax',
    path: '/',
  })
}

const clearRtCookie = serializeCookie(RT_COOKIE, '', { maxAge: 0, httpOnly: true, path: '/' })

const FINGERPRINT_RE = /^[A-Za-z0-9_-]{8,64}$/

/** کد OTP دقیقاً ۴ رقمی است — هم‌قِد ورودی فرانت (login.tsx) */
const OTP_RE = /^\d{4}$/

/**
 * فکتوری مسیرهای auth — هر بار یک نمونه‌ی تازه می‌سازد تا بدون مشکل تایپ/دوباره‌ثبتی،
 * هم زیر /auth و هم زیر /api قابل mount باشد.
 */
export const buildAuthRoutes = () =>
  new Elysia({ prefix: '/auth' })
    // ── چکِ سبک — قبل از ارسال کد؛ بدون هزینه‌ی پیامک ──
    // قرارداد فرانت (checkIsNewUser): کاربر جدیده؟ قوانین لازمه؟ نقشش چیه؟
    .post(
      '/check',
      async ({ body }) => {
        const phone = normalizePhone(body.phone)
        if (!phone) throw Err.validation('شماره موبایل معتبر نیست.')
        return auth.checkPhone(phone)
      },
      {
        body: t.Object({ phone: t.String() }),
        detail: {
          tags: ['auth'],
          summary: 'چک کاربر قبل از ارسال کد (بدون پیامک)',
          description: 'برای گیت قوانین/کد معرف قبل از هزینه‌ی SMS و تشخیص نقش.',
        },
      },
    )

    // ── درخواست کد ورود ──
    .post(
      '/otp/request',
      async ({ body, set }) => {
        const phone = normalizePhone(body.phone)
        if (!phone) throw Err.validation('شماره موبایل معتبر نیست.')

        const r = await auth.requestOtp(phone)
        set.status = 200
        return {
          sent: true,
          cooldownSeconds: r.cooldownSeconds,
          ...(r.devCode ? { devCode: r.devCode } : {}),
        }
      },
      {
        body: t.Object({ phone: t.String() }),
        detail: { tags: ['auth'], summary: 'درخواست کد ورود (OTP)' },
      },
    )

    // ── تأیید کد و ورود ──
    .post(
      '/otp/verify',
      async ({ body, headers, set }) => {
        const phone = normalizePhone(body.phone)
        if (!phone) throw Err.validation('شماره موبایل معتبر نیست.')

        const code = toEnglishDigits(body.code).replace(/\s+/g, '')
        if (!OTP_RE.test(code)) throw Err.validation('کد وارد شده معتبر نیست.')

        if (!FINGERPRINT_RE.test(body.device.fingerprint)) {
          throw Err.validation('شناسه دستگاه نامعتبر است.')
        }

        const ip = headers['x-forwarded-for']?.split(',')[0]?.trim() ?? null

        const result = await auth.loginWithOtp(
          phone,
          code,
          {
            fingerprint: body.device.fingerprint,
            name: body.device.name,
            platform: body.device.platform,
            userAgent: headers['user-agent'] ?? null,
          },
          ip,
          {
            refCode: body.refCode ?? null,
            termsAccepted: body.termsAccepted ?? false,
            termsVersion: body.termsVersion ?? null,
          },
        )

        set.headers['set-cookie'] = rtCookie(result.refreshToken)
        set.status = 200
        return {
          accessToken: result.accessToken,
          expiresIn: env.accessTokenTtlMinutes * 60,
          isNewUser: result.isNewUser,
          user: auth.publicUser(result.user),
          device: { id: result.device.id, name: result.device.name },
        }
      },
      {
        body: t.Object({
          phone: t.String(),
          code: t.String({ minLength: 4, maxLength: 4 }),
          device: t.Object({
            fingerprint: t.String({ minLength: 8, maxLength: 64 }),
            name: t.Optional(t.String({ maxLength: 100 })),
            platform: t.Optional(t.String({ maxLength: 20 })),
          }),
          // ⬅ قرارداد ثبت‌نام فرانت: کد معرف + پذیرش قوانین (فقط کاربر جدید)
          refCode: t.Optional(t.Nullable(t.String({ maxLength: 20 }))),
          termsAccepted: t.Optional(t.Boolean()),
          termsVersion: t.Optional(t.Nullable(t.String({ maxLength: 20 }))),
        }),
        detail: { tags: ['auth'], summary: 'تأیید کد و ورود (refresh در کوکی HttpOnly)' },
      },
    )

    // ── تمدید access token (چرخش refresh) ──
    .post(
      '/refresh',
      async ({ request, set }) => {
        const token = parseCookies(request)[RT_COOKIE]
        if (!token) throw Err.unauthorized('نشستی پیدا نشد؛ دوباره وارد شوید.')

        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
        const r = await sessionService.rotateSession(token, ip)

        set.headers['set-cookie'] = rtCookie(r.refreshToken)
        return {
          accessToken: r.accessToken,
          expiresIn: env.accessTokenTtlMinutes * 60,
          user: auth.publicUser(r.user),
        }
      },
      { detail: { tags: ['auth'], summary: 'تمدید توکن (چرخش refresh token)' } },
    )

    // ── خروج از همین دستگاه ──
    .post(
      '/logout',
      async ({ request, set }) => {
        const ctx = await getAuthContext(request)
        await sessionService.revokeSession(ctx.sessionId, ctx.userId, 'logout')
        set.headers['set-cookie'] = clearRtCookie
        return { ok: true }
      },
      { detail: { tags: ['auth'], summary: 'خروج از دستگاه فعلی' } },
    )

    // ── خروج از همه‌ی دستگاه‌ها ──
    .post(
      '/logout-all',
      async ({ request, set }) => {
        const ctx = await getAuthContext(request)
        const { user } = await sessionService.validateAccess(ctx)
        await sessionService.revokeAllSessions(user.id)
        set.headers['set-cookie'] = clearRtCookie
        return { ok: true }
      },
      { detail: { tags: ['auth'], summary: 'خروج از همه‌ی دستگاه‌ها' } },
    )

    // ── پروفایل + دستگاه‌های من ──
    .get(
      '/me',
      async ({ request }) => {
        const ctx = await getAuthContext(request)
        const { user } = await sessionService.validateAccess(ctx)
        return auth.getAccount(user.id, ctx.deviceId)
      },
      { detail: { tags: ['auth'], summary: 'پروفایل کاربر و لیست دستگاه‌های فعال' } },
    )

    // ── حذف یک دستگاه ──
    .delete(
      '/devices/:id',
      async ({ request, params }) => {
        const ctx = await getAuthContext(request)
        const { user } = await sessionService.validateAccess(ctx)
        const ok = await sessionService.revokeDevice(user.id, params.id)
        if (!ok) throw Err.notFound('دستگاهی با این شناسه پیدا نشد.')
        return { ok: true }
      },
      {
        params: t.Object({ id: t.String() }),
        detail: { tags: ['auth'], summary: 'حذف یکی از دستگاه‌های من' },
      },
    )