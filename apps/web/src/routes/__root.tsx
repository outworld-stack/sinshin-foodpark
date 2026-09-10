// src/routes/__root.tsx
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { Toast } from '#/components/Toast'
import { RouteError, RouteNotFound } from '#/components/shared/RouteFallbacks'
import appCss from '#/styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { useThemeStore } from '#/stores/themeStore'
import { useEffect } from 'react'
import { captureRefFromUrl } from '#/utils/referralCapture'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'سین شین | فودپارک آنلاین' },
      { name: 'description', content: 'سفارش آنلاین غذا، پیتزا، فست‌فود و رستوران با تحویل سریع. ثبت‌نام با کد معرف و دریافت کیف پول.' },
      { name: 'keywords', content: 'سین شین, فودپارک, سفارش آنلاین غذا, فست فود, رستوران, پیتزا, کد معرف' },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:title', content: 'سین شین | فودپارک آنلاین' },
      { property: 'og:description', content: 'سفارش آنلاین غذا با تحویل سریع در فودپارک سین شین' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'fa_IR' },
      { 'twitter:card': 'summary_large_image' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    captureRefFromUrl()
    // استورها سطح ماژول زنده شدن — اینجا فقط کلاس تم سینک می‌شه
    const isDark = useThemeStore.getState().isDark
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('sinshin-theme');if(t&&t.indexOf('"isDark":true')!==-1)document.documentElement.classList.add('dark')}catch(e){}` }}
        />
        <HeadContent />
      </head>
      <body>
        <Toast />
        {children}
        <Scripts />
      </body>
    </html>
  )
}