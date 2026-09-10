// src/server/checkout.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { baseProducts, getEffectivePrice, getSizeName } from './products'
import { mockUser, type UserOrder, type WalletTransaction, type OrderBreakdown } from './user'
import { pushLive } from './live-bridge'
import { getRestaurantOpen, queueOrder } from './admin'
import { computeDeliveryFee } from './deliveryZones'
import type { InvoiceData, RestaurantStatus } from '../types/site/checkout'

// --- ثابت‌های کسب‌وکار ---
const VALID_COUPON = 'SINSHIN20'
const COUPON_PERCENT = 20
const REFERRAL_PERCENT = 10
// آیتم ۱۰: سود معرف فقط از پرداخت آنلاین «غذاها»
const REFERRAL_INCLUDES_DELIVERY = false

// --- آیتم ۲۲: وضعیت رستوران — از تنظیمات ادمین ---
export const getRestaurantStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const settings = await getRestaurantOpen()
  return { isOpen: settings.isOpen, nextOpenTime: settings.nextOpenTime } satisfies RestaurantStatus
})

// --- جزئیات قیمت سبد (با ناحیه‌ی هوشمند ارسال) ---
export const getCheckoutDetails = createServerFn({ method: 'POST' })
  .validator(z.object({
    items: z.array(z.object({
      productId: z.string(),
      sizeId: z.string().nullable().optional(),
      quantity: z.number().min(1),
    })),
    deliveryType: z.enum(['DELIVERY', 'DINE_IN']),
    addressId: z.string().nullable().optional(),   // ⬅ برای محاسبه‌ی ناحیه
  }))
  .handler(async ({ data }) => {
    const cartItems = data.items.map(item => {
      const p = baseProducts.find(prod => prod.id === item.productId)
      if (!p) return null
      const unitPrice = getEffectivePrice(p, item.sizeId)
      return {
        id: p.id,
        sizeId: item.sizeId ?? null,
        sizeName: getSizeName(p, item.sizeId),
        name: p.name,
        finalPrice: unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      }
    }).filter(Boolean)

    const subtotal = (cartItems as { lineTotal: number }[]).reduce((sum, i) => sum + i.lineTotal, 0)
    // هزینه ارسال — ناحیه‌ی هوشمند بر اساس آدرس (آدرس تهی = ناحیه‌ی پایه)
    const deliveryFee = data.deliveryType === 'DELIVERY' ? computeDeliveryFee(data.addressId) : 0
    return { items: cartItems, subtotal, deliveryFee, total: subtotal + deliveryFee }
  })

// --- ثبت نهایی سفارش ---
export const processCheckout = createServerFn({ method: 'POST' })
  .validator(z.object({
    items: z.array(z.object({ productId: z.string(), sizeId: z.string().nullable().optional(), quantity: z.number().min(1) })),
    deliveryType: z.enum(['DELIVERY', 'DINE_IN']),
    useWallet: z.boolean(),
    addressId: z.string().optional().nullable(),
    customerNote: z.string().max(300).optional(),
    couponCode: z.string().optional().nullable(),
    gatewayId: z.string().nullable().optional(),   // ⬅ درگاه انتخابی (بک: initiate پرداخت)
  }))
  .handler(async ({ data }): Promise<{ orderCompleted: boolean; invoice: InvoiceData | null; paymentStatus: 'SUCCESS' | 'FAILED' }> => {
    // ۱. قیمت غذاها از سرور (با سایز انتخابی)
    let foodTotal = 0
    const orderItems: UserOrder['items'] = []
    for (const item of data.items) {
      const p = baseProducts.find(prod => prod.id === item.productId)
      if (!p) continue
      const unitPrice = getEffectivePrice(p, item.sizeId)
      foodTotal += unitPrice * item.quantity
      orderItems.push({
        productId: p.id,
        sizeId: item.sizeId ?? null,
        sizeName: getSizeName(p, item.sizeId) ?? undefined,
        name: p.name,
        quantity: item.quantity,
        price: unitPrice,
      })
    }

    // ۲. کوپن — اعتبارسنجی سمت سرور
    const discount = data.couponCode === VALID_COUPON ? Math.round(foodTotal * COUPON_PERCENT / 100) : 0
    const payableFood = foodTotal - discount

    // ۳. آیتم ۱۱: کسر اختیاری کیف پول — هر مبلغی که باشه
    const walletDeduction = data.useWallet ? Math.min(mockUser.walletBalance, payableFood) : 0
    // هزینه ارسال — ناحیه‌ی هوشمند بر اساس آدرس (منطق واحد با getCheckoutDetails)
    const deliveryFee = data.deliveryType === 'DELIVERY' ? computeDeliveryFee(data.addressId) : 0
    const totalAmount = payableFood + deliveryFee
    // آیتم ۸: هزینه پیک همیشه آنلاین
    const amountPaidOnline = (payableFood - walletDeduction) + deliveryFee

    // ۴. آیتم ۱۰: سود معرف فقط از پرداخت آنلاین
    const onlineFoodPayment = payableFood - walletDeduction
    const referralBase = REFERRAL_INCLUDES_DELIVERY ? amountPaidOnline : onlineFoodPayment
    const referralProfit = Math.round(referralBase * REFERRAL_PERCENT / 100)

    // ریز مبلغ فاکتور — روی سفارش ذخیره می‌شه 
    const breakdown: OrderBreakdown = {
      foodTotal, discount, walletDeduction, deliveryFee, totalAmount, amountPaidOnline,
    }

    // ۵. موک: ۱۵٪ ناموفق — مبلغ آنلاین صفر؟ درگاه اصلاً نیست، همیشه موفق (رفع F-6)
    const paymentStatus: 'SUCCESS' | 'FAILED' =
      amountPaidOnline === 0 ? 'SUCCESS' : (Math.random() > 0.15 ? 'SUCCESS' : 'FAILED')

    const newOrderId = `ord-${Date.now()}`
    const selectedAddress = data.addressId ? mockUser.addresses.find(a => a.id === data.addressId) : null
    const newOrder: UserOrder = {
      id: newOrderId,
      date: new Date(),
      totalAmount,
      itemCount: orderItems.reduce((sum, i) => sum + i.quantity, 0),
      address: data.deliveryType === 'DELIVERY' ? (selectedAddress?.address || 'آدرس نامشخص') : null,
      courierName: data.deliveryType === 'DELIVERY' ? 'در انتظار تخصیص پیک' : null,
      courierPhone: null,
      status: paymentStatus === 'SUCCESS' ? 'PAID' : 'CANCELED',
      deliveryType: data.deliveryType,
      items: orderItems,
      referralProfit: paymentStatus === 'SUCCESS' ? referralProfit : 0,
      userFeedback: null,
      customerNote: data.customerNote?.trim() || null,
      paymentStatus,
      breakdown: paymentStatus === 'SUCCESS' ? breakdown : null,
    }

    // ۶. ثبت فوری — موفق یا ناموفق
    mockUser.allOrders.unshift(newOrder)
    mockUser.recentOrders.unshift(newOrder)
    if (mockUser.recentOrders.length > 5) mockUser.recentOrders.pop()

    // ۷. فقط موفق: کیف پول + live
    if (paymentStatus === 'SUCCESS') {
      if (walletDeduction > 0) {
        mockUser.walletBalance -= walletDeduction
        const tx: WalletTransaction = {
          id: `wt-${Date.now()}`, type: 'WITHDRAW', amount: walletDeduction,
          date: new Date(), description: `پرداخت سفارش #${newOrderId}`, orderId: newOrderId,
        }
        mockUser.walletTransactions.unshift(tx)
      }

      // push به live ادمین۲
      pushLive({
        id: newOrderId,
        userPhone: mockUser.phone,
        userName: `${mockUser.firstName ?? ''} ${mockUser.lastName ?? ''}`.trim() || mockUser.phone,
        amount: totalAmount,
        date: new Date(),
        status: 'PAID',
        customerNote: data.customerNote?.trim() || null,
        noteSeen: !data.customerNote?.trim(),
        confirmedBy: null, confirmedByName: null,
        courierId: null, courierName: null, courierPhone: null, courierArrivedAt: null,
        courierSecurityEnabled: false, internalNote: null,
        breakdown: paymentStatus === 'SUCCESS' ? breakdown : null,
      })

      // ۸. آیتم صف: مغازه بسته‌ست؟ → سفارش منتظر
      const restaurantSettings = await getRestaurantOpen()
      if (!restaurantSettings.isOpen) {
        await queueOrder({ data: { orderId: newOrderId } })
      }
    }

    // ۹. خروجی
    if (paymentStatus === 'FAILED') {
      return { orderCompleted: false, invoice: null, paymentStatus }
    }

    const invoice: InvoiceData = {
      orderId: newOrderId,
      items: orderItems.map(i => ({ name: i.name, sizeName: i.sizeName ?? null, quantity: i.quantity, price: i.price })),
      foodTotal, discount, walletDeduction, deliveryFee, totalAmount,
      amountPaidOnline,
      deliveryType: data.deliveryType,
      customerNote: newOrder.customerNote,
    }
    return { orderCompleted: true, invoice, paymentStatus }
  })