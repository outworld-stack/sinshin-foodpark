// src/server/coupons.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export type RuleType =
    | 'min_orders'
    | 'min_spent'
    | 'purchased_product'
    | 'purchased_category'
    | 'registered_days_ago'
    | 'min_referrals'
    | 'min_referral_orders'
    | 'min_referral_spent';

export interface CouponRule {
    type: RuleType;
    value: string | number;
    quantity?: number; // برای خرید محصول یا دسته خاص
}

export interface Coupon {
    id: string;
    code: string;
    discountPercentage: number;
    expiryDate: string;
    maxUses: number;
    isPublic: boolean;
    rules: CouponRule[];
    status: 'ACTIVE' | 'EXPIRED';
    recipientsCount: number;
}

let mockCoupons: Coupon[] = [
    {
        id: 'c-1',
        code: 'PIZZA20',
        discountPercentage: 20,
        expiryDate: '2024-12-31T23:59:59',
        maxUses: 1,
        isPublic: false,
        rules: [
            { type: 'min_orders', value: 5 },
            { type: 'purchased_category', value: 'cat-1', quantity: 2 }
        ],
        status: 'ACTIVE',
        recipientsCount: 42
    },
    {
        id: 'c-2',
        code: 'WELCOME10',
        discountPercentage: 10,
        expiryDate: '2024-10-01T23:59:59',
        maxUses: 0,
        isPublic: true,
        rules: [],
        status: 'ACTIVE',
        recipientsCount: 0
    }
];

export const getAdminCoupons = createServerFn({ method: 'GET' }).handler(async () => {
    return mockCoupons;
});

export const createCoupon = createServerFn({ method: 'POST' })
    .validator(z.object({
        code: z.string(),
        discountPercentage: z.number(),
        expiryDate: z.string(),
        maxUses: z.number(),
        isPublic: z.boolean(),
        rules: z.array(z.object({
            type: z.enum(['min_orders', 'min_spent', 'purchased_product', 'purchased_category', 'registered_days_ago', 'min_referrals', 'min_referral_orders', 'min_referral_spent']),
            value: z.string(),
            quantity: z.number().optional()
        }))
    }))
    .handler(async ({ data }) => {
        const newCoupon: Coupon = {
            id: `c-${Date.now()}`,
            ...data,
            status: 'ACTIVE',
            recipientsCount: 0
        };
        mockCoupons.unshift(newCoupon);
        return { success: true };
    });

export const updateCoupon = createServerFn({ method: 'POST' })
    .validator(z.object({
        id: z.string(),
        code: z.string(),
        discountPercentage: z.number(),
        expiryDate: z.string(),
        maxUses: z.number(),
        isPublic: z.boolean(),
        rules: z.array(z.object({
            type: z.enum(['min_orders', 'min_spent', 'purchased_product', 'purchased_category', 'registered_days_ago', 'min_referrals', 'min_referral_orders', 'min_referral_spent']),
            value: z.string(),
            quantity: z.number().optional()
        }))
    }))
    .handler(async ({ data }) => {
        const coupon = mockCoupons.find(c => c.id === data.id);
        if (coupon) {
            coupon.code = data.code;
            coupon.discountPercentage = data.discountPercentage;
            coupon.expiryDate = data.expiryDate;
            coupon.maxUses = data.maxUses;
            coupon.isPublic = data.isPublic;
            coupon.rules = data.rules;
        }
        return { success: true };
    });

export const deleteCoupon = createServerFn({ method: 'POST' })
    .validator(z.object({ id: z.string() }))
    .handler(async ({ data }) => {
        mockCoupons = mockCoupons.filter(c => c.id !== data.id);
        return { success: true };
    });