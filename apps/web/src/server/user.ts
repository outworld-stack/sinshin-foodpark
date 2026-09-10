// src/server/user.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getLiveTrackingEnabled } from './admin'

// ═══════════════ تایپ‌ها ═══════════════

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  date: Date;
  description: string;
  orderId?: string | null;
}

export interface UserDevice {
  id: string;
  deviceName: string;
  lastActive: Date;
  isCurrent: boolean;
}

export interface OrderItem {
  productId: string;
  sizeId?: string | null;
  sizeName?: string | null;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderBreakdown {
  foodTotal: number
  discount: number
  walletDeduction: number
  deliveryFee: number
  totalAmount: number
  amountPaidOnline: number
}

export interface UserOrder {
  id: string;
  date: Date;
  totalAmount: number;
  itemCount: number;
  address: string | null;
  courierName: string | null;
  courierPhone: string | null;
  status: 'PAID' | 'CONFIRMED' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELED';
  deliveryType: 'DELIVERY' | 'DINE_IN';
  items: OrderItem[];
  courierLocation?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  referralProfit: number;
  userFeedback?: string | null;
  customerNote?: string | null;
  paymentStatus: 'SUCCESS' | 'FAILED';
  breakdown?: OrderBreakdown | null;
}

export interface UserAddress {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
}

export interface UserReferral {
  id: string;
  phone: string;
  registerDate: Date;
  totalOrders: number;
  totalSpent: number;
  myProfit: number;
}

export interface UserProfile {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  walletBalance: number;
  referralCode: string;
  referralLink: string;
  referrerCode?: string | null;
  totalReferralProfit: number;
  joinedAt: Date;
  devices: UserDevice[];
  recentOrders: UserOrder[];
  allOrders: UserOrder[];
  addresses: UserAddress[];
  myReferrals: UserReferral[];
  walletTransactions: WalletTransaction[];
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface AdminReview {
  id: string
  orderId: string
  productId: string
  productName: string
  firstName?: string | null
  lastName?: string | null
  phone: string
  comment: string
  date: Date
  status: ReviewStatus
}

// ═══════════════ داده‌ی موک — تک‌نمونه‌ی سراسری ═══════════════
// در حالت توسعه، این فایل ممکنه چند بار ارزیابی بشه و چند نمونه‌ی جدا بسازه
// (همون باگی که لاگ‌هاش رو دیدی: push می‌شد به یکی، خوانده می‌شد از اونیکی!)
// با globalThis همه‌ی نمونه‌ها به همون یک داده وصل می‌شن — همیشه.

const __MOCK_KEY = Symbol.for('sinshin.mock.state')
const __g = globalThis as Record<symbol, { mockUser: UserProfile; adminReviews: AdminReview[] } | undefined>

if (!__g[__MOCK_KEY]) {
  __g[__MOCK_KEY] = {
    mockUser: {
      id: 'usr-1',
      phone: '09120000000',
      walletBalance: 150000,
      referralCode: 'SIN-ALI123',
      referralLink: 'https://localhost:3000/?ref=SIN-ALI123',
      referrerCode: 'SIN-MOHAMMAD',
      totalReferralProfit: 124000,
      joinedAt: new Date('2024-01-15'),
      devices: [
        { id: 'dev-1', deviceName: 'iPhone 13 Pro (Safari)', lastActive: new Date(), isCurrent: true },
        { id: 'dev-2', deviceName: 'Windows PC (Chrome)', lastActive: new Date('2024-06-10'), isCurrent: false },
      ],
      addresses: [
        { id: 'addr-1', title: 'خانه', address: 'تهران، سعادت‌آباد، خیابان ۴، پلاک ۱۲', lat: 35.776, lng: 51.414 },     // ~۹.۸ کیلومتر → ناحیه ۱۰
        { id: 'addr-2', title: 'محل کار', address: 'تهران، ولیعصر، نزدیک پارک ساعی، پلاک ۸', lat: 35.700, lng: 51.400 },  // ~۱.۵ کیلومتر → ناحیه ۵
        { id: 'addr-3', title: 'ویلا (شمال)', address: 'کرج، مهرشهر، بلوار ارم، پلاک ۴۵', lat: 35.850, lng: 51.010 },    // ~۳۲ کیلومتر → بیرونی
      ],
      walletTransactions: [
        { id: 'wt-1', type: 'WITHDRAW', amount: 100000, date: new Date('2024-06-01'), description: 'پرداخت سفارش #ord-1', orderId: null },
        { id: 'wt-2', type: 'WITHDRAW', amount: 220000, date: new Date('2024-06-20'), description: 'پرداخت سفارش #ord-1', orderId: 'ord-1' },
        { id: 'wt-3', type: 'DEPOSIT', amount: 50000, date: new Date('2024-05-15'), description: 'سود معرفی دوستان', orderId: null },
        { id: 'wt-4', type: 'WITHDRAW', amount: 150000, date: new Date('2024-07-01'), description: 'پرداخت سفارش #ord-1', orderId: null },
        { id: 'wt-5', type: 'WITHDRAW', amount: 95000, date: new Date('2024-06-18'), description: 'پرداخت سفارش #ord-2', orderId: 'ord-2' },
        { id: 'wt-6', type: 'WITHDRAW', amount: 200000, date: new Date('2024-04-01'), description: 'پرداخت سفارش #ord-1', orderId: null },
        { id: 'wt-7', type: 'WITHDRAW', amount: 240000, date: new Date('2024-05-01'), description: 'پرداخت سفارش #ord-3', orderId: 'ord-3' },
      ],
      recentOrders: [
        {
          id: 'ord-1',
          date: new Date('2024-06-20'),
          totalAmount: 220000,
          itemCount: 2,
          address: 'تهران، سعادت‌آباد، پلاک ۱۲',
          courierName: 'محمد پیک',
          courierPhone: '09121112233',
          status: 'ON_THE_WAY',
          deliveryType: 'DELIVERY',
          items: [
            { productId: 'p-1', name: 'پیتزا پپرونی', quantity: 1, price: 185000 },
            { productId: 'p-5', name: 'نوشیدنی کوکاکولا', quantity: 1, price: 35000 }
          ],
          courierLocation: { lat: 35.775, lng: 51.410 },
          customerLocation: { lat: 35.776, lng: 51.414 },
          referralProfit: 22000,
          userFeedback: null,
          paymentStatus: 'SUCCESS'
        },
        {
          id: 'ord-2',
          date: new Date('2024-06-18'),
          totalAmount: 95000,
          itemCount: 1,
          address: null,
          courierName: null,
          courierPhone: null,
          status: 'DELIVERED',
          deliveryType: 'DINE_IN',
          items: [
            { productId: 'p-3', name: 'برگر کلاسیک', quantity: 1, price: 95000 }
          ],
          referralProfit: 9500,
          userFeedback: "غذا بسیار خوشمزه و سریع آماده شد.",
          paymentStatus: 'SUCCESS'
        },
      ],
      allOrders: [
        { id: 'ord-1', date: new Date('2024-06-20'), totalAmount: 220000, itemCount: 2, address: 'تهران، سعادت‌آباد، پلاک ۱۲', courierName: 'محمد پیک', courierPhone: '09121112233', status: 'ON_THE_WAY', deliveryType: 'DELIVERY', items: [{ productId: 'p-1', name: 'پیتزا پپرونی', quantity: 1, price: 185000 }, { productId: 'p-5', name: 'نوشیدنی کوکاکولا', quantity: 1, price: 35000 }], courierLocation: { lat: 35.775, lng: 51.410 }, customerLocation: { lat: 35.776, lng: 51.414 }, referralProfit: 22000, userFeedback: null, paymentStatus: 'SUCCESS' },
        { id: 'ord-2', date: new Date('2024-06-18'), totalAmount: 95000, itemCount: 1, address: null, courierName: null, courierPhone: null, status: 'DELIVERED', deliveryType: 'DINE_IN', items: [{ productId: 'p-3', name: 'برگر کلاسیک', quantity: 1, price: 95000 }], referralProfit: 9500, userFeedback: "غذا بسیار خوشمزه و سریع آماده شد.", paymentStatus: 'SUCCESS' },
        { id: 'ord-3', date: new Date('2024-05-01'), totalAmount: 240000, itemCount: 3, address: 'تهران، نیاوران، پلاک ۵', courierName: 'رضا پیک', courierPhone: '09123334455', status: 'DELIVERED', deliveryType: 'DELIVERY', items: [{ productId: 'p-2', name: 'پیتزا قارچ', quantity: 2, price: 165000 }, { productId: 'p-6', name: 'آب معدنی', quantity: 1, price: 15000 }], referralProfit: 24000, userFeedback: null, paymentStatus: 'SUCCESS' },
      ],
      myReferrals: [
        { id: 'ref-1', phone: '09121111111', registerDate: new Date('2024-05-10'), totalOrders: 3, totalSpent: 540000, myProfit: 54000 },
        { id: 'ref-2', phone: '09122222222', registerDate: new Date('2024-05-15'), totalOrders: 1, totalSpent: 120000, myProfit: 12000 },
        { id: 'ref-3', phone: '09123333333', registerDate: new Date('2024-06-01'), totalOrders: 2, totalSpent: 80000, myProfit: 8000 },
        { id: 'ref-4', phone: '09124444444', registerDate: new Date('2024-06-10'), totalOrders: 4, totalSpent: 150000, myProfit: 15000 },
        { id: 'ref-5', phone: '09125555555', registerDate: new Date('2024-07-01'), totalOrders: 1, totalSpent: 50000, myProfit: 5000 },
        { id: 'ref-6', phone: '09126666666', registerDate: new Date('2024-07-05'), totalOrders: 5, totalSpent: 200000, myProfit: 20000 },
        { id: 'ref-7', phone: '09127777777', registerDate: new Date('2024-07-10'), totalOrders: 2, totalSpent: 100000, myProfit: 10000 },
      ]
    },
    adminReviews: [
      {
        id: 'rev-1', orderId: 'ord-2', productId: 'p-3', productName: 'برگر کلاسیک',
        firstName: 'سارا', lastName: 'محمدی', phone: '09121112233',
        comment: 'برگر فوق‌العاده بود! کیفیت گوشت عالیه.', date: new Date('2024-06-18'), status: 'pending',
      },
      {
        id: 'rev-2', orderId: 'ord-1', productId: 'p-1', productName: 'پیتزا پپرونی',
        firstName: null, lastName: null, phone: '09123334455',
        comment: 'پیتزا گرم و تازه رسید، ممنون.', date: new Date('2024-06-20'), status: 'pending',
      },
      {
        id: 'rev-3', orderId: 'ord-3', productId: 'p-2', productName: 'پیتزا قارچ',
        firstName: 'علی', lastName: null, phone: '09125556677',
        comment: 'کیفیت قابل قبول نبود.', date: new Date('2024-06-15'), status: 'rejected',
      },
      {
        id: 'rev-4', orderId: 'ord-1', productId: 'p-1', productName: 'پیتزا پپرونی',
        firstName: 'علی', lastName: 'رضایی', phone: '09121110000',
        comment: 'بهترین پیتزای شهر! خمیرش فوق‌العاده نازه.', date: new Date('2024-06-20'), status: 'approved',
      },
      {
        id: 'rev-5', orderId: 'ord-3', productId: 'p-1', productName: 'پیتزا پپرونی',
        firstName: null, lastName: null, phone: '09123556789',
        comment: 'ارسال سریع و بسته‌بندی تمیز بود.', date: new Date('2024-06-22'), status: 'approved',
      },
    ],
  }
}

// همه‌ی نمونه‌های این ماژول (هر تعداد که توسعه بسازه) به همین یک داده وصلن
export const mockUser: UserProfile = __g[__MOCK_KEY]!.mockUser
export const adminReviews: AdminReview[] = __g[__MOCK_KEY]!.adminReviews

// ═══════════════ توابع سروری ═══════════════

export const getUserProfile = createServerFn({ method: 'GET' }).handler(async () => {
  return mockUser;
});

export const updateUserProfile = createServerFn({ method: 'POST' })
  .validator(z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.email("ایمیل معتبر نیست").or(z.literal('')).optional(),
  }))
  .handler(async ({ data }) => {
    Object.assign(mockUser, data);
    return { success: true, user: mockUser };
  });

export const addUserAddress = createServerFn({ method: 'POST' })
  .validator(z.object({
    title: z.string(),
    address: z.string(),
    lat: z.number(),
    lng: z.number()
  }))
  .handler(async ({ data }) => {
    const newAddress = { id: `addr-${Date.now()}`, ...data };
    mockUser.addresses.push(newAddress);
    return { success: true, addresses: mockUser.addresses };
  });

export const updateUserAddress = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string(),
    title: z.string(),
    address: z.string(),
    lat: z.number(),
    lng: z.number()
  }))
  .handler(async ({ data }) => {
    const index = mockUser.addresses.findIndex(a => a.id === data.id);
    if (index !== -1) {
      mockUser.addresses[index] = { ...mockUser.addresses[index], ...data };
    }
    return { success: true, addresses: mockUser.addresses };
  });

export const deleteUserAddress = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    mockUser.addresses = mockUser.addresses.filter(a => a.id !== data.id);
    return { success: true, addresses: mockUser.addresses };
  });

export const getOrderDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const order = mockUser.allOrders.find(o => o.id === data.id);
    if (!order) return null;
    return order;
  });

// سینک وضعیت/اطلاعات روی کپیِ کاربر — پنل ادمین صدا می‌زند (موک: سفارش دو کپی دارد)
export function syncUserOrder(orderId: string, patch: {
  status?: UserOrder['status']
  courierName?: string | null
  courierPhone?: string | null
}): void {
  const order = mockUser.allOrders.find(o => o.id === orderId)
  if (!order) return
  if (patch.status !== undefined) order.status = patch.status
  if (patch.courierName !== undefined) order.courierName = patch.courierName
  if (patch.courierPhone !== undefined) order.courierPhone = patch.courierPhone
}

export const confirmOrderDelivery = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const order = mockUser.allOrders.find(o => o.id === data.orderId);
    const recentOrder = mockUser.recentOrders.find(o => o.id === data.orderId);
    if (order) order.status = 'DELIVERED';
    if (recentOrder) recentOrder.status = 'DELIVERED';
    return { success: true };
  });

// فلگ نمایش آنلاین پیک — از تنظیمات ادمین
export const getLiveTracking = createServerFn({ method: 'GET' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async () => {
    const settings = await getLiveTrackingEnabled()
    return { isEnabled: settings.isEnabled }
  });

// ─── نظرات با وضعیت سه‌حالته (آیتم ۹) ───

// محصولاتِ نظرداده‌شده‌ی یک سفارش — برای نمایش وضعیت چیپ‌ها
export const getOrderReviewedProducts = createServerFn({ method: 'GET' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    return { productIds: adminReviews.filter(r => r.orderId === data.orderId).map(r => r.productId) }
  })

// ثبت نظر — به‌ازای محصول انتخابی
export const submitOrderFeedback = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string(), productId: z.string(), feedback: z.string().min(1).max(500) }))
  .handler(async ({ data }) => {
    const order = mockUser.allOrders.find(o => o.id === data.orderId)
    if (!order) return { success: false, message: 'سفارش یافت نشد' }

    const item = order.items.find(i => i.productId === data.productId)
    if (!item) return { success: false, message: 'این محصول در سفارش شما نیست' }

    const already = adminReviews.some(r => r.orderId === order.id && r.productId === item.productId)
    if (already) return { success: false, message: 'برای این محصول قبلاً نظر ثبت کرده‌اید' }

    adminReviews.push({
      id: `rev-${Date.now()}`,
      orderId: order.id,
      productId: item.productId,
      productName: item.name,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      phone: mockUser.phone,
      comment: data.feedback,
      date: new Date(),
      status: 'pending',
    })
    return { success: true }
  })

export const moderateReview = createServerFn({ method: 'POST' })
  .validator(z.object({ reviewId: z.string(), action: z.enum(['approve', 'reject']) }))
  .handler(async ({ data }) => {
    const review = adminReviews.find(r => r.id === data.reviewId)
    if (!review) return { success: false }
    review.status = data.action === 'approve' ? 'approved' : 'rejected'
    return { success: true }
  })

// همه نظرات برای پنل ادمین
export const getAdminReviews = createServerFn({ method: 'GET' }).handler(async () => {
  return adminReviews
})

// نظرات تاییدشده محصول (صفحه محصول)
export const getApprovedProductReviews = createServerFn({ method: 'GET' })
  .validator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    return adminReviews.filter(r => r.status === 'approved' && r.productId === data.productId)
  })