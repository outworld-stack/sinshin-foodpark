// src/server/gallery.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  GalleryImage, GallerySpan
} from '#/types/site/gallery'
import { assertMainAdmin, roleSchema } from '#/server/guards'

let mockGallery: GalleryImage[] = [
  { id: 'g-1', src: 'from-orange-400 to-red-500', alt: 'فضای رستوران سین‌شین ۱', span: 'wide', sortOrder: 1, isActive: true },
  { id: 'g-2', src: 'from-yellow-400 to-orange-500', alt: 'فضای رستوران سین‌شین ۲', span: 'normal', sortOrder: 2, isActive: true },
  { id: 'g-3', src: 'from-green-400 to-teal-500', alt: 'غذاهای سین‌شین ۱', span: 'normal', sortOrder: 3, isActive: true },
  { id: 'g-4', src: 'from-purple-400 to-pink-500', alt: 'غذاهای سین‌شین ۲', span: 'normal', sortOrder: 4, isActive: true },
  { id: 'g-5', src: 'from-blue-400 to-cyan-300', alt: 'نوشیدنی‌های سین‌شین', span: 'normal', sortOrder: 5, isActive: true },
]

// --- اسکیماهای پایه (DRY) ---
const spanSchema = z.enum(['wide', 'normal'] satisfies z.ZodType<GallerySpan> extends never ? never : ['wide', 'normal'])

const addImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1, 'متن جایگزین الزامی است'),
  span: spanSchema,
})

const updateImageSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1).optional(),
  alt: z.string().min(1).optional(),
  span: spanSchema.optional(),
  isActive: z.boolean().optional(),
})

const reorderImageSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(['up', 'down']),
})

const bySortOrder = (a: GalleryImage, b: GalleryImage) => a.sortOrder - b.sortOrder

// --- عمومی (سایت) ---
export const getGalleryImages = createServerFn({ method: 'GET' })
  .handler(async () => mockGallery.filter(g => g.isActive).sort(bySortOrder))

// --- ادمین ---
export const getAdminGalleryImages = createServerFn({ method: 'GET' })
  .handler(async () => [...mockGallery].sort(bySortOrder))

export const addGalleryImage = createServerFn({ method: 'POST' })
  .validator(addImageSchema.extend({ role: roleSchema }))
  .handler(async ({ data }) => {
    assertMainAdmin(data.role)
    const { role: _role, ...fields } = data
    mockGallery.push({
      id: `g-${Date.now()}`,
      ...fields,
      sortOrder: mockGallery.length + 1,
      isActive: true,
    })
    return { success: true }
  })

export const updateGalleryImage = createServerFn({ method: 'POST' })
  .validator(updateImageSchema.extend({ role: roleSchema }))
  .handler(async ({ data }) => {
    assertMainAdmin(data.role)
    const { role: _role, ...fields } = data
    const img = mockGallery.find(g => g.id === fields.id)
    if (img) Object.assign(img, fields)
    return { success: true }
  })

export const deleteGalleryImage = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), role: roleSchema }))
  .handler(async ({ data }) => {
    assertMainAdmin(data.role)
    mockGallery = mockGallery.filter(g => g.id !== data.id)
    return { success: true }
  })

export const reorderGalleryImage = createServerFn({ method: 'POST' })
  .validator(reorderImageSchema.extend({ role: roleSchema }))
  .handler(async ({ data }) => {
    assertMainAdmin(data.role)
    const sorted = [...mockGallery].sort(bySortOrder)
    const idx = sorted.findIndex(g => g.id === data.id)
    const swapIdx = data.direction === 'up' ? idx - 1 : idx + 1
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return { success: false }
    const temp = sorted[idx].sortOrder
    sorted[idx].sortOrder = sorted[swapIdx].sortOrder
    sorted[swapIdx].sortOrder = temp
    return { success: true }
  })