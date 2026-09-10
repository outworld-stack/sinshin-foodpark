// src/routes/products/$productId.tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { productByIdOptions, productReviewsOptions } from '#/utils/queryOptions'
import { Gallery } from '#/components/Gallery'
import { useProductPage } from '#/hooks/site/useProductPage'
import { ProductInfo } from '#/components/site/product-detail/ProductInfo'
import { ProductPriceBox } from '#/components/site/product-detail/ProductPriceBox'
import { ProductMobileBar } from '#/components/site/product-detail/ProductMobileBar'
import { ProductIngredients } from '#/components/site/product-detail/ProductIngredients'
import { ProductReviews } from '#/components/site/product-detail/ProductReviews'
import { ProductDetailSkeleton } from '#/components/LoadingSkeletons'
import { RouteError, RouteNotFound } from '#/components/shared/RouteFallbacks'
import { ChevronRight } from 'reicon-react'
import { useQuery } from '@tanstack/react-query'
import { useBack } from '#/hooks/useBack'
import { ProductSizeSelector } from '#/components/site/product-detail/ProductSizeSelector'

export const Route = createFileRoute('/products/$productId')({
  component: ProductDetailPage,

  // SSR + کش — محصول و نظرات با هم در query cache قبل از رندر:
  // • HTML کامل (شامل نظرات) برای کرالر
  // • برگشت به همین صفحه → آنی از کش (gcTime ۵ دقیقه)
  // • خطای نظرات صفحه رو نمی‌شکنه — محصول مهم‌تره
  loader: async ({ context, params }) => {
    const [product] = await Promise.all([
      context.queryClient.ensureQueryData(productByIdOptions(params.productId)),
      context.queryClient
        .ensureQueryData(productReviewsOptions(params.productId))
        .catch(() => undefined),
    ])
    // اگر محصول نبود → 404 رسمی (قدرت TanStack)
    if (!product) {
      throw notFound()
    }
    return product
  },

  pendingComponent: ProductDetailSkeleton,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,

  // SEO داینامیک — اسم محصول در title و description (مهم‌ترین صفحه برای گوگل)
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
        { title: `${loaderData.name} | سین شین` },
        { name: 'description', content: loaderData.description },
        { property: 'og:title', content: `${loaderData.name} | سین شین` },
        { property: 'og:description', content: loaderData.description },
        { property: 'og:type', content: 'product' },
      ]
      : [{ title: 'محصول یافت نشد | سین شین' }],
  }),
});


function ProductDetailPage() {
  // دیتا از loader — بدون useQuery
  const product = Route.useLoaderData()
  const back = useBack('/products')
  const page = useProductPage(product)

  // گالری — عکس‌های محصول یا پیش‌فرض
  const galleryImages = product.galleryImages?.length
    ? product.galleryImages
    : [product.imageGradient, 'from-blue-400 to-purple-500', 'from-green-400 to-teal-500', 'from-orange-400 to-red-500']

  // نظرات — فکتوری مرکزی؛ loader پرش کرده → سمت سرور رندر می‌شه
  const { data: reviews } = useQuery(productReviewsOptions(product.id))
  return (
    <div className="py-10 px-4 max-w-6xl mx-auto pb-32 lg:pb-10">

      <button
        type="button"
        onClick={back}
        className="flex items-center cursor-pointer gap-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-dark-primary transition mb-8 font-DanaMedium w-fit"
      >
        <ChevronRight size={20} />
        بازگشت
      </button>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

        {/* ستون اطلاعات — سمت راست */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <ProductInfo product={product} />
          {page.hasSizes && (
            <ProductSizeSelector
              sizes={product.sizes}
              selectedSizeId={page.selectedSizeId}
              onSelect={page.handleSelectSize}
            />
          )}
          <ProductPriceBox
            totalPrice={page.totalPrice}
            originalTotal={page.originalTotal}
            hasDiscount={page.hasDiscount}
            quantity={page.quantity}
            onIncrement={page.handleIncrement}
            onDecrement={page.handleDecrement}
            onAddToCart={page.handleAddToCart}
          />
        </div>

        {/* گالری — سمت چپ */}
        <div className="w-full lg:w-1/2 lg:pt-14">
          <Gallery images={galleryImages} />
        </div>
      </div>

      <ProductIngredients ingredients={product.ingredients || []} />

      {/* آیتم ۹: نظرات تأییدشده */}
      <ProductReviews reviews={reviews ?? []} />

      {/* نوار موبایل */}
      <ProductMobileBar
        totalPrice={page.totalPrice}
        originalTotal={page.originalTotal}
        hasDiscount={page.hasDiscount}
        quantity={page.quantity}
        onIncrement={page.handleIncrement}
        onDecrement={page.handleDecrement}
        onAddToCart={page.handleAddToCart}
      />
    </div>
  )
};