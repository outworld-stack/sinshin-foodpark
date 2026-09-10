// src/routes/admin/route.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminLayout } from '#/components/AdminLayout'
import { useAuthStore, ensureAuthHydrated } from '#/stores/authStore'

// مسیرهای مجاز برای ادمین۲ — با دسترسی مشروط
const ADMIN2_ALLOWED_PREFIXES = [
  '/admin/admin2',
  '/admin/admin2/dashboard',
  '/admin/orders',
  '/admin/couriers',
  '/admin/products',   // مشروط به productsRead
  '/admin/users',      // مشروط به usersRead
  '/admin/settings',   // ⬅ فقط برای ناحیه‌های ارسال (مشترک)
]

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    // سرور تصمیمی نمی‌گیره
    if (typeof window === 'undefined') return
    await ensureAuthHydrated()
    const { role } = useAuthStore.getState()

    if (role !== 'admin' && role !== 'admin2') {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }

    if (role === 'admin' && location.pathname.startsWith('/admin/admin2')) {
      throw redirect({ to: '/admin' })
    }

    // ادمین۲ → مسیر ممنوع → live-orders خودش
    if (role === 'admin2' && !ADMIN2_ALLOWED_PREFIXES.some(p => location.pathname.startsWith(p))) {
      throw redirect({ to: '/admin/admin2/live-orders' })
    }
    // چک permissions دقیق سمت صفحه‌ها (PermissionGate) — اینجا گارد سطح مسیره
  },
  component: AdminLayout,
})