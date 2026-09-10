// src/server/products.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';



export interface MainCategory {
  id: string
  name: string
  slug: string
  isActive: boolean
  isDefault: boolean
  sortOrder: number
}

export let mainCategories: MainCategory[] = [
  { id: 'mc-1', name: 'رستوران', slug: 'restaurant', isActive: true, isDefault: true, sortOrder: 1 },
  { id: 'mc-2', name: 'فست‌فود', slug: 'fastfood', isActive: true, isDefault: false, sortOrder: 2 },
]

export interface Category {
  id: string
  name: string
  slug: string
  hasSizes: boolean
  sizeNames?: string[]
  mainCategoryId: string
}

export interface ProductSize {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  finalPrice: number;
  discountPercentage: number;
  categoryId: string;
  categoryName?: string; // اضافه شد
  imageGradient: string;
  profileImage: string;
  galleryImages: string[];
  sizesEnabled: boolean;
  sizes: ProductSize[];
  ingredients: string[]; // اضافه شد
  prepTime: number;
  views: number;
  sales: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export const categories: Category[] = [
  { id: 'cat-1', name: 'پیتزا', slug: 'pizza', hasSizes: true, sizeNames: ['کوچک', 'متوسط', 'بزرگ', 'خانوادگی'], mainCategoryId: 'mc-2' },
  { id: 'cat-2', name: 'برگر', slug: 'burger', hasSizes: false, mainCategoryId: 'mc-2' },
  { id: 'cat-3', name: 'نوشیدنی', slug: 'drinks', hasSizes: false, mainCategoryId: 'mc-2' },
  { id: 'cat-4', name: 'ساندویچ', slug: 'sandwich', hasSizes: false, mainCategoryId: 'mc-1' },
  { id: 'cat-5', name: 'سالاد', slug: 'salad', hasSizes: false, mainCategoryId: 'mc-1' },
  { id: 'cat-6', name: 'دسر', slug: 'dessert', hasSizes: false, mainCategoryId: 'mc-2' },
  { id: 'cat-7', name: 'پاستا', slug: 'pasta', hasSizes: false, mainCategoryId: 'mc-1' },
  { id: 'cat-8', name: 'پیش‌غذا', slug: 'appetizer', hasSizes: false, mainCategoryId: 'mc-1' },
]

export const baseProducts: Product[] = [
  {
    id: 'p-1', name: 'پیتزا پپرونی', description: 'پنیر موزارلا و پپرونی با خمیر تازه و سس مخصوص خانه', originalPrice: 185000, finalPrice: 157250, discountPercentage: 15, categoryId: 'cat-1', imageGradient: 'from-orange-400 to-red-500', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [{ id: 's1', name: 'کوچک', price: 120000 }, { id: 's2', name: 'متوسط', price: 157250 }, { id: 's3', name: 'بزرگ', price: 200000 }], prepTime: 25, views: 150, sales: 40, status: 'ACTIVE',
    ingredients: ['پنیر موزارلا', 'پپرونی', 'خمیر تازه', 'سس مخصوص']
  },
  {
    id: 'p-2', name: 'پیتزا قارچ', description: 'پنیر و قارچ تازه با سس گوجه خانگی', originalPrice: 165000, finalPrice: 165000, discountPercentage: 0, categoryId: 'cat-1', imageGradient: 'from-yellow-400 to-orange-500', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [{ id: 's1', name: 'کوچک', price: 110000 }, { id: 's2', name: 'متوسط', price: 165000 }], prepTime: 25, views: 120, sales: 30, status: 'ACTIVE',
    ingredients: ['پنیر', 'قارچ تازه']
  },
  {
    id: 'p-3', name: 'برگر کلاسیک', description: 'گوشت قرمز ۱۵۰ گرم با سیب زمینی و سس مخصوص', originalPrice: 145000, finalPrice: 123250, discountPercentage: 15, categoryId: 'cat-2', imageGradient: 'from-amber-400 to-rose-500', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 15, views: 200, sales: 80, status: 'ACTIVE',
    ingredients: ['گوشت قرمز', 'نان بریوش', 'سیب‌زمینی']
  },
  {
    id: 'p-4', name: 'برگر دوبل', description: 'دو لایه گوشت و پنیر با نان بریوش', originalPrice: 195000, finalPrice: 165750, discountPercentage: 15, categoryId: 'cat-2', imageGradient: 'from-red-400 to-purple-600', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 20, views: 180, sales: 60, status: 'INACTIVE',
    ingredients: []
  },
  {
    id: 'p-5', name: 'نوشیدنی کوکاکولا', description: 'قوطی ۳۳۰ سی سی خنک', originalPrice: 25000, finalPrice: 25000, discountPercentage: 0, categoryId: 'cat-3', imageGradient: 'from-gray-700 to-red-700', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 2, views: 300, sales: 150, status: 'ACTIVE',
    ingredients: []
  },
  {
    id: 'p-6', name: 'آب معدنی', description: 'بطری ۵۰۰ سی سی', originalPrice: 15000, finalPrice: 15000, discountPercentage: 0, categoryId: 'cat-3', imageGradient: 'from-blue-400 to-cyan-300', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 1, views: 280, sales: 140, status: 'ACTIVE',
    ingredients: []
  },
  // --- محصولات رستورانی ---
  {
    id: 'p-7', name: 'کباب کوبیده', description: 'دو سیخ کباب کوبیده با برنج ایرانی زعفرانی و گوجه کبابی', originalPrice: 320000, finalPrice: 320000, discountPercentage: 0, categoryId: 'cat-4', imageGradient: 'from-red-400 to-orange-600', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 35, views: 95, sales: 25, status: 'ACTIVE',
    ingredients: ['گوشت گوسفندی', 'برنج زعفرانی', 'گوجه کبابی', 'کره']
  },
  {
    id: 'p-8', name: 'جوجه کباب زعفرانی', description: 'جوجه کباب با استخوان مزه‌دار شده با زعفران و آب‌لیمو', originalPrice: 295000, finalPrice: 250750, discountPercentage: 15, categoryId: 'cat-4', imageGradient: 'from-amber-400 to-yellow-600', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 30, views: 180, sales: 50, status: 'ACTIVE',
    ingredients: ['جوجه با استخوان', 'زعفران', 'آب‌لیمو', 'برنج']
  },
  {
    id: 'p-9', name: 'پاستا آلفردو', description: 'پاستا با سس خامه‌ای آلفردو و مرغ گریل شده', originalPrice: 245000, finalPrice: 245000, discountPercentage: 0, categoryId: 'cat-7', imageGradient: 'from-yellow-300 to-amber-500', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 18, views: 140, sales: 35, status: 'ACTIVE',
    ingredients: ['پاستا فرنه', 'سس آلفردو', 'مرغ گریل', 'قارچ']
  },
  {
    id: 'p-10', name: 'سالاد سزار', description: 'سالاد سزار با مرغ گریل، نان برشته و سس سزار مخصوص', originalPrice: 180000, finalPrice: 153000, discountPercentage: 15, categoryId: 'cat-5', imageGradient: 'from-green-400 to-lime-500', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 10, views: 200, sales: 45, status: 'ACTIVE',
    ingredients: ['کاهو رومی', 'مرغ گریل', 'نان برشته', 'پنیر پارمزان']
  },
  {
    id: 'p-11', name: 'سوپ جو', description: 'سوپ جو ایرانی با خامه تازه و سیر داغ', originalPrice: 120000, finalPrice: 120000, discountPercentage: 0, categoryId: 'cat-8', imageGradient: 'from-orange-200 to-yellow-400', profileImage: '', galleryImages: [], sizesEnabled: false, sizes: [], prepTime: 12, views: 75, sales: 20, status: 'ACTIVE',
    ingredients: ['جو پرک', 'خامه', 'سیر', 'پیاز داغ']
  },
];

// --- توابع بخش عمومی (فرانت‌اند کاربر) ---


// قیمت مؤثر — با یا بدون سایز (کلید خاموش = قیمت پایه)
export function getEffectivePrice(product: Product, sizeId?: string | null): number {
  if (product.sizesEnabled && product.sizes.length > 0) {
    const size = sizeId ? product.sizes.find(s => s.id === sizeId) : product.sizes[0]
    return size?.price ?? product.finalPrice
  }
  return product.finalPrice
}

// نام سایز برای نمایش (اگه فعال و انتخاب شده باشه)
export function getSizeName(product: Product, sizeId?: string | null): string | null {
  if (!product.sizesEnabled || !sizeId) return null
  return product.sizes.find(s => s.id === sizeId)?.name ?? null
}


export const getActiveMainCategories = createServerFn({ method: 'GET' })
  .handler(async () => {
    return mainCategories
      .filter(mc => mc.isActive)
      .sort((a, b) => {
        // پیش‌فرض اول — بعد sortOrder
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        return a.sortOrder - b.sortOrder
      })
  })

// --- عمومی: محصولات یک Main ---
export const getProductsByMain = createServerFn({ method: 'GET' })
  .validator(z.object({ mainSlug: z.string() }))
  .handler(async ({ data }) => {
    const main = mainCategories.find(mc => mc.slug === data.mainSlug && mc.isActive)
    if (!main) return []
    const catIds = categories.filter(c => c.mainCategoryId === main.id).map(c => c.id)
    return baseProducts
      .filter(p => catIds.includes(p.categoryId) && p.status === 'ACTIVE')
      .map(p => ({ ...p, categoryName: categories.find(c => c.id === p.categoryId)?.name }))
  })

// --- عمومی: دسته‌های یک Main ---
export const getCategoriesByMain = createServerFn({ method: 'GET' })
  .validator(z.object({ mainSlug: z.string() }))
  .handler(async ({ data }) => {
    const main = mainCategories.find(mc => mc.slug === data.mainSlug && mc.isActive)
    if (!main) return []
    return categories.filter(c => c.mainCategoryId === main.id)
  })

export const getCategories = createServerFn({ method: 'GET' }).handler(async () => {
  return categories;
});

export const getProducts = createServerFn({ method: 'GET' })
  .validator(z.object({ categorySlug: z.string().optional() }))
  .handler(async ({ data }) => {
    let filtered = baseProducts;
    if (data.categorySlug && data.categorySlug !== 'all') {
      const category = categories.find(c => c.slug === data.categorySlug);
      if (!category) return [];
      filtered = baseProducts.filter(p => p.categoryId === category.id);
    }
    return filtered.filter(p => p.status === 'ACTIVE').map(p => ({
      ...p,
      categoryName: categories.find(c => c.id === p.categoryId)?.name
    }));
  });

export const getProductById = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const product = baseProducts.find(p => p.id === data.id);
    if (!product) return null;
    return {
      ...product,
      categoryName: categories.find(c => c.id === product.categoryId)?.name
    };
  });

// --- تابع دریافت جزئیات سبد خرید ---
export const getCartDetails = createServerFn({ method: 'POST' })
  .validator(z.object({
    items: z.array(z.object({
      productId: z.string(),
      sizeId: z.string().nullable().optional(),
      quantity: z.number().min(1),
    })),
  }))
  .handler(async ({ data }) => {
    let total = 0;
    const cartItems = data.items.map(item => {
      const p = baseProducts.find(prod => prod.id === item.productId);
      if (!p) return null;
      const unitPrice = getEffectivePrice(p, item.sizeId);
      const lineTotal = unitPrice * item.quantity;
      total += lineTotal;
      return {
        id: p.id,
        sizeId: item.sizeId ?? null,
        sizeName: getSizeName(p, item.sizeId),
        name: p.name,
        imageGradient: p.imageGradient,
        originalPrice: unitPrice,
        finalPrice: unitPrice,
        quantity: item.quantity,
        lineTotal,
      };
    }).filter(Boolean) as Array<{
      id: string; sizeId: string | null; sizeName: string | null; name: string;
      imageGradient: string; originalPrice: number; finalPrice: number;
      quantity: number; lineTotal: number;
    }>;

    return { items: cartItems, total };
  });

export const calculateCartTotal = createServerFn({ method: 'POST' })
  .validator(z.object({
    items: z.array(z.object({ productId: z.string(), quantity: z.number() }))
  }))
  .handler(async ({ data }) => {
    let subtotal = 0;
    const cartItems = data.items.map(item => {
      const p = baseProducts.find(prod => prod.id === item.productId);
      if (!p) return null;
      subtotal += p.finalPrice * item.quantity;
      return {
        id: p.id,
        name: p.name,
        imageGradient: p.imageGradient,
        originalPrice: p.originalPrice,
        finalPrice: p.finalPrice,
        quantity: item.quantity,
        lineTotal: p.finalPrice * item.quantity
      };
    }).filter(Boolean) as Array<{
      id: string; name: string; imageGradient: string; originalPrice: number;
      finalPrice: number; quantity: number; lineTotal: number;
    }>;

    return { items: cartItems, subtotal, currency: 'تومان' };
  });

// --- توابع پنل ادمین ---


export const getAdminMainCategories = createServerFn({ method: 'GET' })
  .handler(async () => mainCategories)

export const createMainCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(1), slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (mainCategories.some(mc => mc.slug === data.slug)) {
      return { success: false, message: 'این slug قبلاً ثبت شده' }
    }
    mainCategories.push({
      id: `mc-${Date.now()}`,
      name: data.name,
      slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
      isActive: false,
      isDefault: false,
      sortOrder: mainCategories.length + 1,
    })
    return { success: true }
  })

export const setDefaultMainCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<{ success: boolean; message?: string }> => {
    const target = mainCategories.find(m => m.id === data.id)
    if (target && !target.isActive) {
      return { success: false, message: 'پیش‌فرض باید فعال باشد' }
    }
    mainCategories = mainCategories.map(mc => ({ ...mc, isDefault: mc.id === data.id }))
    return { success: true }
  })
export const toggleMainCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const mc = mainCategories.find(m => m.id === data.id)
    if (mc) mc.isActive = !mc.isActive
    return { success: true }
  })

export const reorderMainCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), direction: z.enum(['up', 'down']) }))
  .handler(async ({ data }) => {
    const sorted = [...mainCategories].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(m => m.id === data.id)
    const swapIdx = data.direction === 'up' ? idx - 1 : idx + 1
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return { success: false }
    const temp = sorted[idx].sortOrder
    sorted[idx].sortOrder = sorted[swapIdx].sortOrder
    sorted[swapIdx].sortOrder = temp
    return { success: true }
  })

export const deleteMainCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<{ success: boolean; message?: string }> => {
    if (categories.some(c => c.mainCategoryId === data.id)) {
      return { success: false, message: 'ابتدا دسته‌های زیرمجموعه را منتقل یا حذف کنید' }
    }
    mainCategories = mainCategories.filter(m => m.id !== data.id)
    return { success: true }
  })

export const getAdminProducts = createServerFn({ method: 'GET' })
  .validator(z.object({
    page: z.number(),
    limit: z.number(),
    search: z.string().optional(),
    status: z.string().optional(),
    categoryId: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    let filtered = baseProducts;
    if (data.search) {
      filtered = filtered.filter(p => p.name.includes(data.search!));
    }
    if (data.status && data.status !== 'all') {
      filtered = filtered.filter(p => p.status === (data.status as 'ACTIVE' | 'INACTIVE'));
    }
    if (data.categoryId && data.categoryId !== 'all') {
      filtered = filtered.filter(p => p.categoryId === data.categoryId);
    }
    const total = filtered.length;
    const products = filtered.slice((data.page - 1) * data.limit, data.page * data.limit);
    return { products, total };
  });

export const toggleProductStatus = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const product = baseProducts.find(p => p.id === data.id);
    if (product) {
      product.status = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }
    return { success: true };
  });

export const getAdminProductDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    return baseProducts.find(p => p.id === data.id) || null;
  });

export const updateAdminProduct = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    originalPrice: z.number(),
    discountPercentage: z.number(),
    prepTime: z.number(),
    imageGradient: z.string().optional(),
    profileImage: z.string().optional(),
    galleryImages: z.array(z.string()).optional(),
    sizesEnabled: z.boolean().optional(),
    sizes: z.array(z.object({ name: z.string(), price: z.number() })).optional(),
    ingredients: z.array(z.string()).optional(),
  }))
  .handler(async ({ data }) => {
    const product = baseProducts.find(p => p.id === data.id);
    if (product) {
      product.name = data.name;
      product.description = data.description;
      product.originalPrice = data.originalPrice;
      product.discountPercentage = data.discountPercentage;
      product.finalPrice = Math.round(data.originalPrice * (1 - data.discountPercentage / 100));
      product.prepTime = data.prepTime;
      if (data.imageGradient) product.imageGradient = data.imageGradient;
      if (data.profileImage !== undefined) product.profileImage = data.profileImage;
      if (data.galleryImages !== undefined) product.galleryImages = data.galleryImages;
      if (data.sizesEnabled !== undefined) product.sizesEnabled = data.sizesEnabled;
      if (data.sizes !== undefined) product.sizes = data.sizes.map((s, i) => ({ id: `s${i}-${Date.now()}`, ...s }));
      if (data.ingredients !== undefined) product.ingredients = data.ingredients;
    }
    return { success: true };
  });

export const createAdminProduct = createServerFn({ method: 'POST' })
  .validator(z.object({
    name: z.string(),
    description: z.string(),
    originalPrice: z.number(),
    discountPercentage: z.number(),
    prepTime: z.number(),
    imageGradient: z.string().optional(),
    categoryId: z.string(),
    profileImage: z.string().optional(),
    galleryImages: z.array(z.string()).optional(),
    sizesEnabled: z.boolean().optional(),
    sizes: z.array(z.object({ name: z.string(), price: z.number() })).optional(),
    ingredients: z.array(z.string()).optional(),
  }))
  .handler(async ({ data }) => {
    const newProduct: Product = {
      id: `p-${Date.now()}`,
      name: data.name,
      description: data.description,
      originalPrice: data.originalPrice,
      discountPercentage: data.discountPercentage,
      finalPrice: Math.round(data.originalPrice * (1 - data.discountPercentage / 100)),
      categoryId: data.categoryId,
      imageGradient: data.imageGradient || 'from-gray-400 to-gray-600',
      prepTime: data.prepTime,
      views: 0,
      sales: 0,
      sizesEnabled: data.sizesEnabled ?? false,
      status: 'ACTIVE',
      profileImage: data.profileImage || '',
      galleryImages: data.galleryImages || [],
      sizes: data.sizes ? data.sizes.map((s, i) => ({ id: `s${i}-${Date.now()}`, ...s })) : [],
      ingredients: data.ingredients || []
    };
    baseProducts.push(newProduct);
    return { success: true, id: newProduct.id };
  });

// --- توابع مدیریت دسته‌بندی ---

export const createCategory = createServerFn({ method: 'POST' })
  .validator(z.object({
    name: z.string().min(1),
    mainCategoryId: z.string(),
    hasSizes: z.boolean().optional(),
    sizeNames: z.array(z.string()).optional()
  }))
  .handler(async ({ data }) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: data.name,
      slug: data.name.replace(/\s+/g, '-').toLowerCase(),
      mainCategoryId: data.mainCategoryId,
      hasSizes: data.hasSizes || false,
      sizeNames: data.hasSizes ? (data.sizeNames || []) : undefined
    }
    categories.push(newCat)
    return { success: true, categories }
  })

export const updateCategory = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string(),
    name: z.string(),
    mainCategoryId: z.string(),
    hasSizes: z.boolean().optional(),
    sizeNames: z.array(z.string()).optional()
  }))
  .handler(async ({ data }) => {
    const cat = categories.find(c => c.id === data.id)
    if (cat) {
      cat.name = data.name
      cat.slug = data.name.replace(/\s+/g, '-').toLowerCase()
      cat.mainCategoryId = data.mainCategoryId
      if (data.hasSizes !== undefined) cat.hasSizes = data.hasSizes
      cat.sizeNames = data.hasSizes ? (data.sizeNames || []) : undefined
    }
    return { success: true, categories }
  })

export const deleteCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    // جلوگیری از یتیم شدن محصولات
    if (baseProducts.some(p => p.categoryId === data.id)) {
      return { success: false, message: 'ابتدا محصولات این دسته را منتقل یا حذف کنید', categories };
    }
    const index = categories.findIndex(c => c.id === data.id);
    if (index !== -1) categories.splice(index, 1);
    return { success: true, categories };
  })