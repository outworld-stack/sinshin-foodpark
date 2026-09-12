import { SignJWT, jwtVerify } from 'jose'

import { env } from './env'

const ISSUER = 'sinshin-foodpark'
const secret = new TextEncoder().encode(env.jwtSecret)

export interface AccessClaims {
  /** شناسه کاربر */
  sub: string
  /** شناسه دستگاه */
  dev: string
  /** شناسه نشست */
  ses: string
  /** token_version کاربر — برای ابطال گروهی توکن‌ها */
  tv: number
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ dev: claims.dev, ses: claims.ses, tv: claims.tv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${env.accessTokenTtlMinutes}m`)
    .sign(secret)
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER })
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.dev !== 'string' ||
      typeof payload.ses !== 'string' ||
      typeof payload.tv !== 'number'
    ) {
      return null
    }
    return { sub: payload.sub, dev: payload.dev, ses: payload.ses, tv: payload.tv }
  } catch {
    return null
  }
}