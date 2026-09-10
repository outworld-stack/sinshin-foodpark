// src/routes/dashboard/route.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { DashboardLayout } from '#/components/DashboardLayout'
import { useAuthStore, ensureAuthHydrated } from '#/stores/authStore'

export const Route = createFileRoute('/dashboard')({
  // گارد — الگوی رسمی TanStack: throw redirect در beforeLoad
  beforeLoad: async ({ location }) => {
    // سرور تصمیمی نمی‌گیره — localStorage فقط سمت کلاینته
    if (typeof window === 'undefined') return
    await ensureAuthHydrated()
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: DashboardLayout,
})