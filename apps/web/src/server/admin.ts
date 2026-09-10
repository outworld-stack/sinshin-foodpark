// src/server/admin.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { registerLivePusher } from './live-bridge'
import { jalaliFromISO, jalaliToGregorian, JALALI_MONTHS } from '../utils/persianDate'
import { type OrderBreakdown, syncUserOrder } from './user'


// ═══════════════ تایپ‌ها ═══════════════

export interface AdminUser {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  device: string;
  os: string;
  registeredAt: Date;
  walletBalance: number;
  totalOrders: number;
  totalSpent: number;
  referralsCount: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: Date;
}

export interface CourierDelivery {
  orderId: string
  address: string
  deliveredAt: Date
  amount: number
}

export interface CourierTrip {
  id: string
  startedAt: Date
  completedAt: Date
  deliveries: CourierDelivery[]
}

export interface CourierRecord {
  id: string
  name: string
  phone: string
  trips: CourierTrip[]
}

export interface AdminSession {
  loginAt: Date
  logoutAt: Date | null
  wasActive: boolean
}

export interface SubAdminPermissions {
  productsRead: boolean
  productsWrite: boolean
  usersRead: boolean
  usersWrite: boolean
  couriersRead: boolean
  couriersWrite: boolean
  mainCategoriesRead: boolean
  mainCategoriesWrite: boolean
  orderDetailsRead: boolean
}

export interface SubAdminRecord {
  id: string
  phone: string
  firstName: string
  lastName: string
  isActive: boolean
  ordersConfirmed: number
  permissions: SubAdminPermissions
  sessions: AdminSession[]
  lastActivity: Date
}

export interface LiveOrder {
  id: string
  userPhone: string
  userName: string
  amount: number
  date: Date
  status: 'PAID' | 'CONFIRMED' | 'ON_THE_WAY'
  customerNote: string | null
  noteSeen: boolean
  confirmedBy: string | null
  confirmedByName: string | null
  courierId: string | null
  courierName: string | null
  courierPhone: string | null
  courierArrivedAt: Date | null
  courierSecurityEnabled: boolean
  internalNote: string | null
  breakdown?: OrderBreakdown | null
}

export interface PrintJob {
  orderId: string
  type: 'kitchen' | 'sales'
  printedAt: Date | null
}

export interface AdminOrder {
  id: string;
  userPhone: string;
  userName: string;
  amount: number;
  date: Date;
  status: 'PAID' | 'CONFIRMED' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELED';
}

export interface AdminUserDetails extends AdminUser {
  referrerId?: string | null
  devices: { id: string, name: string, lastActive: Date, isCurrent: boolean }[]
  orders: { id: string, date: Date, amount: number, status: string, addressId: string | null }[]
  referrals: { id: string, phone: string, registeredAt: Date, totalOrders: number, orderIds?: string[] }[]
  logs: { id: string, type: string, action: string, timestamp: Date }[]
  addresses: { id: string, address: string, lat: number, lng: number, orderCount: number }[]
  chartData: { daily: any[], weekly: any[], monthly: any[], yearly: any[] }
}

export interface AdminOrderItem { id: string, name: string, quantity: number, price: number }
export interface AdminOrderDetails {
  id: string;
  date: Date;
  status: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  user: { id: string, firstName?: string | null, lastName?: string | null, phone: string };
  deliveryType: 'DELIVERY' | 'DINE_IN';
  address: { text: string, lat: number, lng: number } | null;
  courier: { name: string, phone: string } | null;
  paymentMethod: 'WALLET' | 'GATEWAY';
  items: AdminOrderItem[];
}

// ═══════════════ state — تک‌نمونه‌ی سراسری ═══════════════
// همان الگوی user.ts — در حالت توسعه ماژول ممکن است چند بار ارزیابی شود؛
// با globalThis همه‌ی نمونه‌ها به یک state وصل می‌شوند.
// رفع باگ: سشن ادمین۲ و سفارشات زنده با هر ادیت فایل از بین نمی‌روند.

interface AdminChartRow { date: string; sales: number; rawRegs: number; refRegs: number; views: number }
interface AdminRecentOrder { id: string; user: string; amount: number; status: string; date: Date }

interface AdminMockState {
  users: AdminUser[]
  logs: AuditLog[]
  deletedAddressIds: Set<string>
  chartData: AdminChartRow[]
  recentOrders: AdminRecentOrder[]
  orders: AdminOrder[]
  printQueue: PrintJob[]
  couriers: CourierRecord[]
  subAdmins: SubAdminRecord[]
  activeSession: { adminId: string; loginAt: Date } | null
  liveOrders: LiveOrder[]
  liveTrackingEnabled: boolean
  restaurantOpen: boolean
  nextOpenTime: string
  pendingQueue: LiveOrder[]
}

const __ADMIN_KEY = Symbol.for('sinshin.mock.admin')
const __ag = globalThis as Record<symbol, AdminMockState | undefined>

if (!__ag[__ADMIN_KEY]) {
  const devices = ['iPhone 16 Pro', 'iPhone 13', 'Samsung S24 Ultra', 'Samsung A52', 'Xiaomi Redmi Note 12', 'iPad Pro', 'MacBook Pro'];
  const oses = ['iOS 18', 'iOS 17', 'Android 14', 'Android 13', 'macOS 14'];

  __ag[__ADMIN_KEY] = {
    users: Array.from({ length: 45 }, (_, i) => {
      const hasName = i % 3 !== 0;
      return {
        id: `usr-${i + 1}`,
        phone: `0912${String(1000000 + i).padStart(7, '0')}`,
        firstName: hasName ? ['علی', 'محمد', 'سارا', 'زهرا', 'حسین'][i % 5] : undefined,
        lastName: hasName ? ['رضایی', 'محمدی', 'کریمی', 'احمدی'][i % 4] : undefined,
        status: i % 10 === 0 ? 'SUSPENDED' as const : 'ACTIVE' as const,
        device: devices[i % devices.length],
        os: oses[i % oses.length],
        registeredAt: new Date(2024, i % 12, (i % 28) + 1),
        walletBalance: Math.floor(Math.random() * 500000),
        totalOrders: Math.floor(Math.random() * 20),
        totalSpent: Math.floor(Math.random() * 2000000),
        referralsCount: Math.floor(Math.random() * 15),
      };
    }),
    logs: [
      { id: 'log-1', userId: 'usr-1', userName: '09120000000', action: 'تغییر نام و نام خانوادگی', timestamp: new Date(Date.now() - 86400000) },
      { id: 'log-2', userId: 'usr-1', userName: '09120000000', action: 'افزودن آدرس جدید (خانه)', timestamp: new Date(Date.now() - 172800000) },
      { id: 'log-3', userId: 'usr-2', userName: '09120000001', action: 'ثبت سفارش شماره ord-102', timestamp: new Date(Date.now() - 3600000) },
    ],
    deletedAddressIds: new Set<string>(),
    // داده‌ی نمودار — روزهای ماهِ جاری از ۱ تا آخر ماه (تقویمی)
    chartData: (() => {
      const now = new Date()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => ({
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
        sales: Math.floor(Math.random() * 5000000) + 500000,
        rawRegs: Math.floor(Math.random() * 50),
        refRegs: Math.floor(Math.random() * 30),
        views: Math.floor(Math.random() * 5000) + 500,
      }))
    })(),
    recentOrders: Array.from({ length: 25 }, (_, i) => ({
      id: `ord-${1000 + i}`,
      user: `0912${String(1000000 + i).padStart(7, '0')}`,
      amount: Math.floor(Math.random() * 300000) + 50000,
      status: ['PAID', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED'][i % 4],
      date: new Date(Date.now() - i * 3600000),
    })),
    orders: Array.from({ length: 45 }, (_, i) => {
      return {
        id: `ord-${1000 + i}`,
        userPhone: `0912${String(1000000 + i).padStart(7, '0')}`,
        userName: 'ناشناس',
        amount: Math.floor(Math.random() * 500000) + 50000,
        date: new Date(Date.now() - i * 3600000),
        status: ['PAID', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED', 'CANCELED'][i % 5] as AdminOrder['status'],
      };
    }),
    printQueue: [],
    couriers: [
      {
        id: 'cr-1', name: 'محمد پیک', phone: '09121112233',
        trips: [
          {
            id: 'trip-1', startedAt: new Date('2024-06-20T13:00'), completedAt: new Date('2024-06-20T14:20'),
            deliveries: [
              { orderId: 'ord-1001', address: 'تهران، سعادت‌آباد، پلاک ۱۲', deliveredAt: new Date('2024-06-20T13:30'), amount: 220000 },
              { orderId: 'ord-1002', address: 'کرج، گوهردشت، پلاک ۲۴۵', deliveredAt: new Date('2024-06-20T13:55'), amount: 180000 },
              { orderId: 'ord-1003', address: 'تهران، نیاوران، پلاک ۵', deliveredAt: new Date('2024-06-20T14:15'), amount: 310000 },
            ],
          },
          {
            id: 'trip-2', startedAt: new Date('2024-06-21T12:10'), completedAt: new Date('2024-06-21T13:05'),
            deliveries: [
              { orderId: 'ord-1004', address: 'اصفهان، چهارباغ بالا، پلاک ۸۹', deliveredAt: new Date('2024-06-21T12:45'), amount: 95000 },
            ],
          },
          {
            id: 'trip-3', startedAt: new Date('2024-06-22T18:50'), completedAt: new Date('2024-06-22T19:50'),
            deliveries: [
              { orderId: 'ord-1005', address: 'تهران، پونک، پلاک ۳۳', deliveredAt: new Date('2024-06-22T19:00'), amount: 410000 },
              { orderId: 'ord-1006', address: 'تهران، ولنجک، پلاک ۷', deliveredAt: new Date('2024-06-22T19:40'), amount: 150000 },
            ],
          },
        ],
      },
      {
        id: 'cr-2', name: 'رضا پیک', phone: '09123334455',
        trips: [
          {
            id: 'trip-4', startedAt: new Date('2024-06-21T13:00'), completedAt: new Date('2024-06-21T14:30'),
            deliveries: [
              { orderId: 'ord-1007', address: 'تهران، یوسف‌آباد، پلاک ۲۱', deliveredAt: new Date('2024-06-21T13:40'), amount: 260000 },
              { orderId: 'ord-1008', address: 'تهران، شهرک غرب، پلاک ۵۵', deliveredAt: new Date('2024-06-21T14:20'), amount: 175000 },
            ],
          },
        ],
      },
      {
        id: 'cr-3', name: 'علی پیک', phone: '09125556677',
        trips: [
          {
            id: 'trip-5', startedAt: new Date('2024-06-23T20:00'), completedAt: new Date('2024-06-23T20:40'),
            deliveries: [
              { orderId: 'ord-1009', address: 'تهران، تجریش، پلاک ۹', deliveredAt: new Date('2024-06-23T20:35'), amount: 330000 },
            ],
          },
        ],
      },
    ],
    subAdmins: [
      {
        id: 'sa-1', phone: '09129998877', firstName: 'نریمان', lastName: 'احمدی',
        isActive: true, ordersConfirmed: 34,
        permissions: {
          productsRead: false, productsWrite: false,
          usersRead: false, usersWrite: false,
          couriersRead: true, couriersWrite: false,
          mainCategoriesRead: false, mainCategoriesWrite: false, orderDetailsRead: false,
        },
        sessions: [
          { loginAt: new Date('2024-06-20T09:00'), logoutAt: new Date('2024-06-20T13:30'), wasActive: true },
        ],
        lastActivity: new Date(Date.now() - 3600000),
      },
      {
        id: 'sa-2', phone: '09127776655', firstName: 'سارا', lastName: 'کریمی',
        isActive: true, ordersConfirmed: 12,
        permissions: {
          productsRead: false, productsWrite: false,
          usersRead: false, usersWrite: false,
          couriersRead: true, couriersWrite: false,
          mainCategoriesRead: false, mainCategoriesWrite: false, orderDetailsRead: false,
        },
        sessions: [{ loginAt: new Date('2024-06-21T16:00'), logoutAt: null, wasActive: true }],
        lastActivity: new Date(Date.now() - 86400000),
      },
      {
        id: 'sa-3', phone: '09124445566', firstName: 'حسین', lastName: 'رضایی',
        isActive: false, ordersConfirmed: 0,
        permissions: {
          productsRead: false, productsWrite: false,
          usersRead: false, usersWrite: false,
          couriersRead: true, couriersWrite: false,
          mainCategoriesRead: false, mainCategoriesWrite: false, orderDetailsRead: false,
        },
        sessions: [],
        lastActivity: new Date(Date.now() - 7 * 86400000),
      },
    ],
    activeSession: null,
    liveOrders: [
      { id: 'ord-2001', userPhone: '09121112233', userName: 'مشتری تست ۱', amount: 245000, date: new Date(), status: 'PAID', customerNote: 'اگر پیک رسید کمی صبر کند.', noteSeen: false, confirmedBy: null, confirmedByName: null, courierId: null, courierName: null, courierPhone: null, courierArrivedAt: null, courierSecurityEnabled: false, internalNote: null },
      { id: 'ord-2002', userPhone: '09123334455', userName: 'مشتری تست ۲', amount: 180000, date: new Date(Date.now() - 600000), status: 'PAID', customerNote: null, noteSeen: true, confirmedBy: null, confirmedByName: null, courierId: null, courierName: null, courierPhone: null, courierArrivedAt: null, courierSecurityEnabled: false, internalNote: null },
    ],
    liveTrackingEnabled: false,
    restaurantOpen: true,
    nextOpenTime: '۱۱:۰۰ صبح',
    pendingQueue: [],
  }
}

const S = __ag[__ADMIN_KEY]!

// سازگاری با ایمپورت‌های بیرونی (orders.ts و ...)
export const mockUsers = S.users
export const mockOrders = S.orders
export const printQueue = S.printQueue

// شماره ادمین اصلی — موک (بک‌اند: env)
const MAIN_ADMIN_PHONES = ['09120000001']

// ═══════════════ توابع سروری ═══════════════

export const getAdminStats = createServerFn({ method: 'GET' }).handler(async () => {
  const totalRevenue = S.users.reduce((sum, u) => sum + u.totalSpent, 0);

  const latestUsers = S.users.slice(-15).reverse().map(u => ({
    id: u.id,
    phone: u.phone,
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'ناشناس',
    device: u.device,
    registeredAt: u.registeredAt,
  }));

  return {
    totalUsers: S.users.length,
    activeUsers: S.users.filter(u => u.status === 'ACTIVE').length,
    totalRevenue: totalRevenue,
    totalOrders: S.users.reduce((sum, u) => sum + u.totalOrders, 0),
    chartData: S.chartData,
    recentOrders: S.recentOrders,
    latestUsers
  };
});

export const getAdminUsers = createServerFn({ method: 'GET' })
  .validator(z.object({
    page: z.number(),
    limit: z.number(),
    search: z.string().optional(),
    device: z.string().optional(),
    status: z.string().optional(),
    sorts: z.array(z.object({
      field: z.enum(['registeredAt', 'walletBalance', 'totalSpent']),
      dir: z.enum(['asc', 'desc'])
    })).optional(),
  }))
  .handler(async ({ data }) => {
    let filtered = S.users;

    if (data.search) {
      filtered = filtered.filter(u => u.phone.includes(data.search!) || `${u.firstName || ''} ${u.lastName || ''}`.includes(data.search!));
    }
    if (data.device && data.device !== 'all') {
      filtered = filtered.filter(u => u.device === data.device);
    }
    if (data.status && data.status !== 'all') {
      filtered = filtered.filter(u => u.status === data.status);
    }

    if (data.sorts && data.sorts.length > 0) {
      const sorts = data.sorts;
      filtered = [...filtered].sort((a, b) => {
        for (const sort of sorts) {
          let cmp = 0;
          if (sort.field === 'walletBalance') cmp = a.walletBalance - b.walletBalance;
          else if (sort.field === 'totalSpent') cmp = a.totalSpent - b.totalSpent;
          else if (sort.field === 'registeredAt') cmp = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();

          if (cmp !== 0) {
            return sort.dir === 'asc' ? cmp : -cmp;
          }
        }
        return 0;
      });
    }

    const total = filtered.length;
    const users = filtered.slice((data.page - 1) * data.limit, data.page * data.limit);

    return { users, total };
  });

export const getUserAuditLogs = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    return S.logs.filter(l => l.userId === data.userId);
  });

export const toggleUserStatus = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const user = S.users.find(u => u.id === data.userId);
    if (user) {
      user.status = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      S.logs.unshift({
        id: `log-${Date.now()}`,
        userId: user.id,
        userName: user.phone,
        action: user.status === 'SUSPENDED' ? 'غیرفعال شدن توسط ادمین' : 'فعال شدن توسط ادمین',
        timestamp: new Date()
      });
    }
    return { success: true };
  });

export const getAdminUserDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = S.users.find(u => u.id === data.id);
    if (!user) return null;

    let referrerId: string | null = null;
    if (['usr-2', 'usr-3', 'usr-4'].includes(user.id)) {
      referrerId = 'usr-24';
    } else if (user.id === 'usr-24') {
      referrerId = 'usr-1';
    }

    const genArr = (labels: string[]) => labels.map(l => ({ label: l, value: Math.floor(Math.random() * 5000000) + 500000 }));
    const chartData = {
      daily: genArr(['00-04', '04-08', '08-12', '12-16', '16-20', '20-24']),
      weekly: genArr(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']),
      monthly: genArr(Array.from({ length: 30 }, (_, i) => (i + 1).toString())),
      yearly: genArr(JALALI_MONTHS)
    };

    let referrals: { id: string, phone: string, registeredAt: Date, totalOrders: number, orderIds?: string[] }[] = [];
    if (user.id === 'usr-24') {
      referrals = S.users.filter(u => ['usr-2', 'usr-3', 'usr-4'].includes(u.id)).map(u => ({
        id: u.id, phone: u.phone, registeredAt: u.registeredAt, totalOrders: u.totalOrders,
        orderIds: Array.from({ length: u.totalOrders }, (_, i) => `ord-${u.id}-${1000 + i}`)
      }));
    } else if (user.id === 'usr-1') {
      referrals = S.users.filter(u => u.id === 'usr-24').map(u => ({
        id: u.id, phone: u.phone, registeredAt: u.registeredAt, totalOrders: u.totalOrders,
        orderIds: Array.from({ length: u.totalOrders }, (_, i) => `ord-${u.id}-${2000 + i}`)
      }));
    }

    const logTypes = ['NAME', 'EMAIL', 'PHONE', 'STATUS'];
    const logs = Array.from({ length: 12 }, (_, i) => ({
      id: `log-${i}`, type: logTypes[i % 4], action: `تغییر ${logTypes[i % 4]} به مقدار جدید`, timestamp: new Date(Date.now() - i * 3600000)
    }));

    const devices = [
      { id: 'dev-1', name: 'iPhone 16 Pro (Safari)', lastActive: new Date(), isCurrent: true },
      { id: 'dev-2', name: 'MacBook Pro (Chrome)', lastActive: new Date(Date.now() - 86400000), isCurrent: false },
    ];

    const addresses = [
      { id: 'addr-1', address: 'تهران، سعادت‌آباد، خیابان ۴، پلاک ۱۲، واحد ۳، کد پستی: ۱۲۳۴۵۶۷۸۹۰', lat: 35.776, lng: 51.414, orderCount: 5 },
      { id: 'addr-2', address: 'کرج، گوهردشت، بلوار طالقانی، نبش کوچه ۱۵، مجتمع مسکونی آفتاب، پلاک ۲۴۵', lat: 35.835, lng: 51.434, orderCount: 2 },
      { id: 'addr-3', address: 'اصفهان، خیابان چهارباغ بالا، روبروی فرشادی‌ها، پلاک ۸۹، طبقه دوم', lat: 35.700, lng: 51.400, orderCount: 1 }
    ].filter(addr => !S.deletedAddressIds.has(addr.id));

    const orders = Array.from({ length: 25 }, (_, i) => ({
      id: `ord-${1000 + i}`,
      date: new Date(Date.now() - i * 86400000),
      amount: Math.floor(Math.random() * 300000) + 50000,
      status: ['PAID', 'DELIVERED', 'ON_THE_WAY'][i % 3],
      addressId: i % 3 === 0 ? 'addr-1' : (i % 3 === 1 ? 'addr-2' : null)
    }));

    return { ...user, referrerId, devices, orders, addresses, referrals, logs, chartData } as AdminUserDetails;
  });

export const terminateDevice = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string(), deviceId: z.string() }))
  .handler(async () => {
    return { success: true };
  });

export const updateAdminUser = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().regex(/^09[0-9]{9}$/, 'شماره موبایل معتبر نیست').optional(),
    referralCode: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const user = S.users.find(u => u.id === data.id);
    if (user) {
      if (data.firstName !== undefined) user.firstName = data.firstName;
      if (data.lastName !== undefined) user.lastName = data.lastName;
      if (data.email !== undefined) user.email = data.email;
      if (data.phone !== undefined) user.phone = data.phone;
      if (data.referralCode !== undefined) user.id = data.referralCode.toLowerCase();
    }
    return { success: true };
  });

export const getAdminOrders = createServerFn({ method: 'GET' })
  .validator(z.object({
    page: z.number(),
    limit: z.number(),
    search: z.string().optional(),
    status: z.string().optional(),
    sortDate: z.string().optional(),
    sortAmount: z.string().optional(),
    confirmedBy: z.string().optional(),
    courierId: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    let filtered: AdminOrder[] = S.orders
    const liveAsAdmin: AdminOrder[] = S.liveOrders.filter(o => o.confirmedBy).map(o => ({
      id: o.id, userPhone: o.userPhone, userName: o.userName,
      amount: o.amount, date: o.date, status: o.status as AdminOrder['status'],
    }))
    filtered = [...liveAsAdmin, ...filtered]

    if (data.search) {
      filtered = filtered.filter(o => o.id.includes(data.search!) || o.userPhone.includes(data.search!))
    }
    if (data.status && data.status !== 'all') {
      filtered = filtered.filter(o => o.status === data.status)
    }
    if (data.confirmedBy && data.confirmedBy !== 'all') {
      filtered = S.liveOrders
        .filter(o => o.confirmedBy === data.confirmedBy)
        .map(o => ({ id: o.id, userPhone: o.userPhone, userName: o.userName, amount: o.amount, date: o.date, status: o.status as AdminOrder['status'] }))
    }
    if (data.courierId && data.courierId !== 'all') {
      filtered = S.liveOrders
        .filter(o => o.courierId === data.courierId)
        .map(o => ({ id: o.id, userPhone: o.userPhone, userName: o.userName, amount: o.amount, date: o.date, status: o.status as AdminOrder['status'] }))
    }

    if (data.sortDate === 'newest') filtered = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime())
    if (data.sortDate === 'oldest') filtered = [...filtered].sort((a, b) => a.date.getTime() - b.date.getTime())
    if (data.sortAmount === 'highest') filtered = [...filtered].sort((a, b) => b.amount - a.amount)
    if (data.sortAmount === 'lowest') filtered = [...filtered].sort((a, b) => a.amount - b.amount)

    const total = filtered.length
    const orders = filtered.slice((data.page - 1) * data.limit, data.page * data.limit)
    return { orders, total }
  })

export const getAdmin2Options = createServerFn({ method: 'GET' }).handler(async () => {
  return S.subAdmins.filter(a => a.isActive).map(a => ({
    id: a.id, name: `${a.firstName} ${a.lastName}`,
  }))
})

export const getCourierOptions = createServerFn({ method: 'GET' }).handler(async () => {
  return S.couriers.map(c => ({ id: c.id, name: c.name }))
})

export const getAdminOrderDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const mockOrder = S.orders.find(o => o.id === data.id);
    if (!mockOrder) return null;

    const user = S.users.find(u => u.phone === mockOrder.userPhone) || S.users[0];
    const isDelivery = !data.id.endsWith('3');

    return {
      id: mockOrder.id,
      date: mockOrder.date,
      status: mockOrder.status,
      subtotal: mockOrder.amount,
      discount: Math.floor(mockOrder.amount * 0.1),
      totalAmount: mockOrder.amount - Math.floor(mockOrder.amount * 0.1),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone
      },
      deliveryType: isDelivery ? 'DELIVERY' : 'DINE_IN',
      address: isDelivery ? { text: 'تهران، سعادت‌آباد، خیابان ۴، پلاک ۱۲، واحد ۳', lat: 35.776, lng: 51.414 } : null,
      courier: isDelivery ? { name: 'محمد پیک', phone: '09121112233' } : null,
      paymentMethod: 'WALLET',
      items: [
        { id: 'p-1', name: 'پیتزا پپرونی', quantity: 2, price: 185000 },
        { id: 'p-5', name: 'نوشیدنی کوکاکولا', quantity: 3, price: 25000 },
        { id: 'p-3', name: 'برگر کلاسیک', quantity: 1, price: 95000 }
      ]
    } as AdminOrderDetails;
  });

export const deleteUserAddress = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string(), addressId: z.string() }))
  .handler(async ({ data }) => {
    S.deletedAddressIds.add(data.addressId);
    return { success: true };
  });

// --- آیتم ۱۴: پیک‌ها ---

export const getAdminCouriers = createServerFn({ method: 'GET' })
  .validator(z.object({
    page: z.number(), limit: z.number(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    let filtered = S.couriers
    if (data.search) {
      const q = data.search.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(data.search!))
    }
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)

    const inRange = (d: Date) => {
      const from = data.dateFrom ? startOfDay(jalaliToGregorian(jalaliFromISO(data.dateFrom)!)) : null
      const to = data.dateTo ? startOfDay(jalaliToGregorian(jalaliFromISO(data.dateTo)!)) : null
      if (from && d < from) return false
      if (to && d > new Date(to.getTime() + 86400000 - 1)) return false
      return true
    }
    const result = filtered.map(c => ({
      ...c,
      trips: c.trips
        .map(t => ({ ...t, deliveries: t.deliveries.filter(d => inRange(d.deliveredAt)) }))
        .filter(t => t.deliveries.length > 0),
    })).filter(c => c.trips.length > 0 || (!data.dateFrom && !data.dateTo))

    const total = result.length
    const couriers = result.slice((data.page - 1) * data.limit, data.page * data.limit)
    return { couriers, total }
  })

export const getAdminCourierDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const courier = S.couriers.find(c => c.id === data.id)
    if (!courier) return null

    const allDeliveries = courier.trips.flatMap(t => t.deliveries)
    const genChart = (labels: string[]) => labels.map(l => ({
      label: l, value: allDeliveries.filter(() => Math.random() > 0.4).length + Math.floor(Math.random() * 5),
    }))

    const chartData = {
      daily: genChart(['۰۰-۰۴', '۰۴-۰۸', '۰۸-۱۲', '۱۲-۱۶', '۱۶-۲۰', '۲۰-۲۴']),
      weekly: genChart(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']),
      monthly: genChart(Array.from({ length: 30 }, (_, i) => (i + 1).toLocaleString('fa-IR'))),
      yearly: genChart(JALALI_MONTHS),
    }

    const totalDeliveries = allDeliveries.length
    const totalAmount = allDeliveries.reduce((s, d) => s + d.amount, 0)
    return { ...courier, chartData, totalDeliveries, totalAmount }
  })

// --- آیتم ۲۰: ادمین‌های سطح ۲ ---

export const getSubAdmins = createServerFn({ method: 'GET' }).handler(async () => {
  return S.subAdmins
})

export const addSubAdmin = createServerFn({ method: 'POST' })
  .validator(z.object({
    phone: z.string().regex(/^09[0-9]{9}$/, 'شماره موبایل معتبر نیست'),
    firstName: z.string().min(1, 'نام الزامی است'),
    lastName: z.string().min(1, 'نام خانوادگی الزامی است'),
  }))
  .handler(async ({ data }) => {
    const exists = S.subAdmins.some(a => a.phone === data.phone)
    if (exists) return { success: false, message: 'این شماره قبلاً ثبت شده' }
    S.subAdmins.push({
      id: `sa-${Date.now()}`, phone: data.phone,
      firstName: data.firstName, lastName: data.lastName,
      isActive: true, ordersConfirmed: 0,
      permissions: {
        productsRead: false, productsWrite: false,
        usersRead: false, usersWrite: false,
        couriersRead: true, couriersWrite: false,
        mainCategoriesRead: false, mainCategoriesWrite: false,orderDetailsRead: false, 
      },
      sessions: [{ loginAt: new Date(), logoutAt: null, wasActive: true }],
      lastActivity: new Date(),
    })
    return { success: true }
  })

export const toggleSubAdmin = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const admin = S.subAdmins.find(a => a.id === data.id)
    if (admin) admin.isActive = !admin.isActive
    return { success: true }
  })

export const getSubAdminDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    return S.subAdmins.find(a => a.id === data.id) ?? null
  })

// --- لاگین/لاگ‌اوت: تک‌نشست + تشخیص نقش ---

export const subAdminLogin = createServerFn({ method: 'POST' })
  .validator(z.object({ phone: z.string() }))
  .handler(async ({ data }) => {
    if (MAIN_ADMIN_PHONES.includes(data.phone)) {
      return { success: true as const, role: 'admin' as const, admin: null }
    }
    if (S.activeSession) {
      const current = S.subAdmins.find(a => a.id === S.activeSession!.adminId)
      return {
        success: false as const,
        message: `ادمین دیگری (${current?.firstName ?? ''} ${current?.lastName ?? ''}) لاگین است. ابتدا او باید خارج شود.`,
      }
    }
    const admin = S.subAdmins.find(a => a.phone === data.phone && a.isActive)
    if (!admin) return { success: false as const, message: 'ادمین سطح ۲ یافت نشد یا غیرفعال است' }

    S.activeSession = { adminId: admin.id, loginAt: new Date() }
    const drainedCount = drainQueueToAdmin()
    return {
      success: true as const,
      role: 'admin2' as const,
      admin: { id: admin.id, firstName: admin.firstName, lastName: admin.lastName, permissions: admin.permissions },
      drainedOrders: drainedCount,
    }
  })

export const subAdminLogout = createServerFn({ method: 'POST' })
  .validator(z.object({ adminId: z.string() }))
  .handler(async ({ data }) => {
    if (data.adminId === 'current' || S.activeSession?.adminId === data.adminId) {
      S.activeSession = null
    }
    return { success: true }
  })

export const getSubAdminSession = createServerFn({ method: 'GET' }).handler(async () => {
  if (!S.activeSession) return { isAdmin2LoggedIn: false, admin: null }
  const admin = S.subAdmins.find(a => a.id === S.activeSession!.adminId)
  if (!admin) return { isAdmin2LoggedIn: false, admin: null }
  return {
    isAdmin2LoggedIn: true,
    admin: { id: admin.id, firstName: admin.firstName, lastName: admin.lastName, permissions: admin.permissions },
  }
})

export const updateSubAdminPermissions = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string(),
    permissions: z.object({
      productsRead: z.boolean(), productsWrite: z.boolean(),
      usersRead: z.boolean(), usersWrite: z.boolean(),
      couriersRead: z.boolean(), couriersWrite: z.boolean(),
      mainCategoriesRead: z.boolean(), mainCategoriesWrite: z.boolean(),orderDetailsRead: z.boolean(),
    }),
  }))
  .handler(async ({ data }) => {
    const admin = S.subAdmins.find(a => a.id === data.id)
    if (admin) admin.permissions = data.permissions
    return { success: true }
  })

// --- سفارشات زنده: مالکیت ادمین۲ ---

export const getLiveOrders = createServerFn({ method: 'GET' })
  .validator(z.object({ adminId: z.string() }))
  .handler(async ({ data }) => {
    const visible = S.liveOrders.filter(o =>
      o.status === 'PAID' || o.confirmedBy === data.adminId
    )
    return { orders: visible, total: visible.length }
  })

export const viewOrderNote = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const order = S.liveOrders.find(o => o.id === data.orderId)
    if (order) order.noteSeen = true
    return { success: true, note: order?.customerNote ?? null }
  })

export const getCouriersForAssignment = createServerFn({ method: 'GET' }).handler(async () => {
  return S.couriers.map(c => ({ id: c.id, name: c.name, phone: c.phone }))
})

export const addCourier = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(1), phone: z.string().regex(/^09[0-9]{9}$/) }))
  .handler(async ({ data }) => {
    S.couriers.push({
      id: `cr-${Date.now()}`, name: data.name, phone: data.phone, trips: [],
    })
    return { success: true }
  })

export const confirmLiveOrder = createServerFn({ method: 'POST' })
  .validator(z.object({
    orderId: z.string(),
    courierId: z.string().nullable(),
    courierNote: z.string().max(300).optional().nullable(),
    securityEnabled: z.boolean(),
  }))
  .handler(async ({ data }) => {
    const order = S.liveOrders.find(o => o.id === data.orderId)
    if (!order) return { success: false, message: 'سفارش یافت نشد' }
    if (!order.noteSeen) return { success: false, message: 'ابتدا نکته مشتری را ببینید و تیک بزنید' }

    const admin = S.subAdmins.find(a => a.id === S.activeSession?.adminId)
    order.status = 'CONFIRMED'
    order.confirmedBy = admin?.id ?? null
    order.confirmedByName = admin ? `${admin.firstName} ${admin.lastName}` : null
    order.courierSecurityEnabled = data.securityEnabled
    order.internalNote = data.courierNote?.trim() || null

    if (data.courierId) {
      const courier = S.couriers.find(c => c.id === data.courierId)
      if (!courier) return { success: false, message: 'پیک یافت نشد' }
      order.courierId = courier.id
      order.courierName = courier.name
      order.courierPhone = courier.phone
    } else {
      order.courierId = null
      order.courierName = 'تخصیص در محل (متفرقه)'
      order.courierPhone = null
    }

    if (admin) admin.ordersConfirmed += 1

    S.printQueue.push({ orderId: order.id, type: 'kitchen', printedAt: null })
    S.printQueue.push({ orderId: order.id, type: 'sales', printedAt: null })


    // ⬅ سینک روی کپی کاربر — مشتری وضعیت و پیکِ تخصیص‌یافته را ببیند
    syncUserOrder(order.id, {
      status: 'CONFIRMED',
      courierName: order.courierName,
      courierPhone: order.courierPhone,
    })
    return { success: true }
  })

export const reassignCourier = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string(), newCourierId: z.string().nullable() }))
  .handler(async ({ data }) => {
    const order = S.liveOrders.find(o => o.id === data.orderId)
    if (!order) return { success: false, message: 'سفارش یافت نشد' }
    if (order.courierArrivedAt) return { success: false, message: 'پیک به مغازه رسیده — امکان تغییر نیست' }

    if (data.newCourierId) {
      const courier = S.couriers.find(c => c.id === data.newCourierId)
      if (!courier) return { success: false, message: 'پیک یافت نشد' }
      order.courierId = courier.id
      order.courierName = courier.name
      order.courierPhone = courier.phone
    } else {
      order.courierId = null
      order.courierName = 'تخصیص در محل (متفرقه)'
      order.courierPhone = null
    }

    S.printQueue.push({ orderId: order.id, type: 'sales', printedAt: null })

    // ⬅ سینک روی کپی کاربر — پیک جدید
    syncUserOrder(order.id, {
      courierName: order.courierName,
      courierPhone: order.courierPhone,
    })
    return { success: true }
  })

// آیتم ۱۸/QR: اسکن توسط پیک → خودکار ON_THE_WAY
export const courierScanArrival = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string(), courierId: z.string().optional().nullable() }))
  .handler(async ({ data }) => {
    const order = S.liveOrders.find(o => o.id === data.orderId)
    if (!order) return { success: false, message: 'سفارش یافت نشد' }
    if (order.status !== 'CONFIRMED') return { success: false, message: 'وضعیت سفارش اجازه اسکن نمی‌دهد' }
    if (order.courierSecurityEnabled && order.courierId && data.courierId !== order.courierId) {
      return { success: false, message: 'این پیک به این سفارش تخصیص نیافته' }
    }
    order.courierArrivedAt = new Date()
    order.status = 'ON_THE_WAY'
    return { success: true }
  })

// شبیه‌ساز سفارش جدید
export const simulateNewOrder = createServerFn({ method: 'POST' }).handler(async () => {
  const hasNote = Math.random() > 0.5
  S.liveOrders = [{
    id: `ord-${Date.now()}`,
    userPhone: `0912${String(1000000 + Math.floor(Math.random() * 9999999)).padStart(7, '0')}`,
    userName: 'مشتری جدید',
    amount: Math.floor(Math.random() * 400000) + 60000,
    date: new Date(),
    status: 'PAID',
    customerNote: hasNote ? 'درِ ساختمان قرمز است، زنگ واحد ۳.' : null,
    noteSeen: !hasNote,
    confirmedBy: null, confirmedByName: null,
    courierId: null, courierName: null, courierPhone: null, courierArrivedAt: null,
    courierSecurityEnabled: false,
    internalNote: null,
  }, ...S.liveOrders]
  return { success: true }
});

export const checkUserRole = createServerFn({ method: 'GET' })
  .validator(z.object({ phone: z.string() }))
  .handler(async ({ data }) => {
    if (MAIN_ADMIN_PHONES.includes(data.phone)) return { role: 'admin' as const }
    if (S.subAdmins.some(a => a.phone === data.phone && a.isActive)) return { role: 'admin2' as const }
    return { role: 'user' as const }
  })

// --- داشبورد اختصاصی ادمین۲ ---

export const getAdmin2Stats = createServerFn({ method: 'GET' })
  .validator(z.object({ adminId: z.string() }))
  .handler(async ({ data }) => {
    const myOrders = S.liveOrders.filter(o => o.confirmedBy === data.adminId)
    const totalAmount = myOrders.reduce((s, o) => s + o.amount, 0)

    const genChart = (labels: string[]) => labels.map(l => ({
      label: l, value: myOrders.filter(() => Math.random() > 0.4).length + Math.floor(Math.random() * 4),
    }))
    const chartData = {
      daily: genChart(['۰۰-۰۴', '۰۴-۰۸', '۰۸-۱۲', '۱۲-۱۶', '۱۶-۲۰', '۲۰-۲۴']),
      weekly: genChart(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']),
      monthly: genChart(Array.from({ length: 30 }, (_, i) => (i + 1).toLocaleString('fa-IR'))),
      yearly: genChart(JALALI_MONTHS),
    }

    return {
      totalOrders: myOrders.length,
      totalAmount,
      chartData,
      recentOrders: myOrders.slice(0, 5),
    }
  })

export const getSubAdminOrders = createServerFn({ method: 'GET' })
  .validator(z.object({
    page: z.number(), limit: z.number(),
    search: z.string().optional(),
    status: z.string().optional(),
    sortDate: z.string().optional(),
    sortAmount: z.string().optional(),
    adminId: z.string(),
  }))
  .handler(async ({ data }) => {
    let filtered = S.liveOrders.filter(o => o.confirmedBy === data.adminId)

    if (data.search) {
      filtered = filtered.filter(o => o.id.includes(data.search!) || o.userPhone.includes(data.search!))
    }
    if (data.status && data.status !== 'all') {
      filtered = filtered.filter(o => o.status === data.status)
    }
    if (data.sortDate === 'newest') filtered = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime())
    if (data.sortDate === 'oldest') filtered = [...filtered].sort((a, b) => a.date.getTime() - b.date.getTime())
    if (data.sortAmount === 'highest') filtered = [...filtered].sort((a, b) => b.amount - a.amount)
    if (data.sortAmount === 'lowest') filtered = [...filtered].sort((a, b) => a.amount - b.amount)

    const total = filtered.length
    const orders = filtered.slice((data.page - 1) * data.limit, data.page * data.limit)
    return { orders, total }
  })

export const getOrderDetailsByRole = createServerFn({ method: 'GET' })
  .validator(z.object({ orderId: z.string(), adminId: z.string().optional() }))
  .handler(async ({ data }) => {
    const order = S.liveOrders.find(o => o.id === data.orderId)
    if (!order) return null
    if (data.adminId && order.confirmedBy !== data.adminId) return null
    return order
  })

export const getAdminCourierDetailsForRole = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string(), adminId: z.string().optional() }))
  .handler(async ({ data }) => {
    const courier = S.couriers.find(c => c.id === data.id)
    if (!courier) return null

    const myOrderIds = data.adminId
      ? new Set(S.liveOrders.filter(o => o.confirmedBy === data.adminId).map(o => o.id))
      : null

    const trips = myOrderIds
      ? courier.trips
        .map(t => ({ ...t, deliveries: t.deliveries.filter(d => myOrderIds.has(d.orderId)) }))
        .filter(t => t.deliveries.length > 0)
      : courier.trips

    const allDeliveries = trips.flatMap(t => t.deliveries)
    const genChart = (labels: string[]) => labels.map(l => ({
      label: l, value: allDeliveries.filter(() => Math.random() > 0.4).length + Math.floor(Math.random() * 5),
    }))

    return {
      ...courier,
      trips,
      chartData: {
        daily: genChart(['۰۰-۰۴', '۰۴-۰۸', '۰۸-۱۲', '۱۲-۱۶', '۱۶-۲۰', '۲۰-۲۴']),
        weekly: genChart(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']),
        monthly: genChart(Array.from({ length: 30 }, (_, i) => (i + 1).toLocaleString('fa-IR'))),
        yearly: genChart(JALALI_MONTHS),
      },
      totalDeliveries: allDeliveries.length,
      totalAmount: allDeliveries.reduce((s, d) => s + d.amount, 0),
      hasNoDeliveries: allDeliveries.length === 0,
    }
  })

// --- تنظیمات ---

export const setLiveTrackingEnabled = createServerFn({ method: 'POST' })
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    S.liveTrackingEnabled = data.enabled
    return { success: true }
  })

export const getLiveTrackingEnabled = createServerFn({ method: 'GET' }).handler(async () => {
  return { isEnabled: S.liveTrackingEnabled }
})

export const setRestaurantOpen = createServerFn({ method: 'POST' })
  .validator(z.object({ isOpen: z.boolean(), nextOpenTime: z.string().optional() }))
  .handler(async ({ data }) => {
    S.restaurantOpen = data.isOpen
    if (data.nextOpenTime) S.nextOpenTime = data.nextOpenTime
    return { success: true }
  })

export const getRestaurantOpen = createServerFn({ method: 'GET' }).handler(async () => {
  return { isOpen: S.restaurantOpen, nextOpenTime: S.nextOpenTime }
})

// --- صف سفارشات زمان بسته بودن مغازه ---

export const queueOrder = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const order = S.liveOrders.find(o => o.id === data.orderId)
    if (order) {
      S.pendingQueue.push(order)
    }
    return { success: true, queueLength: S.pendingQueue.length }
  })

// تخلیه — در subAdminLogin بعد از ست سشن صدا زده می‌شود
function drainQueueToAdmin(): number {
  const count = S.pendingQueue.length
  S.pendingQueue = []
  return count
}

export const getQueueStatus = createServerFn({ method: 'GET' }).handler(async () => {
  return { queueLength: S.pendingQueue.length }
})

// پل ثبت سفارش زنده از چک‌اوت
registerLivePusher((order: LiveOrder) => { S.liveOrders = [order, ...S.liveOrders] })