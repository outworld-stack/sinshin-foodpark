// src/server/about.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { AboutContent, AboutContentInput } from '#/types/site/about'
import { assertMainAdmin, roleSchema } from '#/server/guards'

let mockAbout: AboutContent = {
  heroTitle: 'درباره سین‌شین',
  heroText: 'سین‌شین از سال ۱۳۹۶، در ابتدای خیابان پاسداران انزلی، با یک ایده ساده شروع شد: ساختن تجربه‌ای متفاوت از طعم، کیفیت و حس نوستالژی...',
  heroGradient: 'from-orange-400 to-red-500',
  teamTitle: 'کادر سین شین',
  teamGradient: 'from-purple-400 to-pink-500',
  teamAlt: 'تیم و کادر رستوران سین‌شین در انزلی',
  updatedAt: new Date(),
}

// اسکیمای مشترک — منبع واحد اعتبارسنجی
const aboutContentSchema = z.object({
  heroTitle: z.string().min(1, 'عنوان الزامی است'),
  heroText: z.string().min(50, 'متن داستان حداقل ۵۰ کاراکتر است'),
  heroGradient: z.string().min(1),
  teamTitle: z.string().min(1),
  teamGradient: z.string().min(1),
  teamAlt: z.string().min(1),
})

// یک گیرنده برای سایت و پنل (DRY — getAdminAboutContent ادغام شد)
export const getAboutContent = createServerFn({ method: 'GET' })
  .handler(async () => mockAbout)

export const updateAboutContent = createServerFn({ method: 'POST' })
  .validator(aboutContentSchema.extend({ role: roleSchema }))
  .handler(async ({ data }) => {
    assertMainAdmin(data.role)
    const { role: _role, ...fields } = data
    mockAbout = { ...mockAbout, ...fields, updatedAt: new Date() }
    return { success: true }
  })

// تایپ ورودی از اسکیما استخراج می‌شود تا با types/site/about هم‌خوان بماند
export type { AboutContentInput }