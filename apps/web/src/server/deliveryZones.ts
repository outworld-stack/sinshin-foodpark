// src/server/deliveryZones.ts
// ناحیه‌های ارسال — هزینه پیک بر اساس فاصله‌ی آدرس مشتری از رستوران
// (آشپزخانه هم در فروشگاه است — مبدأ واحد)
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { mockUser } from './user'

// موقعیت رستوران — موک (بک: از تنظیمات)
export const RESTAURANT_LOCATION = { lat: 35.6892, lng: 51.3890 }

// ─── state — تک‌نمونه (همان الگوی user/admin) ───
interface DeliveryZone {
  radiusKm: number
  fee: number
}

const __ZONES_KEY = Symbol.for('sinshin.mock.deliveryZones')
const __zg = globalThis as Record<symbol, { zones: DeliveryZone[] } | undefined>

if (!__zg[__ZONES_KEY]) {
  // ناحیه‌های پیش‌فرض — موک
  __zg[__ZONES_KEY] = {
    zones: [
      { radiusKm: 5, fee: 35000 },
      { radiusKm: 10, fee: 55000 },
      { radiusKm: 15, fee: 75000 },
    ],
  }
}

const Z = __zg[__ZONES_KEY]!

// ─── فاصله‌ی واقعی (هِیورساین — کیلومتر) ───
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371 // شعاع زمین — کیلومتر
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const sortedZones = () => [...Z.zones].sort((a, b) => a.radiusKm - b.radiusKm)

// ─── هزینه‌ی ارسال برای آدرس — منطق واحد (نمایش و پرداخت هر دو) ───
// آدرس تهی → ناحیه‌ی داخلی (پایه) | بیرون از همه → ناحیه‌ی بیرونی
export function computeDeliveryFee(addressId: string | null | undefined): number {
  const zones = sortedZones()
  if (zones.length === 0) return 0
  if (!addressId) return zones[0].fee

  const address = mockUser.addresses.find(a => a.id === addressId)
  if (!address) return zones[0].fee

  const distance = haversineKm(RESTAURANT_LOCATION, { lat: address.lat, lng: address.lng })
  const zone = zones.find(z => distance <= z.radiusKm) ?? zones[zones.length - 1]
  return zone.fee
}

// ─── مدیریت ناحیه‌ها (ادمین اصلی + ادمین۲ — رابط در بسته ۲۹) ───

export const getDeliveryZones = createServerFn({ method: 'GET' }).handler(async () => {
  return { zones: sortedZones() }
})

export const addDeliveryZone = createServerFn({ method: 'POST' })
  .validator(z.object({
    radiusKm: z.number().min(0.5, 'شعاع حداقل ۰.۵ کیلومتر'),
    fee: z.number().min(0),
  }))
  .handler(async ({ data }) => {
    if (Z.zones.some(z => z.radiusKm === data.radiusKm)) {
      return { success: false, message: 'ناحیه با این شعاع از قبل موجود است' }
    }
    Z.zones.push({ ...data })
    return { success: true }
  })

export const removeDeliveryZone = createServerFn({ method: 'POST' })
  .validator(z.object({ radiusKm: z.number() }))
  .handler(async ({ data }) => {
    const idx = Z.zones.findIndex(z => z.radiusKm === data.radiusKm)
    if (idx === -1) return { success: false, message: 'ناحیه یافت نشد' }
    if (Z.zones.length <= 1) return { success: false, message: 'حداقل یک ناحیه لازم است' }
    Z.zones.splice(idx, 1)
    return { success: true }
  })