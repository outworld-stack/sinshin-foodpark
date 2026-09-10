// src/components/shared/MapPicker.tsx
import { memo, useState, useCallback } from 'react'
import { Pin } from 'reicon-react'

interface MapPickerProps {
  /** مختصات انتخاب‌شده (تهی = هنوز انتخاب نشده) */
  value: { lat: number; lng: number } | null
  onChange: (coords: { lat: number; lng: number }) => void
}

// انتخابگر موقعیت — واحد (به‌جای کپی تو دو مودال آدرس)
// کنترل‌شده: والد مختصات را نگه می‌دارد؛ پین داخلی است و با remount ریست می‌شود
// نقشه موک — فاز بک: نقشه واقعی (نشان/بلد)
export const MapPicker = memo(function MapPicker({ value, onChange }: MapPickerProps) {
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPin({ x, y })
    onChange({ lat: 35.6892 + (y - 200) / 1000, lng: 51.3890 + (x - 200) / 1000 })
  }, [onChange])

  return (
    <div>
      <label className="block text-sm font-DanaMedium text-gray-700 dark:text-gray-300 mb-2">انتخاب موقعیت روی نقشه</label>
      <div
        onClick={handleClick}
        className="relative w-full h-48 rounded-xl overflow-hidden cursor-crosshair bg-gray-100 dark:bg-[#1a0a0e] border border-gray-300 dark:border-white/10"
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[20px_20px]"></div>
        {pin && (
          <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: pin.x, top: pin.y }}>
            <Pin size={32} className="text-primary dark:text-dark-primary drop-shadow-lg" />
          </div>
        )}
        {!pin && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm font-DanaMedium pointer-events-none">
            {value ? 'برای تغییر موقعیت کلیک کنید' : 'برای انتخاب موقعیت کلیک کنید'}
          </div>
        )}
      </div>
      {value && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-DanaMedium" dir="ltr">
          {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
    </div>
  )
})