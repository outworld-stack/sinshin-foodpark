import Redis from 'ioredis'

import { env } from './env'

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 500, 10_000),
})

redis.on('error', (e) => {
  console.error('[redis] خطای اتصال:', e.message)
})

redis.on('connect', () => {
  console.log('[redis] اتصال برقرار شد')
})