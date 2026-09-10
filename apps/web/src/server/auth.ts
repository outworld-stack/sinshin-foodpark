// src/server/auth.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { mockUser } from './user'
import { currentTermsVersion } from './terms'


// ثبت‌نام‌های این سشن — موک (بک‌اند: رکورد واقعی کاربر)
const __REG_KEY = Symbol.for('sinshin.mock.registrations')
const __rg = globalThis as Record<symbol, Map<string, {
  referrerCode: string | null
  termsAcceptedAt: Date
  termsVersion: string
}> | undefined>
if (!__rg[__REG_KEY]) __rg[__REG_KEY] = new Map()
const registrations = __rg[__REG_KEY]!

// شماره‌های ثبت‌نام‌شده — کاربر موک + ثبت‌نام‌های سشن
const isRegistered = (phone: string) => phone === mockUser.phone || registrations.has(phone)

// دیتابیس موقت در حافظه سرور محلی
const otpStore = new Map<string, { code: string; attempts: number; blockedUntil: number }>();

// درخواست کد — حالا میگه کاربرِ جدیده یا نه (برای مرحله‌ی قوانین و معرف)
export const requestOtp = createServerFn({ method: 'POST' })
  .validator(z.object({ phone: z.string() }))
  .handler(async ({ data }) => {
    const phone = data.phone;
    const record = otpStore.get(phone) || { code: '', attempts: 0, blockedUntil: 0 };

    // rate limit, block after 3 times wrong
    if (record.blockedUntil > Date.now()) {
      const mins = Math.ceil((record.blockedUntil - Date.now()) / 60000);
      throw new Error(`به دلیل تلاش‌های ناموفق، حساب تا ${mins} دقیقه بلاک شده است.`);
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(phone, { code, attempts: 0, blockedUntil: 0 });

    // sending sms
    console.log(`[MOCK SMS] -> ${phone}: ${code}`);

    return { success: true, message: 'کد ۴ رقمی ارسال شد.', isNewUser: !isRegistered(phone) };
  });

// چک کاربرِ جدید — بدون ارسال پیامک (قوانین قبل از هزینه‌ی SMS پذیرفته شود)
export const checkIsNewUser = createServerFn({ method: 'POST' })
  .validator(z.object({ phone: z.string() }))
  .handler(async ({ data }) => {
    return { isNewUser: !isRegistered(data.phone) }
  });

// تأیید کد + ثبت‌نام (با کد معرف و پذیرش قوانین)
export const verifyOtp = createServerFn({ method: 'POST' })
  .validator(z.object({
    phone: z.string(),
    code: z.string(),
    refCode: z.string().nullable().optional(),     // ⬅ کد معرف از لینک
    termsAccepted: z.boolean().optional(),          // ⬅ پذیرش قوانین
  }))
  .handler(async ({ data }) => {
    const record = otpStore.get(data.phone);

    if (!record) throw new Error('کدی برای این شماره ارسال نشده است.');
    if (record.blockedUntil > Date.now()) throw new Error('حساب شما موقتا مسدود شده است.');

    if (record.code !== data.code) {
      record.attempts++;
      if (record.attempts >= 3) {
        record.blockedUntil = Date.now() + 3600 * 1000; // بلاک ۱ ساعته
        otpStore.set(data.phone, record);
        throw new Error('کد اشتباه است. حساب به دلیل تلاش‌های ناموفق مسدود شد.');
      }
      otpStore.set(data.phone, record);
      throw new Error(`کد اشتباه است. ${3 - record.attempts} تلاش باقی مانده.`);
    }

    // --- ثبت‌نام کاربر جدید (حلقه‌ی معرفی — F-45) ---
    const isNewUser = !isRegistered(data.phone)
    if (isNewUser) {
      if (!data.termsAccepted) {
        throw new Error('پذیرش قوانین برای ثبت‌نام الزامی است.');
      }

      // کد معرف — اعتبارسنجی و اتصال (موک: کد کاربر اصلی معتبره)
      let referrerCode: string | null = null
      if (data.refCode) {
        if (data.refCode === mockUser.referralCode) {
          referrerCode = data.refCode
          // دمو: معرفی‌شده به زیرمجموعه‌های معرف اضافه می‌شه
          mockUser.myReferrals.push({
            id: `ref-${Date.now()}`,
            phone: data.phone,
            registerDate: new Date(),
            totalOrders: 0,
            totalSpent: 0,
            myProfit: 0,
          })
        }
        // کد نامعتبر → ثبت‌نام بدون معرف ادامه می‌یابه
      }

      registrations.set(data.phone, {
        referrerCode,
        termsAcceptedAt: new Date(),
        termsVersion: String(currentTermsVersion()),   // ⬅ نسخه‌ی واقعی لحظه‌ی پذیرش
      })
    }

    // success
    otpStore.delete(data.phone);
    return {
      success: true,
      isNewUser,
      token: 'mock-jwt-token-xyz',
      user: { id: '1', phone: data.phone, name: 'کاربر نمونه' },
    };
  });