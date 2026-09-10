// src/server/articles.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  hasSubCategories: boolean;
  subCategories: { id: string; name: string; slug: string }[];
}

export interface ArticleProcess {
  id: string;
  title: string;
  items: string[];
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageGradient: string;
  galleryGradients: string[];
  profileImage: string;
  galleryImages: string[];
  author: string;
  publishedAt: Date;
  categoryId: string;
  subCategoryId?: string | null;
  views: number;
  status: 'ACTIVE' | 'INACTIVE';
  processes: ArticleProcess[];
  // فیلدهای مجازی برای فرانت‌اند
  categorySlug?: string;
  categoryName?: string;
  subCategorySlug?: string;
  subCategoryName?: string;
}

const articleCategories: ArticleCategory[] = [
  {
    id: 'ac-1', name: 'آشپزی', slug: 'cooking', hasSubCategories: true, subCategories: [
      { id: 'sc-1', name: 'پیتزا', slug: 'pizza' },
      { id: 'sc-2', name: 'کباب', slug: 'kebab' },
      { id: 'sc-3', name: 'ساندویچ', slug: 'sandwich' },
      { id: 'sc-4', name: 'غذاهای محلی', slug: 'local' },
    ]
  },
  { id: 'ac-2', name: 'رژیم غذایی', slug: 'diet', hasSubCategories: false, subCategories: [] },
  { id: 'ac-3', name: 'معرفی رستوران', slug: 'restaurant', hasSubCategories: false, subCategories: [] },
  { id: 'ac-4', name: 'نکات طلایی', slug: 'tips', hasSubCategories: false, subCategories: [] },
];

let mockArticles: Article[] = [
  {
    id: 'a-1', title: '۵ نکته طلایی برای پختن پیتزا خانگی', excerpt: 'اگر عاشق پیتزا هستید اما نمی‌خواهید بیرون غذا بخورید، این نکات را حتما بخوانید.', content: 'متن کامل...', imageGradient: 'from-orange-400 to-red-500', galleryGradients: ['from-orange-400 to-red-500'], profileImage: '', galleryImages: [], author: 'سارا محمدی', publishedAt: new Date('2024-05-15'), categoryId: 'ac-1', subCategoryId: 'sc-1', views: 250, status: 'ACTIVE',
    processes: [{ id: 'p-1', title: 'مراحل آماده‌سازی', items: ['خمیر را استراحت دهید', 'سس را آماده کنید'] }]
  },
  {
    id: 'a-2', title: 'برترین غذاهای رژیمی', excerpt: 'در این مقاله چند غذای خوشمزه و کم‌کالری را معرفی می‌کنیم.', content: 'متن کامل...', imageGradient: 'from-green-400 to-teal-500', galleryGradients: ['from-green-400 to-teal-500'], profileImage: '', galleryImages: [], author: 'دکتر رضایی', publishedAt: new Date('2024-06-01'), categoryId: 'ac-2', views: 180, status: 'ACTIVE',
    processes: []
  },
];

// --- توابع بخش کاربر ---

export const getArticleCategories = createServerFn({ method: 'GET' }).handler(async () => {
  return articleCategories;
});

export const getArticles = createServerFn({ method: 'GET' })
  .validator(z.object({ categorySlug: z.string().optional(), subCategorySlug: z.string().optional() }))
  .handler(async ({ data }) => {
    let filtered = mockArticles;
    let targetSubCategoryId: string | null = null;

    if (data.categorySlug && data.categorySlug !== 'all') {
      const category = articleCategories.find(c => c.slug === data.categorySlug);
      if (!category) return [];
      filtered = filtered.filter(a => a.categoryId === category.id);

      if (data.subCategorySlug && data.subCategorySlug !== 'all') {
        const sub = category.subCategories?.find(s => s.slug === data.subCategorySlug);
        if (sub) targetSubCategoryId = sub.id;
        else return [];
      }
    }

    if (targetSubCategoryId) {
      filtered = filtered.filter(a => a.subCategoryId === targetSubCategoryId);
    }

    return filtered.filter(a => a.status === 'ACTIVE').map(a => {
      const cat = articleCategories.find(c => c.id === a.categoryId);
      const sub = cat?.subCategories?.find(s => s.id === a.subCategoryId);
      return {
        ...a,
        categorySlug: cat?.slug,
        categoryName: cat?.name,
        subCategorySlug: sub?.slug,
        subCategoryName: sub?.name,
      };
    });
  });

// --- توابع پنل ادمین ---

export const getAdminArticles = createServerFn({ method: 'GET' }).handler(async () => {
  return mockArticles;
});

export const createArticle = createServerFn({ method: 'POST' })
  .validator(z.object({
    title: z.string(), excerpt: z.string(), content: z.string(),
    profileImage: z.string().optional(), galleryImages: z.array(z.string()).optional(),
    categoryId: z.string(), subCategoryId: z.string().nullable(),
    processes: z.array(z.object({ title: z.string(), items: z.array(z.string()) }))
  }))
  .handler(async ({ data }) => {
    const newArticle: Article = {
      id: `a-${Date.now()}`,
      title: data.title, excerpt: data.excerpt, content: data.content,
      imageGradient: 'from-gray-400 to-gray-600', galleryGradients: [],
      profileImage: data.profileImage || '', galleryImages: data.galleryImages || [],
      categoryId: data.categoryId, subCategoryId: data.subCategoryId,
      processes: data.processes.map((p, i) => ({ id: `p-${i}-${Date.now()}`, ...p })),
      author: 'ادمین', publishedAt: new Date(), views: 0, status: 'ACTIVE'
    };
    mockArticles.unshift(newArticle);
    return { success: true };
  });

export const deleteArticle = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    mockArticles = mockArticles.filter(a => a.id !== data.id);
    return { success: true };
  });

export const toggleArticleStatus = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const article = mockArticles.find(a => a.id === data.id);
    if (article) article.status = article.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return { success: true };
  });

export const getAdminArticleDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    return mockArticles.find(a => a.id === data.id) || null;
  });

export const updateArticle = createServerFn({ method: 'POST' })
  .validator(z.object({
    id: z.string(), title: z.string(), excerpt: z.string(), content: z.string(),
    profileImage: z.string().optional(), galleryImages: z.array(z.string()).optional(),
    categoryId: z.string(), subCategoryId: z.string().nullable(),
    processes: z.array(z.object({ title: z.string(), items: z.array(z.string()) }))
  }))
  .handler(async ({ data }) => {
    const article = mockArticles.find(a => a.id === data.id);
    if (article) {
      article.title = data.title;
      article.excerpt = data.excerpt;
      article.content = data.content;
      if (data.profileImage !== undefined) article.profileImage = data.profileImage;
      if (data.galleryImages !== undefined) article.galleryImages = data.galleryImages;
      article.categoryId = data.categoryId;
      article.subCategoryId = data.subCategoryId;
      article.processes = data.processes.map((p, i) => ({ id: `p-${i}-${Date.now()}`, ...p }));
    }
    return { success: true };
  });

export const createArticleCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string(), hasSubCategories: z.boolean().optional(), subCategories: z.array(z.string()).optional() }))
  .handler(async ({ data }) => {
    const newCat: ArticleCategory = {
      id: `ac-${Date.now()}`, name: data.name, slug: data.name.replace(/\s+/g, '-').toLowerCase(),
      hasSubCategories: data.hasSubCategories || false,
      subCategories: data.hasSubCategories ? (data.subCategories || []).map(s => ({ id: `sc-${Date.now()}`, name: s, slug: s.replace(/\s+/g, '-').toLowerCase() })) : []
    };
    articleCategories.push(newCat);
    return { success: true };
  });

export const updateArticleCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), name: z.string(), hasSubCategories: z.boolean().optional(), subCategories: z.array(z.string()).optional() }))
  .handler(async ({ data }) => {
    const cat = articleCategories.find(c => c.id === data.id);
    if (cat) {
      cat.name = data.name; cat.slug = data.name.replace(/\s+/g, '-').toLowerCase();
      cat.hasSubCategories = data.hasSubCategories || false;
      cat.subCategories = data.hasSubCategories ? (data.subCategories || []).map(s => ({ id: `sc-${Date.now()}`, name: s, slug: s })) : [];
    }
    return { success: true };
  });

export const deleteArticleCategory = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    // جلوگیری از یتیم شدن مقالات — مثل دسته‌های محصولات
    if (mockArticles.some(a => a.categoryId === data.id)) {
      return { success: false, message: 'ابتدا مقالات این دسته را منتقل یا حذف کنید' };
    }
    const index = articleCategories.findIndex(c => c.id === data.id);
    if (index !== -1) articleCategories.splice(index, 1);
    return { success: true };
  });

// جزئیات مقاله — فقط فعال (برای سایت عمومی؛ مقاله غیرفعال از URL مستقیم هم نباید دیده شه)
export const getArticleById = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const article = mockArticles.find(a => a.id === data.id && a.status === 'ACTIVE')
    if (!article) return null
    // فیلدهای مجازی دسته‌بندی — مثل لیست
    const cat = articleCategories.find(c => c.id === article.categoryId)
    const sub = cat?.subCategories?.find(s => s.id === article.subCategoryId)
    return {
      ...article,
      categorySlug: cat?.slug,
      categoryName: cat?.name,
      subCategorySlug: sub?.slug,
      subCategoryName: sub?.name,
    }
  });