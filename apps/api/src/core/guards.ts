import { Err } from './errors'
import { verifyAccessToken, type AccessClaims } from './jwt'

export interface AuthContext {
  userId: string
  deviceId: string
  sessionId: string
  tokenVersion: number
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token.length > 0 ? token : null
}

/** پارس ساده‌ی هدر Cookie — بدون وابستگی خارجی */
export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get('cookie')
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (!k) continue
    try {
      out[k] = decodeURIComponent(v)
    } catch {
      out[k] = v
    }
  }
  return out
}

export interface CookieOptions {
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  path?: string
  sameSite?: 'Lax' | 'Strict' | 'None'
}

export function serializeCookie(
  name: string,
  value: string,
  opts: CookieOptions = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${opts.path ?? '/'}`)
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`)
  if (opts.httpOnly !== false) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`)
  return parts.join('; ')
}

/**
 * استخراج و تأیید access token — فقط امضای JWT را چک می‌کند.
 * اعتبارسنجی دیتابیسی (token_version و وضعیت نشست) در auth.service
 * انجام می‌شود (Part 3).
 */
export async function getAuthContext(request: Request): Promise<AuthContext> {
  const token = getBearerToken(request)
  if (!token) throw Err.unauthorized()
  const claims: AccessClaims | null = await verifyAccessToken(token)
  if (!claims) throw Err.unauthorized('نشست شما منقضی شده است؛ دوباره وارد شوید.')
  return {
    userId: claims.sub,
    deviceId: claims.dev,
    sessionId: claims.ses,
    tokenVersion: claims.tv,
  }
}