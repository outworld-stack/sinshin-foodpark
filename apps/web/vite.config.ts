import { defineConfig, type Plugin } from 'vite'
import httpProxy from 'http-proxy'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// ── پراکسی /api برای dev روی host ──
// هندلر SSR تان‌استک قبل از پراکسی داخلی vite همه‌ی درخواست‌ها را می‌بلعد؛
// بنابراین با یک پلاگین enforce:'pre' زودتر از آن ثبت می‌شویم تا مسیر /api
// به بک‌اند برسد (همان کاری که Caddy در حالت docker بر عهده دارد).
// کوکی HttpOnly ریفرش‌توکن هم بدون CORS جابه‌جا می‌شود چون مرورگر
// همه‌چیز را same-origin (پورت 3001) می‌بیند.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000'

function apiProxyPlugin(): Plugin {
  const proxy = httpProxy.createProxyServer({ target: apiTarget, xfwd: true })
  proxy.on('error', (err, _req, res) => {
    console.error(`[api-proxy] خطای اتصال به ${apiTarget}:`, err.message)
    // http-proxy در حالت ws پاسخ را Socket می‌دهد — اینجا فقط http داریم
    if ('statusCode' in res && !res.headersSent) {
      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: { code: 'BAD_GATEWAY', message: `بک‌اند روی ${apiTarget} در دسترس نیست — apps/api را با bun run dev روشن کنید.` } }))
    }
  })
  return {
    name: 'sinshin-api-proxy',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api')) {
          proxy.web(req, res)
          return
        }
        next()
      })
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // ⬅ باید اول باشد — تا پیش از هندلر SSR ثبت شود
    apiProxyPlugin(),
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config