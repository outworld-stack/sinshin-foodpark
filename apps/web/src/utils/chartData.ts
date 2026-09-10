// src/utils/chartData.ts
// ساخت داده‌ی نمودار استاندارد از سری ۳۰ روزه‌ی سرور
// بازه‌ها: روزانه ۶×۴ساعت | هفتگی شنبه-جمعه | ماهانه ۳۰ روز | سالانه ۱۲ ماه
import { JALALI_MONTHS } from '#/utils/persianDate'
import type { ChartData, ChartPoint } from '#/types/shared/chart'

const faNum = (n: number): string => n.toLocaleString('fa-IR')

// برچسب‌های استاندارد
export const HOUR_BUCKETS = ['۰۰-۰۴', '۰۴-۰۸', '۰۸-۱۲', '۱۲-۱۶', '۱۶-۲۰', '۲۰-۲۴']
export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

// الگوی توزیع ساعتی (سحر/صبح کم، ناهار و شب پیک — واقع‌گرایانه)
const HOUR_WEIGHTS = [0.1, 0.15, 0.4, 0.55, 0.8, 0.35]

// الگوی فصلی سالانه
const YEAR_WEIGHTS = [0.7, 0.85, 1.0, 1.1, 0.95, 1.15, 1.2, 1.05, 0.9, 1.0, 0.8, 0.65]

interface DailyRow {
  date: string   // 'YYYY-MM-DD'
  sales: number
}

export function buildChartData(series: DailyRow[]): ChartData {
  // مرتب از قدیمی به جدید
  const rows = [...series].sort((a, b) => a.date.localeCompare(b.date))

  // ── روزانه: ۶ بازه‌ی ۴ ساعته — توزیع آخرین روز (بک‌اند: تجمیع واقعی ساعتی)
  const lastValue = rows[rows.length - 1]?.sales ?? 0
  const wSum = HOUR_WEIGHTS.reduce((s, w) => s + w, 0)
  const daily: ChartPoint[] = HOUR_BUCKETS.map((label, i) => ({
    label,
    value: Math.round((lastValue * HOUR_WEIGHTS[i]) / wSum),
  }))

  // ── هفتگی: جمعِ ۷ روزِ اخیر روی روزِ هفته‌ی واقعی — ترتیب شنبه تا جمعه
  const last7 = rows.slice(-7)
  const weekBuckets = [0, 0, 0, 0, 0, 0, 0]   // ایندکس ۰ = شنبه
  for (const row of last7) {
    const [y, m, d] = row.date.split('-').map(Number)
    const jsDay = new Date(y, m - 1, d).getDay()   // ۰=یکشنبه … ۶=شنبه
    const weekIdx = (jsDay + 1) % 7                 // ۰=شنبه … ۶=جمعه
    weekBuckets[weekIdx] += row.sales
  }
  const weekly: ChartPoint[] = WEEKDAYS.map((label, i) => ({ label, value: weekBuckets[i] }))

  // ── ماهانه: ۳۰ روزِ اخیر — برچسب = شماره‌ی روزِ ماه
  const monthly: ChartPoint[] = rows.map(row => ({
    label: faNum(Number(row.date.slice(8, 10))),
    value: row.sales,
  }))

  // ── سالانه: ۱۲ ماه — میانگین ماهانه با الگوی فصلی (بک‌اند: تجمیع واقعی)
  const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.sales, 0) / rows.length : 0
  const approxMonth = avg * 30
  const yearly: ChartPoint[] = JALALI_MONTHS.map((label, i) => ({
    label,
    value: Math.round(approxMonth * YEAR_WEIGHTS[i]),
  }))

  return { daily, weekly, monthly, yearly }
}