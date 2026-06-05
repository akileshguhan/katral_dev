'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import {
  BookOpen, CalendarDays, Settings, LogOut,
  Plus, ChevronLeft, ChevronRight, ChevronDown, X, LayoutList, CalendarRange,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import WeekCalendar from '@/components/schedule/WeekCalendar'
import type { CalSession } from '@/components/schedule/WeekCalendar'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CLASS_DOTS = ['#3B4FE8','#16A34A','#9333EA','#0891B2','#E04828','#DC2626']

function toDateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(mins: number | null) {
  if (!mins) return ''
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins/60)}h${mins%60 ? ` ${mins%60}m` : ''}`
}
function weekSunday(date: Date): Date {
  const d = new Date(date); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d
}
function fmtWeekRange(sun: Date): string {
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6)
  if (sun.getMonth() === sat.getMonth())
    return `${MONTHS[sun.getMonth()]} ${sun.getDate()} – ${sat.getDate()}, ${sun.getFullYear()}`
  return `${MONTHS[sun.getMonth()]} ${sun.getDate()} – ${MONTHS[sat.getMonth()]} ${sat.getDate()}, ${sat.getFullYear()}`
}

type ClassroomWithSessions = Classroom & { sessions: Session[] }

interface ScheduleModalProps {
  classrooms: Classroom[]
  defaultDate: string
  defaultTime?: string
  token: string
  onCreated: (s: Session, classroomId: string) => void
  onClose: () => void
}

function ScheduleModal({ classrooms, defaultDate, defaultTime, token, onCreated, onClose }: ScheduleModalProps) {
  const [title, setTitle]           = useState('')
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? '')
  const [date, setDate]             = useState(defaultDate)
  const [time, setTime]             = useState(defaultTime ?? '09:00')
  const [duration, setDuration]     = useState(60)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !classroomId || !date || !time) return
    setSaving(true); setError('')
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString()
      const s = await api.sessions.create(token, classroomId, title.trim(), scheduledAt, duration)
      onCreated(s, classroomId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule session')
      setSaving(false)
    }
  }

  const durationLabel = (d: number) => d < 60 ? `${d}m` : d === 60 ? '1h' : d === 90 ? '1.5h' : '2h'

  const previewLabel = date && time
    ? `${new Date(`${date}T${time}`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${new Date(`${date}T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${durationLabel(duration)}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.26), 0 0 0 1px rgba(0,0,0,0.08)' }}>

        {/* Branded dark header */}
        <div className="px-6 pt-5 pb-5" style={{ background: '#0f0e0e' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#C5D000' }}>
                <CalendarDays className="w-4 h-4" style={{ color: '#0f0e0e' }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] mb-0.5"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>New session</p>
                <h2 className="text-base font-black leading-tight text-white">Schedule a session</h2>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10 mt-0.5"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Live preview strip */}
          {previewLabel && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#C5D000' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {previewLabel}
              </span>
            </div>
          )}
        </div>

        {/* Form body */}
        <form onSubmit={submit} className="px-6 py-5 space-y-4" style={{ background: 'white' }}>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 mb-2">
              Session title
            </label>
            <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chapter 5 Review"
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-300 outline-none transition-all"
              style={{ background: '#F7F6F3', border: '2px solid transparent' }}
              onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = '#C5D000'; e.target.style.boxShadow = '0 0 0 4px rgba(197,208,0,0.14)' }}
              onBlur={e => { e.target.style.background = '#F7F6F3'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none' }} />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 mb-2">
              Classroom
            </label>
            <div className="relative">
              <select value={classroomId} onChange={e => setClassroomId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 outline-none appearance-none cursor-pointer"
                style={{ background: '#F7F6F3', border: '2px solid transparent' }}>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 mb-2">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 outline-none"
                style={{ background: '#F7F6F3', border: '2px solid transparent' }} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 mb-2">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 outline-none"
                style={{ background: '#F7F6F3', border: '2px solid transparent' }} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 mb-2">Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map(d => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className="py-2.5 rounded-xl text-xs font-black transition-all"
                  style={duration === d
                    ? { background: '#0f0e0e', color: 'white', border: '2px solid #0f0e0e' }
                    : { background: '#F7F6F3', color: '#9ca3af', border: '2px solid transparent' }}>
                  {durationLabel(d)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-400" />
              <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-5 py-3 text-sm font-black text-gray-600 rounded-xl transition-all hover:bg-gray-200 active:scale-[0.97]"
              style={{ background: '#F7F6F3' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim() || !classroomId}
              className="flex-1 py-3 text-sm font-black rounded-xl transition-all disabled:opacity-40 hover:opacity-90 active:scale-[0.97] select-none"
              style={{ background: '#C5D000', color: '#0f0e0e' }}>
              {saving ? 'Scheduling…' : 'Schedule Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TeacherSchedule() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()

  const [data, setData]             = useState<ClassroomWithSessions[]>([])
  const [loading, setLoading]       = useState(true)
  const [viewYear, setViewYear]     = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth]   = useState(() => new Date().getMonth())
  const [weekStart, setWeekStart]   = useState<Date>(() => weekSunday(new Date()))
  const [selectedDate, setSelected] = useState<string | null>(null)
  const [showModal, setShowModal]   = useState(false)
  const [modalDate, setModalDate]   = useState('')
  const [modalTime, setModalTime]   = useState('09:00')
  const [menuOpen, setMenuOpen]     = useState(false)
  const [view, setView]             = useState<'week' | 'month' | 'list'>('week')
  const menuRef = useRef<HTMLDivElement>(null)

  const today    = new Date()
  const todayKey = toDateKey(today.toISOString())

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
    const token = session.apiToken
    api.classrooms.list(token).then(async classrooms => {
      const results = await Promise.all(
        classrooms.map(async c => ({
          ...c,
          sessions: await api.sessions.list(token, c.id).catch(() => [] as Session[]),
        }))
      )
      setData(results)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [session, status, router])

  const colorMap = useMemo(() => {
    const map: Record<string, number> = {}
    data.forEach((c, i) => { map[c.id] = i % CLASS_DOTS.length })
    return map
  }, [data])

  const allSessions = useMemo(() =>
    data.flatMap(c => c.sessions.filter(s => s.scheduledAt).map(s => ({ ...s, classroom: c }))),
    [data])

  const calSessions: CalSession[] = useMemo(() => allSessions.map(s => ({
    id: s.id, title: s.title, status: s.status,
    scheduledAt: s.scheduledAt ?? null,
    durationMinutes: s.durationMinutes ?? null,
    classroom: { id: s.classroom.id, name: s.classroom.name },
  })), [allSessions])

  const sessionsByDate = useMemo(() => {
    const map: Record<string, typeof allSessions> = {}
    allSessions.forEach(s => { const k = toDateKey(s.scheduledAt!); (map[k] ??= []).push(s) })
    return map
  }, [allSessions])

  const groupedSessions = useMemo(() => {
    const sorted = [...allSessions].sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    const groups: Array<{ dateKey: string; label: string; sessions: typeof allSessions }> = []
    sorted.forEach(s => {
      const key = toDateKey(s.scheduledAt!)
      let g = groups.find(g => g.dateKey === key)
      if (!g) {
        const d = new Date(key + 'T00:00:00')
        g = { dateKey: key, label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), sessions: [] }
        groups.push(g)
      }
      g.sessions.push(s)
    })
    return groups
  }, [allSessions])

  // month calendar cells
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => viewMonth === 0 ? (setViewYear(y => y-1), setViewMonth(11)) : setViewMonth(m => m-1)
  const nextMonth = () => viewMonth === 11 ? (setViewYear(y => y+1), setViewMonth(0)) : setViewMonth(m => m+1)
  const prevWeek  = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate()-7); return d })
  const nextWeek  = () => setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate()+7); return d })
  const goToday   = () => { const t = new Date(); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); setWeekStart(weekSunday(t)) }

  const selectedSessions = selectedDate ? (sessionsByDate[selectedDate] ?? []) : []
  const upcomingSessions = allSessions
    .filter(s => new Date(s.scheduledAt!) > today && s.status !== 'ended')
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 5)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const initials = (session?.user?.name ?? 'T').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()

  const nav = [
    { icon: <BookOpen className="w-4 h-4" />,     label: 'Classrooms', href: '/teacher/dashboard' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Schedule',   href: '/teacher/schedule'  },
    { icon: <Settings className="w-4 h-4" />,     label: 'Settings',   href: '/teacher/settings'  },
  ]

  function openModal(date: string, time?: string) {
    setModalDate(date); setModalTime(time ?? '09:00'); setShowModal(true)
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: '#E8EDE5', color: '#0f0e0e' }}>
      <header className="sticky top-0 z-40 bg-white flex items-center justify-between px-6 h-16"
        style={{ borderBottom: '1px solid #E8E5DC' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0f0e0e' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-black text-sm tracking-tight" style={{ color: '#0f0e0e' }}>Kattral Academy</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.apiToken && <NotificationBell token={session.apiToken} />}
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 rounded-full text-[#0f0e0e] text-xs font-black flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: '#C5D000' }}>
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-60 bg-white rounded-xl py-1 z-50"
                style={{ border: '1px solid #E8E5DC', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E5DC' }}>
                  <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 break-all">{session?.user?.email}</p>
                </div>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <LogOut className="w-4 h-4 text-gray-400" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] px-3 py-4 flex flex-col gap-2.5"
          style={{ background: '#F5F4F0', borderRight: '1px solid rgba(15,14,14,0.06)' }}>
          <div className="rounded-2xl bg-white px-2 py-2">
            {nav.map(({ icon, label, href }) => (
              <Link key={label} href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  pathname === href ? 'text-white' : 'text-gray-500 hover:bg-[#F5F3EE] hover:text-gray-900'
                }`}
                style={pathname === href ? { background: '#0f0e0e' } : {}}>
                {icon} {label}
              </Link>
            ))}
          </div>
          <div className="mt-auto rounded-2xl px-4 py-3" style={{ background: '#EAE8E3' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Educator Portal</p>
            <p className="text-xs font-semibold text-gray-600">{(session?.user?.name ?? '').split(' ')[0] || 'Teacher'}</p>
          </div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <div className="px-8 py-6">

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <button onClick={goToday}
                  className="text-xs font-black px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 transition-colors"
                  style={{ border: '1px solid #E8E5DC' }}>
                  Today
                </button>
                <button onClick={view === 'week' ? prevWeek : prevMonth}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center bg-white"
                  style={{ border: '1px solid #E8E5DC' }}>
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={view === 'week' ? nextWeek : nextMonth}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center bg-white"
                  style={{ border: '1px solid #E8E5DC' }}>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-sm font-black text-gray-900 ml-1">
                  {view === 'week' ? fmtWeekRange(weekStart) : `${MONTHS[viewMonth]} ${viewYear}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-xl" style={{ background: '#F5F3EE' }}>
                  {(['week','month','list'] as const).map(v => (
                    <button key={v} onClick={() => setView(v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                      }`}>
                      {v === 'week' && <CalendarRange className="w-3.5 h-3.5" />}
                      {v === 'month' && <CalendarDays className="w-3.5 h-3.5" />}
                      {v === 'list' && <LayoutList className="w-3.5 h-3.5" />}
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                <button onClick={() => openModal(todayKey)}
                  className="flex items-center gap-2 font-black text-sm px-4 py-2 rounded-xl transition-all active:scale-[0.97] select-none"
                  style={{ background: '#C5D000', color: '#0f0e0e' }}>
                  <Plus className="w-4 h-4" /> Schedule
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-[520px] rounded-2xl animate-pulse" style={{ background: '#E8E5DC' }} />
            ) : view === 'week' ? (
              <WeekCalendar
                weekStart={weekStart}
                sessions={calSessions}
                colorMap={colorMap}
                onSlotClick={(date, time) => openModal(date, time)}
                sessionHref={id => `/teacher/session/${id}`}
                accentColor="#C5D000"
                canCreate
              />

            ) : view === 'month' ? (
              <div className="grid grid-cols-3 gap-5">
                <div className="col-span-2 rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
                  <div className="grid grid-cols-7 px-4 pt-4" style={{ borderBottom: '1px solid #F5F3EE' }}>
                    {DAYS.map(d => <div key={d} className="text-center text-[11px] font-black text-gray-300 uppercase tracking-wider pb-3">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 p-3 gap-1">
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} className="min-h-[96px]" />
                      const key = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                      const isToday = key === todayKey, isSelected = key === selectedDate
                      const sess = sessionsByDate[key] ?? [], visible = sess.slice(0,2), overflow = sess.length - 2
                      return (
                        <button key={i} onClick={() => setSelected(isSelected ? null : key)}
                          className={`relative flex flex-col items-start p-2 min-h-[96px] rounded-xl transition-colors text-left w-full ${!isSelected && !isToday ? 'hover:bg-[#F5F3EE]' : ''}`}
                          style={{ background: isSelected ? '#0f0e0e' : isToday ? '#F5FFD4' : undefined, outline: isSelected ? 'none' : isToday ? '1.5px solid #C5D000' : 'none' }}>
                          <span className={`text-xs font-black mb-1.5 w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${isSelected ? 'text-white' : isToday ? 'text-[#0f0e0e]' : 'text-gray-600'}`}
                            style={isToday && !isSelected ? { background: '#C5D000' } : {}}>
                            {day}
                          </span>
                          {visible.map(s => (
                            <div key={s.id} className="w-full flex items-center gap-1 mb-0.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: isSelected ? 'rgba(255,255,255,0.6)' : s.status === 'live' ? '#16A34A' : s.status === 'ended' ? '#9ca3af' : CLASS_DOTS[colorMap[s.classroom.id] ?? 0] }} />
                              <span className={`text-[10px] font-semibold truncate ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>{s.title}</span>
                            </div>
                          ))}
                          {overflow > 0 && <span className={`text-[10px] ${isSelected ? 'text-white/50' : 'text-gray-400'}`}>+{overflow} more</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #F5F3EE' }}>
                      <p className="text-xs font-black text-gray-900">
                        {selectedDate ? new Date(selectedDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}) : 'Select a day'}
                      </p>
                      {selectedDate && (
                        <button onClick={() => openModal(selectedDate)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#F5F3EE' }}>
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-3 min-h-[120px]">
                      {!selectedDate ? <p className="text-xs text-gray-400 pt-2">Click a day to see sessions</p>
                        : selectedSessions.length === 0 ? (
                          <div className="pt-2 space-y-2">
                            <p className="text-xs text-gray-400">No sessions scheduled</p>
                            <button onClick={() => openModal(selectedDate)} className="flex items-center gap-1 text-xs font-black" style={{color:'#0f0e0e'}}>
                              <Plus className="w-3.5 h-3.5" /> Schedule one
                            </button>
                          </div>
                        ) : selectedSessions.map(s => (
                          <div key={s.id} className="flex items-start gap-2.5 py-2" style={{ borderBottom: '1px solid #F5F3EE' }}>
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                              style={{ background: s.status === 'live' ? '#16A34A' : s.status === 'ended' ? '#9ca3af' : CLASS_DOTS[colorMap[s.classroom.id]??0] }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-gray-900 truncate">{s.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(s.scheduledAt!)} {fmtDuration(s.durationMinutes) && `· ${fmtDuration(s.durationMinutes)}`}</p>
                              <p className="text-[10px] text-gray-400 truncate">{s.classroom.name}</p>
                            </div>
                            {s.status !== 'ended' && (
                              <Link href={`/teacher/session/${s.id}`} className="shrink-0 text-[10px] font-black text-white px-2 py-1 rounded-md" style={{ background: '#0f0e0e' }}>
                                {s.status === 'live' ? 'Rejoin' : 'Start'}
                              </Link>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid #F5F3EE' }}>
                      <p className="text-xs font-black text-gray-900">Upcoming</p>
                    </div>
                    {upcomingSessions.length === 0
                      ? <p className="px-4 py-4 text-xs text-gray-400">No upcoming sessions</p>
                      : upcomingSessions.map(s => (
                        <div key={s.id} className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-[#FAFAF8] cursor-pointer"
                          style={{ borderBottom: '1px solid #F5F3EE' }}
                          onClick={() => { const k=toDateKey(s.scheduledAt!); setSelected(k); setViewYear(new Date(s.scheduledAt!).getFullYear()); setViewMonth(new Date(s.scheduledAt!).getMonth()); setView('month') }}>
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: CLASS_DOTS[colorMap[s.classroom.id]??0] }} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{s.title}</p>
                            <p className="text-[10px] text-gray-400">{new Date(s.scheduledAt!).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {fmtTime(s.scheduledAt!)}</p>
                            <p className="text-[10px] text-gray-400 truncate">{s.classroom.name}</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>

            ) : (
              <div className="max-w-2xl">
                {groupedSessions.length === 0 ? (
                  <div className="rounded-2xl bg-white px-8 py-16 text-center" style={{ border: '1px solid #E8E5DC' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#F5F3EE' }}>
                      <CalendarDays className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-black text-gray-900 mb-1">No sessions yet</p>
                    <p className="text-xs text-gray-400 mb-4">Schedule your first session to see it here</p>
                    <button onClick={() => openModal(todayKey)} className="inline-flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-full" style={{ background: '#C5D000', color: '#0f0e0e' }}>
                      <Plus className="w-4 h-4" /> Schedule Session
                    </button>
                  </div>
                ) : groupedSessions.map(group => (
                  <div key={group.dateKey} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{group.label}</span>
                      <div className="flex-1 h-px" style={{ background: '#E8E5DC' }} />
                    </div>
                    <div className="space-y-2">
                      {group.sessions.map(s => {
                        const dotColor = s.status === 'live' ? '#16A34A' : s.status === 'ended' ? '#9ca3af' : CLASS_DOTS[colorMap[s.classroom.id]??0]
                        return (
                          <div key={s.id} className="rounded-2xl bg-white p-4 flex items-start justify-between gap-4" style={{ border: '1px solid #E8E5DC' }}>
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-black text-gray-900">{s.title}</p>
                                  {s.status === 'live' && <span className="text-[10px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md">Live</span>}
                                  {s.status === 'ended' && <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">Ended</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{fmtTime(s.scheduledAt!)}{fmtDuration(s.durationMinutes) ? ` · ${fmtDuration(s.durationMinutes)}` : ''}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{s.classroom.name}</p>
                              </div>
                            </div>
                            {s.status !== 'ended' && (
                              <Link href={`/teacher/session/${s.id}`} className="shrink-0 text-xs font-black text-white px-3 py-1.5 rounded-lg" style={{ background: '#0f0e0e' }}>
                                {s.status === 'live' ? 'Rejoin' : 'Start'}
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <ScheduleModal
          classrooms={data}
          defaultDate={modalDate || todayKey}
          defaultTime={modalTime}
          token={session?.apiToken ?? ''}
          onCreated={(s, classroomId) => {
            setData(prev => prev.map(c => c.id === classroomId ? { ...c, sessions: [...c.sessions, s] } : c))
            setShowModal(false)
            if (s.scheduledAt) { setWeekStart(weekSunday(new Date(s.scheduledAt))); setView('week') }
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
