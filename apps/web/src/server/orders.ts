// src/server/orders.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { mockOrders } from './admin'
import { mockUser, type UserOrder } from './user'

// آیتم ۱۶: فلوی تغییر وضعیت — ادمین جلو می‌بره، مشتری با «تحویل گرفتم» نهایی می‌کنه
export const ORDER_FLOW = ['PAID', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED'] as const
export type OrderStatus = typeof ORDER_FLOW[number]

export const getOrderFlowStatus = createServerFn({ method: 'GET' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const order = [...mockOrders].find(o => o.id === data.orderId)
    if (!order) return null
    const currentIndex = ORDER_FLOW.indexOf(order.status as OrderStatus)
    return {
      current: order.status,
      next: currentIndex < ORDER_FLOW.length - 1 ? ORDER_FLOW[currentIndex + 1] : null,
    }
  })

// تغییر وضعیت سفارش توسط ادمین/ادمین۲ (آیتم ۱۶)
export const advanceOrderStatus = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    // سرورِ سفارش کاربر
    const userOrder = mockUser.allOrders.find(o => o.id === data.orderId)
    const adminOrder = mockOrders.find(o => o.id === data.orderId)
    if (!userOrder && !adminOrder) return { success: false }

    const current = (userOrder?.status ?? adminOrder?.status) as OrderStatus
    const idx = ORDER_FLOW.indexOf(current)
    if (idx < 0 || idx >= ORDER_FLOW.length - 1) return { success: false, message: 'وضعیت نهایی است' }

    const next = ORDER_FLOW[idx + 1]
    if (userOrder) userOrder.status = next
    if (adminOrder) adminOrder.status = next
    return { success: true, newStatus: next }
  })

// آیتم ۱۵: خروجی فاکتور برای چاپ/PDF (اشپزخانه یا فروش)
export const getOrderInvoice = createServerFn({ method: 'GET' })
  .validator(z.object({ orderId: z.string(), type: z.enum(['kitchen', 'sales']) }))
  .handler(async ({ data }) => {
    const order = mockUser.allOrders.find(o => o.id === data.orderId)
      ?? (() => { const ao = mockOrders.find(o => o.id === data.orderId); return ao as unknown as UserOrder | undefined })()
    if (!order) return null

    if (data.type === 'kitchen') {
      return {
        type: 'kitchen',
        orderId: order.id,
        date: order.date,
        items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
      }
    }
    return {
      type: 'sales',
      orderId: order.id,
      date: order.date,
      items: order.items,
      totalAmount: order.totalAmount,
      address: order.address,
      // آیتم ۱۷: QR — موک (بعداً real API). پیک با اسکن → صفحه مسیر
      qrUrl: `https://sinshin.com/courier/track/${order.id}`,
    }
  })