'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import {
  BookOpen, CalendarDays, Settings, LogOut,
  ChevronLeft, ChevronRight, LayoutList, CalendarRange,
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

export default function StudentSchedule() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()

  const [data, setData]             = useState<ClassroomWithSessions[]>([])
  const [loading, setLoading]       = useState(true)
  const [viewYear, setViewYear]     = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth]   = useState(() => new Date().getMonth())
  const [weekStart, setWeekStart]   = useState<Date>(() => weekSunday(new Date()))
  const [selectedDate, setSelected] = useState<string | null>(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [view, setView]             = useState<'week' | 'month' | 'list'>('week')
  const menuRef = useRef<HTMLDivElement>(null)

  const today    = new Date()
  const todayKey = toDateKey(today.toISOString())

  const fetchAll = async (token: string) => {
    const classrooms = await api.classrooms.list(token)
    const results = await Promise.all(
      classrooms.map(async c => ({
        ...c,
        sessions: await api.sessions.list(token, c.id).catch(() => [] as Session[]),
      }))
    )
    setData(results)
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
    fetchAll(session.apiToken).catch(() => {}).finally(() => setLoading(false))
    const id = setInterval(() => { if (session?.apiToken) fetchAll(session.apiToken).catch(() => {}) }, 30_000)
    return () => clearInterval(id)
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

  const liveSessions = useMemo(() =>
    data.flatMap(c => c.sessions.filter(s => s.status === 'live').map(s => ({ ...s, classroom: c }))),
    [data])

  const groupedSessions = useMemo(() => {
    const upcoming = allSessions
      .filter(s => new Date(s.scheduledAt!) >= today || s.status === 'live')
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    const groups: Array<{ dateKey: string; label: string; sessions: typeof allSessions }> = []
    upcoming.forEach(s => {
      const key = toDateKey(s.scheduledAt!)
      let g = groups.find(g => g.dateKey === key)
      if (!g) {
        const d = new Date(key + 'T00:00:00')
        g = { dateKey: key, label: d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}), sessions: [] }
        groups.push(g)
      }
      g.sessions.push(s)
    })
    return groups
  }, [allSessions])

  // month calendar cells
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i+1)]
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

  const initials = (session?.user?.name ?? 'S').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()

  const nav = [
    { icon: <BookOpen className="w-4 h-4" />,     label: 'Classrooms', href: '/student/dashboard' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Schedule',   href: '/student/schedule'  },
    { icon: <Settings className="w-4 h-4" />,     label: 'Settings',   href: '/student/settings'  },
  ]

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
              className="w-8 h-8 rounded-full text-white text-xs font-black flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: '#E04828' }}>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Student Portal</p>
            <p className="text-xs font-semibold text-gray-600">{(session?.user?.name ?? '').split(' ')[0] || 'Student'}</p>
          </div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <div className="px-8 py-6">

            {/* Live now banner */}
            {liveSessions.length > 0 && (
              <div className="mb-5 rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: '#FFF0EB', border: '1px solid #FECAB4' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#E04828' }} />
                  <p className="text-xs font-black" style={{ color: '#CC3000' }}>
                    {liveSessions.length} session{liveSessions.length > 1 ? 's' : ''} live right now
                  </p>
                </div>
                <div className="flex gap-2">
                  {liveSessions.slice(0, 2).map(s => (
                    <Link key={s.id} href={`/student/session/${s.id}`}
                      className="text-xs font-black text-white px-3 py-1.5 rounded-lg"
                      style={{ background: '#E04828' }}>
                      Join {s.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <button onClick={goToday}
                  className="text-xs font-black px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50"
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
              <div className="flex items-center p-0.5 rounded-xl" style={{ background: '#F5F3EE' }}>
                {(['week','month','list'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {v === 'week' && <CalendarRange className="w-3.5 h-3.5" />}
                    {v === 'month' && <CalendarDays className="w-3.5 h-3.5" />}
                    {v === 'list' && <LayoutList className="w-3.5 h-3.5" />}
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-[520px] rounded-2xl animate-pulse" style={{ background: '#E8E5DC' }} />
            ) : view === 'week' ? (
              <WeekCalendar
                weekStart={weekStart}
                sessions={calSessions}
                colorMap={colorMap}
                sessionHref={id => `/student/session/${id}`}
                accentColor="#E04828"
                canCreate={false}
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
                          className="relative flex flex-col items-start p-2 min-h-[96px] rounded-xl transition-colors text-left w-full"
                          style={{
                            background: isSelected ? '#E04828' : isToday ? '#FFF0EB' : 'transparent',
                            outline: isToday && !isSelected ? '1.5px solid #E04828' : 'none',
                          }}>
                          <span className={`text-xs font-black mb-1.5 w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${isSelected ? 'text-white' : isToday ? 'text-white' : 'text-gray-600'}`}
                            style={isToday && !isSelected ? { background: '#E04828' } : {}}>
                            {day}
                          </span>
                          {visible.map(s => (
                            <div key={s.id} className="w-full flex items-center gap-1 mb-0.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: isSelected ? 'rgba(255,255,255,0.6)' : s.status === 'live' ? '#16A34A' : CLASS_DOTS[colorMap[s.classroom.id]??0] }} />
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
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid #F5F3EE' }}>
                      <p className="text-xs font-black text-gray-900">
                        {selectedDate ? new Date(selectedDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}) : 'Select a day'}
                      </p>
                    </div>
                    <div className="px-4 py-3 min-h-[100px]">
                      {!selectedDate ? <p className="text-xs text-gray-400 pt-2">Click a day to see sessions</p>
                        : selectedSessions.length === 0 ? <p className="text-xs text-gray-400 pt-2">No sessions scheduled</p>
                        : selectedSessions.map(s => (
                          <div key={s.id} className="flex items-start gap-2.5 py-2" style={{ borderBottom: '1px solid #F5F3EE' }}>
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                              style={{ background: s.status === 'live' ? '#16A34A' : CLASS_DOTS[colorMap[s.classroom.id]??0] }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-gray-900 truncate">{s.title}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(s.scheduledAt!)}{fmtDuration(s.durationMinutes) ? ` · ${fmtDuration(s.durationMinutes)}` : ''}</p>
                              <p className="text-[10px] text-gray-400 truncate">{s.classroom.name}</p>
                            </div>
                            {s.status === 'live' && (
                              <Link href={`/student/session/${s.id}`} className="shrink-0 text-[10px] font-black text-white px-2 py-1 rounded-md" style={{ background: '#E04828' }}>
                                Join
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
                          onClick={() => { const k=toDateKey(s.scheduledAt!); setSelected(k); setViewYear(new Date(s.scheduledAt!).getFullYear()); setViewMonth(new Date(s.scheduledAt!).getMonth()) }}>
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#FFF0EB' }}>
                      <CalendarDays className="w-5 h-5" style={{ color: '#E04828' }} />
                    </div>
                    <p className="text-sm font-black text-gray-900 mb-1">No upcoming sessions</p>
                    <p className="text-xs text-gray-400">Your teacher hasn't scheduled any sessions yet</p>
                  </div>
                ) : groupedSessions.map(group => (
                  <div key={group.dateKey} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{group.label}</span>
                      <div className="flex-1 h-px" style={{ background: '#E8E5DC' }} />
                    </div>
                    <div className="space-y-2">
                      {group.sessions.map(s => {
                        const dotColor = s.status === 'live' ? '#16A34A' : CLASS_DOTS[colorMap[s.classroom.id]??0]
                        return (
                          <div key={s.id} className="rounded-2xl bg-white p-4 flex items-start justify-between gap-4" style={{ border: '1px solid #E8E5DC' }}>
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-black text-gray-900">{s.title}</p>
                                  {s.status === 'live' && <span className="text-[10px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md animate-pulse">Live</span>}
                                  {s.status === 'waiting' && <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">Soon</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{fmtTime(s.scheduledAt!)}{fmtDuration(s.durationMinutes) ? ` · ${fmtDuration(s.durationMinutes)}` : ''}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{s.classroom.name}</p>
                              </div>
                            </div>
                            {s.status === 'live' && (
                              <Link href={`/student/session/${s.id}`} className="shrink-0 text-xs font-black text-white px-3 py-1.5 rounded-lg" style={{ background: '#E04828' }}>
                                Join
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
    </div>
  )
}
