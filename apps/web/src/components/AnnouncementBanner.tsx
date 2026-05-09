'use client'

export function AnnouncementBanner({ text, color }: { text?: string; color?: string }) {
  if (!text) return null
  return (
    <div style={{ background: color || '#E53935' }} className="w-full text-white text-sm py-2 px-3">
      📢 {text}
    </div>
  )
}
