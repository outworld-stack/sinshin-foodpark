// src/types/site/checkout.ts

export type DeliveryType = 'DELIVERY' | 'DINE_IN'
export type CouponStatus = 'NONE' | 'HAVE'

// آیتم ۲۲: وضعیت رستوران
export interface RestaurantStatus {
  isOpen: boolean
  nextOpenTime: string
}

// فاکتور پس از ثبت موفق (خروجی سرور)
export interface InvoiceData {
  orderId: string
  items: { name: string; sizeName?: string | null; quantity: number; price: number }[]
  foodTotal: number
  discount: number
  walletDeduction: number
  deliveryFee: number
  totalAmount: number
  amountPaidOnline: number
  deliveryType: DeliveryType
  customerNote?: string | null
}

// محاسبات نمایشی کلاینت — سرور مرجع نهایی قیمت‌هاست
export interface CheckoutCalculation {
  discount: number;
  payableFood: number;
  walletDeduction: number;
  deliveryFee: number;
  total: number;
  amountPaidOnline: number;
}

// پیلود ثبت سفارش
export interface CheckoutSubmitPayload {
  items: { productId: string; sizeId?: string | null; quantity: number }[]; deliveryType: DeliveryType;
  useWallet: boolean;
  addressId: string | null;
  customerNote: string;
  couponCode: string | null;
  gatewayId?: string | null
}