'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { api } from '@/lib/api'
import type { Notification } from '@/types'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function NotificationBell({ token }: { token: string }) {
  const [items, setItems]   = useState<Notification[]>([])
  const [open, setOpen]     = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)

  const load = async () => {
    try { setItems(await api.notifications.list(token)) } catch {}
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [token])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open && items.length > 0) {
      api.notifications.readAll(token).then(() => setItems([])).catch(() => {})
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors"
      >
        <Bell className="w-4 h-4 text-gray-600" />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {items.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{items.length} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">All caught up</p>
              </div>
            ) : (
              items.map(n => (
                <div key={n.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
