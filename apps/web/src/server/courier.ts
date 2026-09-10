// src/server/courier.ts
// عملیات پیک — از طریق صفحه‌ی اسکن QR (پیک فقط گوشی خودش را دارد)
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { courierScanArrival } from './admin'
import { mockUser } from './user'

// اسکن QR توسط پیک → وضعیت: تاییدشده ← در مسیر (+ سینک برای دید مشتری)
export const courierScan = createServerFn({ method: 'POST' })
  .validator(z.object({
    orderId: z.string(),
    courierId: z.string().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    // منطق اصلی (وضعیت + چک امنیت QR) — همان تابع پنل ادمین
    const res = await courierScanArrival({
      data: { orderId: data.orderId, courierId: data.courierId ?? null },
    })
    if (!res.success) return res

    // سینک روی کپی کاربر (موک: سفارش دو جا ثبت می‌شود)
    const userOrder = mockUser.allOrders.find(o => o.id === data.orderId)
    if (userOrder && userOrder.status !== 'ON_THE_WAY') {
      userOrder.status = 'ON_THE_WAY'
    }
    return res
  })

// موقعیت لحظه‌ای پیک — ذخیره روی سفارش (مشتری با پولینگ می‌خواند)
export const updateCourierLocation = createServerFn({ method: 'POST' })
  .validator(z.object({
    orderId: z.string(),
    lat: z.number(),
    lng: z.number(),
  }))
  .handler(async ({ data }) => {
    const order = mockUser.allOrders.find(o => o.id === data.orderId)
    if (!order) return { success: false, message: 'سفارش یافت نشد' }
    order.courierLocation = { lat: data.lat, lng: data.lng }
    return { success: true }
  })