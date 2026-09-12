// src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'user' | 'admin' | 'admin2' | null;

interface AuthState {
  isAuthenticated: boolean
  isAdmin: boolean
  role: UserRole
  admin2Id: string | null
  activeOrderId: string | null
  /** access token واقعی — فقط در حافظه، هرگز persist نمی‌شود (XSS) */
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  login: (isAdmin?: boolean, role?: UserRole, admin2Id?: string | null, accessToken?: string | null) => void
  logout: () => void
  setActiveOrderId: (id: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isAdmin: false,
      role: null,
      admin2Id: null,
      activeOrderId: null,
      accessToken: null,
      setAccessToken: (token) => set({ accessToken: token }),
      login: (isAdmin = false, role = 'user' as UserRole, admin2Id = null, accessToken = null) =>
        set({ isAuthenticated: true, isAdmin, role, admin2Id, accessToken }),
      logout: () => {
        // خروج شبکه‌ای — نشست سمت سرور بسته و کوکی HttpOnly پاک شود.
        // dynamic import تا چرخه‌ی وابستگی (eden ↔ authStore) نشود؛
        // fire-and-forget است — UI منتظر نمی‌ماند.
        void import('#/integrations/api/eden')
          .then(({ signOutRemote }) => signOutRemote())
          .catch(() => { /* state مهم‌تر از نتیجه‌ی شبکه است */ })
        set({ isAuthenticated: false, isAdmin: false, role: null, admin2Id: null, activeOrderId: null, accessToken: null })
      },
      setActiveOrderId: (id) => set({ activeOrderId: id }),
    }),
    {
      name: 'sinshin-auth',
      skipHydration: true,
      // فقط فلگ‌ها persist می‌شوند — توکن هرگز وارد localStorage نمی‌شود
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        isAdmin: s.isAdmin,
        role: s.role,
        admin2Id: s.admin2Id,
        activeOrderId: s.activeOrderId,
      }),
    },
  ),
)

// زنده‌سازی سطح ماژول — سمت کلاینت، هم‌زمان، قبل از هر رندر/روت/گارد
if (typeof window !== 'undefined') {
  useAuthStore.persist.rehydrate()
}

// صبر تا زنده‌سازی — فقط برای گاردهای beforeLoad سمت کلاینت (سرور هرگز لمسش نمی‌کنه)
export function ensureAuthHydrated(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve()
  return new Promise((resolve) => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      unsub()
      resolve()
    })
    if (useAuthStore.persist.hasHydrated()) {
      unsub()
      resolve()
    }
  })
}