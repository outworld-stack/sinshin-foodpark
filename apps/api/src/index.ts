import swagger from '@elysiajs/openapi'
import { sql } from 'drizzle-orm'
import { Elysia, ValidationError } from 'elysia'

import { db } from './db'
import { env } from './core/env'
import { AppError } from './core/errors'
import { redis } from './core/redis'
import { authRoutes } from './modules/auth/auth.routes'

async function health() {
  let databaseOk = false
  let redisOk = false
  try {
    await db.execute(sql`select 1`)
    databaseOk = true
  } catch (e) {
    console.error('[health] database:', (e as Error).message)
  }
  try {
    redisOk = (await redis.ping()) === 'PONG'
  } catch (e) {
    console.error('[health] redis:', (e as Error).message)
  }
  const ok = databaseOk && redisOk
  return {
    status: ok ? 'ok' : 'degraded',
    env: env.appEnv,
    checks: { database: databaseOk, redis: redisOk },
    time: new Date().toISOString(),
  }
}

/**
 * مسیرها را دو جا mount می‌کنیم (با و بدون پیشوند /api) تا مستقل از اینکه
 * Caddy پیشوند /api را حذف کند یا نه، هر دو شکل کار کند:
 *   /health و /auth/*        +    /api/health و /api/auth/*
 */
function mountApi(app: Elysia): Elysia {
  return app
    .get('/health', () => health(), {
      detail: { tags: ['system'], summary: 'سلامت سرویس' },
    })
    .group('/auth', (group) => authRoutes(group))
}

const app = new Elysia()
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status
      return {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      }
    }
    if (error instanceof ValidationError) {
      set.status = 422
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ورودی ارسالی معتبر نیست.',
          // جزئیات خطای اعتبارسنجی فقط در dev برمی‌گردد
          ...(env.isProd ? {} : { details: error.message }),
        },
      }
    }
    console.error('[unhandled]', error)
    set.status = 500
    return { error: { code: 'INTERNAL_ERROR', message: 'خطای داخلی سرور رخ داده است.' } }
  })
  .use(
    swagger({
      documentation: { info: { title: 'Sinshin Foodpark API', version: '0.3.0' } },
    }),
  )
  .get('/', () => ({
    service: 'sinshin-foodpark-api',
    env: env.appEnv,
    docs: '/swagger',
    health: '/health',
  }))
  .use(mountApi) // /health و /auth/*
  .use(new Elysia({ prefix: '/api' }).use(mountApi)) // /api/health و /api/auth/*

const port = Number(process.env.PORT ?? 3000)
app.listen(port)

console.log(`[api] ${env.appEnv} │ http://localhost:${port} │ health: /health │ docs: /swagger`)

// ── خاموشی تمیز (docker stop سیگنال SIGTERM می‌فرستد) ──
const shutdown = (signal: string) => {
  console.log(`[api] ${signal} دریافت شد — در حال خاموش شدن`)
  try { app.stop() } catch { /* noop */ }
  try { redis.disconnect() } catch { /* noop */ }
  process.exit(0)
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))