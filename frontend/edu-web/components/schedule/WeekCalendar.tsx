'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const GRID_START = 6
const GRID_END = 22
const HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => i + GRID_START)
const HOUR_H = 64
const TIME_COL_W = 56

const CLASS_COLORS = [
  '#3B4FE8', '#16A34A', '#9333EA', '#0891B2', '#E04828', '#DC2626',
]

function fmtHour(h: number) {
  if (h === 12) return '12 pm'
  return h < 12 ? `${h} am` : `${h - 12} pm`
}

export interface CalSession {
  id: string
  title: string
  status: string
  scheduledAt: string | null
  durationMinutes: number | null
  classroom: { id: string; name: string }
}

interface Positioned extends CalSession {
  top: number
  height: number
  col: number
  totalCols: number
}

function positionDay(sessions: CalSession[]): Positioned[] {
  const valid = sessions
    .filter(s => s.scheduledAt)
    .map(s => {
      const d = new Date(s.scheduledAt!)
      const startMin = d.getHours() * 60 + d.getMinutes()
      const dur = s.durationMinutes ?? 60
      return { s, startMin, endMin: startMin + dur }
    })
    .filter(({ startMin }) => {
      const h = Math.floor(startMin / 60)
      return h >= GRID_START && h < GRID_END
    })
    .sort((a, b) => a.startMin - b.startMin)

  // assign columns via interval-graph coloring
  const cols: number[] = []
  const endMinByCols: number[] = []

  const result: Positioned[] = valid.map(({ s, startMin, endMin }) => {
    const d = new Date(s.scheduledAt!)
    const top = (d.getHours() - GRID_START) * HOUR_H + (d.getMinutes() / 60) * HOUR_H
    const height = Math.max(((s.durationMinutes ?? 60) / 60) * HOUR_H, 28)

    let col = 0
    while (endMinByCols[col] !== undefined && endMinByCols[col] > startMin) col++
    endMinByCols[col] = endMin
    cols.push(col)

    return { ...s, top, height, col, totalCols: 1 }
  })

  // second pass: set totalCols to max col+1 for overlapping groups
  const maxCol = Math.max(0, ...cols)
  return result.map((r, i) => ({ ...r, totalCols: maxCol + 1 }))
}

interface WeekCalendarProps {
  weekStart: Date
  sessions: CalSession[]
  colorMap: Record<string, number>
  onSlotClick?: (isoDate: string, time: string) => void
  sessionHref: (id: string) => string
  accentColor: string
  canCreate?: boolean
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeekCalendar({
  weekStart, sessions, colorMap, onSlotClick, sessionHref, accentColor, canCreate,
}: WeekCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowTop, setNowTop] = useState<number | null>(null)
  const [nowDay, setNowDay] = useState<number | null>(null)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  }), [weekStart])

  const today = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0); return t
  }, [])

  // scroll to ~8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - GRID_START) * HOUR_H - 16
    }
  }, [])

  // current-time indicator
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      if (h >= GRID_START && h < GRID_END) {
        setNowTop((h - GRID_START) * HOUR_H + (m / 60) * HOUR_H)
        const dayIdx = days.findIndex(d => d.getTime() === today.getTime())
        setNowDay(dayIdx)
      } else {
        setNowTop(null)
        setNowDay(null)
      }
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [days, today])

  const sessionsByDay = useMemo(() => {
    const map: Record<string, CalSession[]> = {}
    days.forEach(d => {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      map[k] = []
    })
    sessions.forEach(s => {
      if (!s.scheduledAt) return
      const d = new Date(s.scheduledAt)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (map[k]) map[k].push(s)
    })
    return map
  }, [sessions, days])

  return (
    <div className="rounded-2xl bg-white overflow-hidden flex flex-col" style={{ border: '1px solid #E8E5DC', height: 'calc(100vh - 220px)', minHeight: 480 }}>
      {/* Day header row */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid #E8E5DC' }}>
        <div style={{ width: TIME_COL_W, minWidth: TIME_COL_W }} />
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime()
          return (
            <div key={i} className="flex-1 flex flex-col items-center py-3 gap-1"
              style={{ borderLeft: '1px solid #F5F3EE' }}>
              <span className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: isToday ? accentColor : '#9ca3af' }}>
                {DAY_NAMES[day.getDay()]}
              </span>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-colors"
                style={isToday
                  ? { background: accentColor === '#C5D000' ? '#0f0e0e' : accentColor, color: accentColor === '#C5D000' ? accentColor : 'white' }
                  : { color: '#374151' }}>
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto overflow-x-hidden">
        {/* Time gutter */}
        <div className="shrink-0 relative" style={{ width: TIME_COL_W }}>
          {HOURS.map(h => (
            <div key={h} className="flex items-start justify-end pr-2"
              style={{ height: HOUR_H, paddingTop: h === GRID_START ? 0 : undefined }}>
              {h !== GRID_START && (
                <span className="text-[10px] font-semibold -translate-y-2" style={{ color: '#c4c4c4' }}>
                  {fmtHour(h)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const k = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
          const daySessions = sessionsByDay[k] ?? []
          const positioned = positionDay(daySessions)
          const isToday = day.getTime() === today.getTime()

          return (
            <div key={di} className="flex-1 relative"
              style={{
                borderLeft: '1px solid #F5F3EE',
                background: isToday ? 'rgba(200,250,86,0.03)' : 'transparent',
              }}>

              {/* Hour lines */}
              {HOURS.map((h, hi) => (
                <div key={h}
                  className={canCreate ? 'cursor-pointer group' : ''}
                  style={{
                    height: HOUR_H,
                    borderTop: hi === 0 ? 'none' : '1px solid #F5F3EE',
                    position: 'relative',
                  }}
                  onClick={() => canCreate && onSlotClick?.(k, `${String(h).padStart(2, '0')}:00`)}>
                  {/* half-hour line */}
                  <div style={{
                    position: 'absolute', top: '50%', left: 0, right: 0,
                    height: 1, background: '#F9F8F6',
                  }} />
                  {canCreate && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(200,250,86,0.08)' }}>
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-dashed flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity"
                        style={{ borderColor: accentColor }}>
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                          style={{ color: accentColor }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Current time indicator */}
              {isToday && nowTop !== null && nowDay === di && (
                <div className="absolute left-0 right-0 flex items-center pointer-events-none"
                  style={{ top: nowTop, zIndex: 20 }}>
                  <div className="w-2 h-2 rounded-full shrink-0 -ml-1" style={{ background: '#EF4444' }} />
                  <div className="flex-1 h-px" style={{ background: '#EF4444' }} />
                </div>
              )}

              {/* Session blocks */}
              {positioned.map(s => {
                const colorIdx = colorMap[s.classroom.id] ?? 0
                const baseColor = s.status === 'live'
                  ? '#16A34A'
                  : s.status === 'ended'
                  ? '#9ca3af'
                  : CLASS_COLORS[colorIdx]

                const colW = 100 / s.totalCols
                const leftPct = s.col * colW

                return (
                  <Link key={s.id} href={sessionHref(s.id)}
                    className="absolute rounded-lg overflow-hidden flex flex-col transition-all hover:brightness-90 hover:shadow-md active:scale-[0.99]"
                    style={{
                      top: s.top + 2,
                      height: s.height - 4,
                      left: `calc(${leftPct}% + 3px)`,
                      width: `calc(${colW}% - 6px)`,
                      background: baseColor,
                      zIndex: 10,
                      padding: '4px 6px',
                    }}>
                    <p className="text-[11px] font-black text-white leading-tight truncate">{s.title}</p>
                    {s.height > 40 && (
                      <p className="text-[10px] text-white/70 truncate mt-0.5">
                        {new Date(s.scheduledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {s.durationMinutes
                          ? ` – ${new Date(new Date(s.scheduledAt!).getTime() + s.durationMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </p>
                    )}
                    {s.height > 60 && (
                      <p className="text-[10px] text-white/50 truncate mt-0.5">{s.classroom.name}</p>
                    )}
                    {s.status === 'live' && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
