'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api, AuthError } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import {
  UserPlus, LogOut, BookOpen, Settings, CalendarDays,
  MoreVertical, Video, Clock, Copy, Check,
} from 'lucide-react'
import JoinClassroomModal from '@/components/classroom/JoinClassroomModal'
import NotificationBell from '@/components/NotificationBell'

const CARD_COLORS = ['#3B7FE8', '#9333EA', '#16A34A', '#F97316', '#0891B2', '#DC2626']
const CORAL = '#E04828'
const INK   = '#0f0e0e'

function DonutRing({ value, total, color, size = 92, thickness = 8, centerLabel, centerSub }: {
  value: number; total: number; color: string; size?: number
  thickness?: number; centerLabel: string; centerSub?: string
}) {
  const r    = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  const pct  = total > 0 ? Math.min(value / total, 1) : 0
  const dash = circ * (1 - pct)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0EDE8" strokeWidth={thickness} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={dash}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black leading-none" style={{ color: '#0f0e0e' }}>{centerLabel}</span>
        {centerSub && <span className="text-[9px] text-gray-400 font-medium mt-0.5">{centerSub}</span>}
      </div>
    </div>
  )
}

function Sparkline({ data, color, w = 52, h = 20 }: {
  data: number[]; color: string; w?: number; h?: number
}) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - (v / max) * (h - 2) - 1,
  ])
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={d} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function timeUntilShort(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Starting soon'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function fmtRelativeDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const dt = new Date(d); dt.setHours(0, 0, 0, 0)
  if (dt.getTime() === today.getTime()) return `Today at ${fmtTime(iso)}`
  if (dt.getTime() === tomorrow.getTime()) return `Tomorrow at ${fmtTime(iso)}`
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + fmtTime(iso)
}

type ClassroomWithSessions = Classroom & { sessions: Session[] }

export default function StudentDashboard() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  const [classrooms, setClassrooms]       = useState<ClassroomWithSessions[]>([])
  const [loading, setLoading]             = useState(true)
  const [sessionsReady, setSessionsReady] = useState(false)
  const [showJoin, setShowJoin]           = useState(false)
  const [hoveredDay, setHoveredDay]       = useState<number | null>(null)
  const [countdown, setCountdown]         = useState('')
  const [authExpired, setAuthExpired]     = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
    const token = session.apiToken
    api.classrooms.list(token)
      .then(async cls => {
        setClassrooms(cls.map(c => ({ ...c, sessions: [] })))
        setLoading(false)
        const withSessions = await Promise.all(
          cls.map(async c => ({ ...c, sessions: await api.sessions.list(token, c.id).catch(() => [] as Session[]) }))
        )
        setClassrooms(withSessions)
        setSessionsReady(true)
      })
      .catch(err => {
        if (err instanceof AuthError) setAuthExpired(true)
        setLoading(false); setSessionsReady(true)
      })
  }, [session, status, router])

  const allSessions = useMemo(() =>
    classrooms.flatMap(c => c.sessions.map(s => ({ ...s, classroom: c }))), [classrooms])

  const stats = useMemo(() => {
    const weekStart = new Date(today); weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
    return {
      enrolled: classrooms.length,
      live:     allSessions.filter(s => s.status === 'live').length,
      upcoming: allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended').length,
      thisWeek: allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt) >= weekStart && new Date(s.scheduledAt) < weekEnd).length,
      attended: allSessions.filter(s => s.status === 'ended').length,
    }
  }, [allSessions, classrooms])

  const nextSession = useMemo(() =>
    allSessions
      .filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended')
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0] ?? null,
    [allSessions])

  const liveSessions   = useMemo(() => allSessions.filter(s => s.status === 'live'), [allSessions])
  const upcomingSorted = useMemo(() =>
    allSessions
      .filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended')
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()),
    [allSessions])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const refreshClassrooms = async () => {
    if (!session?.apiToken) return
    const token = session.apiToken
    const cls = await api.classrooms.list(token).catch(() => [] as Classroom[])
    const withSessions = await Promise.all(
      cls.map(async c => ({ ...c, sessions: await api.sessions.list(token, c.id).catch(() => [] as Session[]) }))
    )
    setClassrooms(withSessions)
  }

  // Real-time countdown to next session
  useEffect(() => {
    const tick = () => {
      const ns = allSessions
        .filter(s => s.scheduledAt && new Date(s.scheduledAt) > new Date() && s.status !== 'ended')
        .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0]
      if (!ns?.scheduledAt) { setCountdown(''); return }
      const diff = new Date(ns.scheduledAt).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Starting now'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h > 0 ? h + 'h ' : ''}${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [allSessions])

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Student'
  const initials  = (session?.user?.name ?? 'S').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const hour      = today.getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const featured  = liveSessions[0] ?? nextSession

  const nav = [
    { icon: <BookOpen className="w-4 h-4" />,     label: 'Classrooms', href: '/student/dashboard' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Schedule',   href: '/student/schedule'  },
    { icon: <Settings className="w-4 h-4" />,     label: 'Settings',   href: '/student/settings'  },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#EDECEA', color: INK }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white flex items-center justify-between px-6 h-16"
        style={{ borderBottom: '1px solid #E8E5DC' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: INK }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-black text-sm tracking-tight">Kattral Academy</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.apiToken && <NotificationBell token={session.apiToken} />}
          <button onClick={() => setShowJoin(true)}
            className="flex items-center gap-2 font-black rounded-full px-4 py-2 text-sm text-white transition-all active:scale-[0.97] select-none"
            style={{ background: CORAL }}>
            <UserPlus className="w-3.5 h-3.5" /> Join Classroom
          </button>
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 rounded-full text-white text-xs font-black flex items-center justify-center"
              style={{ background: CORAL }}>
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-60 bg-white rounded-xl py-1 z-50"
                style={{ border: '1px solid #E8E5DC', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E5DC' }}>
                  <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 break-all">{session?.user?.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-xs font-black text-white"
                    style={{ background: CORAL }}>Student</span>
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

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] px-3 py-4 flex flex-col gap-2.5"
          style={{ background: '#F5F4F0', borderRight: '1px solid rgba(15,14,14,0.06)' }}>
          <div className="rounded-2xl bg-white px-2 py-2">
            {nav.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.label} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                    active ? 'text-white' : 'text-gray-500 hover:bg-[#F5F3EE] hover:text-gray-900'
                  }`}
                  style={active ? { background: INK } : {}}>
                  {item.icon} {item.label}
                </Link>
              )
            })}
          </div>

          <button onClick={() => setShowJoin(true)}
            className="rounded-2xl bg-white px-3 py-3 flex items-center gap-2.5 text-sm font-black transition-all active:scale-[0.97] select-none w-full"
            style={{ color: INK }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: CORAL }}>
              <UserPlus className="w-3.5 h-3.5 text-white" />
            </div>
            Join Classroom
          </button>

          {sessionsReady && (
            <div className="rounded-2xl bg-white px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Enrolled</span>
                <span className="text-sm font-black">{classrooms.length}</span>
              </div>
              {stats.live > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: CORAL }}>Live now</span>
                  <span className="flex items-center gap-1.5 text-sm font-black" style={{ color: CORAL }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: CORAL }} />{stats.live}
                  </span>
                </div>
              )}
              {stats.upcoming > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Upcoming</span>
                  <span className="text-sm font-black">{stats.upcoming}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto rounded-2xl px-4 py-3" style={{ background: '#EAE8E3' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Student Portal</p>
            <p className="text-xs font-semibold text-gray-600">{firstName}</p>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1080px] mx-auto px-8 py-8">

            {authExpired && (
              <div className="mb-5 flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <p className="text-sm text-amber-800 font-medium">Your session expired. Sign out and sign back in.</p>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-900 underline ml-4">Sign out</button>
              </div>
            )}

            {/* ── 1. Page header ─────────────────────────────────────────── */}
            <div className="mb-6">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-1.5">
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-[2.25rem] font-black tracking-tight leading-tight mb-1">
                {greeting}, {firstName}
              </h1>
              <p className="text-sm text-gray-400 font-medium">Here&apos;s your learning dashboard for today</p>
            </div>

            {/* ── 2. Featured session banner ──────────────────────────────── */}
            {featured && (
              <div className="rounded-2xl px-6 py-5 mb-5 flex items-center justify-between gap-6"
                style={{ background: '#1C1C1C' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {liveSessions.length > 0
                        ? '● Live in progress'
                        : `Next class starts in ${timeUntilShort(featured.scheduledAt!)}`}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-0.5 truncate">{featured.title}</h2>
                  <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {(featured as any).classroom?.name}
                  </p>
                </div>
                <Link href={`/student/session/${featured.id}`}
                  className="shrink-0 flex items-center gap-2 font-black text-sm px-5 py-3 rounded-xl transition-all hover:opacity-90 text-white"
                  style={{ background: CORAL }}>
                  {liveSessions.length > 0 ? 'Join Live →' : 'View Session →'}
                </Link>
              </div>
            )}

            {/* ── 3. Action row ───────────────────────────────────────────── */}
            <div className="flex gap-3 mb-8">
              <button onClick={() => setShowJoin(true)}
                className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 text-white transition-all active:scale-[0.97] select-none"
                style={{ background: CORAL }}>
                <UserPlus className="w-4 h-4" /> Join a Classroom
              </button>
              <Link href="/student/schedule"
                className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 transition-all active:scale-[0.97] select-none"
                style={{ background: '#F7F6F3', color: INK }}>
                View Schedule
              </Link>
            </div>

            {/* ── 4. Stats row ────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'ENROLLED',  value: classrooms.length,                          sub: 'Classrooms' },
                { label: 'SESSIONS',  value: sessionsReady ? allSessions.length : null,  sub: 'Total across classes' },
                { label: 'LIVE NOW',  value: sessionsReady ? stats.live : null,          sub: 'Active right now', live: true },
                { label: 'THIS WEEK', value: sessionsReady ? stats.thisWeek : null,      sub: 'Scheduled sessions' },
              ].map(({ label, value, sub, live }) => (
                <div key={label} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E5DC' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                    {live && value && value > 0 && (
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CORAL }} />
                    )}
                  </div>
                  {value === null
                    ? <div className="h-9 w-10 rounded-lg animate-pulse" style={{ background: '#F0EDE8' }} />
                    : <p className="text-3xl font-black leading-none"
                        style={{ color: live && value > 0 ? CORAL : INK }}>{value}</p>
                  }
                  <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── 5. Classrooms + Upcoming sessions ───────────────────────── */}
            <div className="grid grid-cols-3 gap-6 mb-6">

              {/* My Classrooms (2/3) */}
              <div className="col-span-2">
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-black">My Classrooms</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Your enrolled classes</p>
                  </div>
                  <button onClick={() => setShowJoin(true)}
                    className="text-xs font-black px-3 py-1.5 rounded-lg hover:bg-white active:scale-[0.95] transition-all"
                    style={{ color: INK }}>+ Join</button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: '#E8E5DC' }} />)}
                  </div>
                ) : classrooms.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white"
                    style={{ borderColor: '#E8E5DC' }}>
                    <BookOpen className="w-8 h-8 text-gray-200 mb-3" />
                    <p className="text-sm font-black text-gray-500 mb-1">No classrooms yet</p>
                    <p className="text-xs text-gray-400 mb-4">Ask your teacher for a join code</p>
                    <button onClick={() => setShowJoin(true)}
                      className="text-sm font-black px-5 py-2.5 rounded-xl text-white flex items-center gap-2 transition-all active:scale-[0.97] select-none"
                      style={{ background: CORAL }}>
                      <UserPlus className="w-4 h-4" /> Join a Classroom
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {classrooms.map((c, i) => (
                      <StudentClassroomCard
                        key={c.id} classroom={c} color={CARD_COLORS[i % CARD_COLORS.length]}
                        token={session?.apiToken ?? ''}
                        onLeft={id => setClassrooms(prev => prev.filter(x => x.id !== id))}
                      />
                    ))}
                    <button onClick={() => setShowJoin(true)}
                      className="min-h-[220px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2.5 bg-white text-gray-300 hover:text-gray-500 transition-colors"
                      style={{ borderColor: '#E8E5DC' }}>
                      <div className="w-10 h-10 rounded-xl border-2 border-current flex items-center justify-center">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold">Join classroom</p>
                    </button>
                  </div>
                )}
              </div>

              {/* Upcoming Sessions (1/3) */}
              <div>
                <div className="mb-5">
                  <h2 className="text-lg font-black">Upcoming Classes</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Your scheduled sessions</p>
                </div>
                <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
                  {!sessionsReady ? (
                    <div className="p-4 space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#F0EDE8' }} />
                      ))}
                    </div>
                  ) : upcomingSorted.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-black text-gray-400">No upcoming classes</p>
                      <p className="text-xs text-gray-400 mt-1">Your teacher hasn&apos;t scheduled anything yet</p>
                    </div>
                  ) : (
                    upcomingSorted.slice(0, 4).map((s, i) => {
                      const cIdx = classrooms.findIndex(c => c.id === (s as any).classroom?.id)
                      const col  = CARD_COLORS[cIdx % CARD_COLORS.length] ?? '#9ca3af'
                      const isLast = i === Math.min(upcomingSorted.length, 4) - 1
                      return (
                        <div key={s.id} className="px-4 py-3.5 flex items-start gap-3"
                          style={!isLast ? { borderBottom: '1px solid #F5F3EE' } : {}}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: col + '22' }}>
                            <BookOpen className="w-3.5 h-3.5" style={{ color: col }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate">{s.title}</p>
                            <p className="text-xs text-gray-400 truncate">{(s as any).classroom?.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {s.scheduledAt ? fmtRelativeDate(s.scheduledAt) : '—'}
                            </p>
                          </div>
                          {s.durationMinutes && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 mt-1"
                              style={{ background: '#F0EDE8', color: '#6b7280' }}>
                              {s.durationMinutes >= 60 ? `${Math.floor(s.durationMinutes / 60)}h` : `${s.durationMinutes}m`}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div className="px-4 py-3" style={{ borderTop: '1px solid #F5F3EE' }}>
                    <Link href="/student/schedule"
                      className="block w-full text-center text-sm font-black py-2.5 rounded-xl text-white transition-all active:scale-[0.97] select-none"
                      style={{ background: CORAL }}>
                      View Full Schedule
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 6. Bottom row — interactive widgets ────────────────────── */}
            <div className="grid grid-cols-3 gap-6">

              {/* Widget 1: Interactive weekly bar chart */}
              {sessionsReady && (() => {
                const labels = ['M','T','W','T','F','S','S']
                const weekStart = new Date(today); weekStart.setHours(0,0,0,0)
                weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
                const daySessions = labels.map((_, i) => {
                  const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
                  return allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt).toDateString() === d.toDateString())
                })
                const counts = daySessions.map(s => s.length)
                const max = Math.max(...counts, 1)
                const todayIdx = (today.getDay() + 6) % 7
                return (
                  <div className="rounded-2xl bg-white p-5 flex flex-col" style={{ border: '1px solid #E8E5DC' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">This Week</p>
                        <p className="text-xs text-gray-400 mt-0.5">Hover a bar to inspect</p>
                      </div>
                      {stats.thisWeek > 0 && (
                        <span className="text-[10px] font-black px-2 py-1 rounded-full text-white"
                          style={{ background: CORAL }}>
                          {stats.thisWeek} this week
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-1.5 mb-1 relative" style={{ height: 72 }}>
                      {counts.map((count, i) => {
                        const isT   = i === todayIdx
                        const isHov = hoveredDay === i
                        const h     = count === 0 ? 4 : Math.max(10, Math.round((count / max) * 72))
                        const bg    = isHov  ? INK
                                    : isT && count > 0 ? CORAL
                                    : isT    ? '#F5C5B5'
                                    : count > 0 ? '#DCDFE6'
                                    : '#F0EDE8'
                        return (
                          <div key={i}
                            className="flex-1 flex flex-col items-center gap-1.5 relative cursor-pointer select-none"
                            onMouseEnter={() => setHoveredDay(i)}
                            onMouseLeave={() => setHoveredDay(null)}>
                            {isHov && (
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none"
                                style={{ background: INK, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                {count} session{count !== 1 ? 's' : ''}
                                <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                  style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `4px solid ${INK}` }} />
                              </div>
                            )}
                            <div className="w-full rounded-md"
                              style={{
                                height: h, background: bg,
                                transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                                transform: isHov ? 'scaleY(1.08)' : 'scaleY(1)',
                                transformOrigin: 'bottom',
                              }} />
                            <span className="text-[9px] font-bold" style={{ color: isT ? INK : '#9ca3af' }}>{labels[i]}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="min-h-[28px] mb-2">
                      {hoveredDay !== null && daySessions[hoveredDay].length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {daySessions[hoveredDay].slice(0, 3).map(s => (
                            <span key={s.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full truncate max-w-[120px]"
                              style={{ background: '#F5F3EE', color: '#6b7280' }}>
                              {s.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-5 pt-3 mt-auto" style={{ borderTop: '1px solid #F5F3EE' }}>
                      <div>
                        <p className="text-xl font-black">{allSessions.length}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Total</p>
                      </div>
                      <div>
                        <p className="text-xl font-black">{stats.attended}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Attended</p>
                      </div>
                      <div>
                        <p className="text-xl font-black" style={{ color: stats.upcoming > 0 ? CORAL : INK }}>{stats.upcoming}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Upcoming</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Widget 2: Attendance ring + per-classroom breakdown */}
              <div className="rounded-2xl bg-white p-5 flex flex-col" style={{ border: '1px solid #E8E5DC' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">My Attendance</p>
                <p className="text-xs text-gray-400 mb-4">Sessions you attended</p>

                {!sessionsReady ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Big attendance ring */}
                    <div className="flex items-center gap-4 mb-4">
                      {(() => {
                        const total = allSessions.length
                        const attended = stats.attended
                        const pct = total > 0 ? Math.round((attended / total) * 100) : 0
                        const ringColor = pct >= 80 ? '#16A34A' : pct >= 60 ? '#F59E0B' : CORAL
                        return (
                          <>
                            <DonutRing value={attended} total={Math.max(total, 1)} color={ringColor}
                              size={88} thickness={9} centerLabel={`${pct}%`} centerSub="rate" />
                            <div className="flex-1">
                              <p className="text-2xl font-black" style={{ color: INK }}>{attended}</p>
                              <p className="text-xs text-gray-400 font-medium">of {total} sessions attended</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: ringColor }} />
                                <span className="text-[10px] font-black" style={{ color: ringColor }}>
                                  {pct >= 80 ? 'Excellent' : pct >= 60 ? 'Average' : 'Needs improvement'}
                                </span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    {/* Per-classroom attendance bars */}
                    {classrooms.length > 0 && (
                      <div className="space-y-2.5 flex-1">
                        {classrooms.map((c, i) => {
                          const total    = c.sessions.length
                          const attended = c.sessions.filter(s => s.status === 'ended').length
                          const pct      = total > 0 ? Math.round((attended / total) * 100) : 0
                          const col      = CARD_COLORS[i % CARD_COLORS.length]
                          return (
                            <div key={c.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black truncate max-w-[130px]" style={{ color: INK }}>{c.name}</span>
                                <span className="text-[10px] font-black" style={{ color: col }}>{pct}%</span>
                              </div>
                              <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: '#F0EDE8' }}>
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: col }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {classrooms.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Join a classroom to track attendance</p>
                    )}
                  </>
                )}
              </div>

              {/* Widget 3: Next session countdown */}
              <div className="rounded-2xl bg-white p-5 flex flex-col" style={{ border: '1px solid #E8E5DC' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Next Class</p>
                <p className="text-xs text-gray-400 mb-4">Real-time countdown</p>

                {!sessionsReady ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                  </div>
                ) : nextSession ? (
                  <>
                    {/* Countdown display */}
                    <div className="rounded-2xl p-4 mb-3 text-center" style={{ background: INK }}>
                      <p className="text-3xl font-black text-white tracking-tight font-mono mb-1">
                        {countdown || '—'}
                      </p>
                      <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {nextSession.status === 'live' ? '● Live right now' : 'until class starts'}
                      </p>
                    </div>

                    {/* Session info */}
                    <div className="rounded-xl p-3 mb-3" style={{ background: '#F5F4F0' }}>
                      <p className="text-sm font-black truncate mb-0.5" style={{ color: INK }}>{nextSession.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {(nextSession as any).classroom?.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {nextSession.scheduledAt ? fmtRelativeDate(nextSession.scheduledAt) : ''}
                        {nextSession.durationMinutes ? ` · ${nextSession.durationMinutes}m` : ''}
                      </p>
                    </div>

                    <Link href={`/student/session/${nextSession.id}`}
                      className="w-full flex items-center justify-center gap-2 font-black text-sm py-2.5 rounded-xl transition-all hover:-translate-y-px active:scale-[0.98] text-white"
                      style={{ background: CORAL }}>
                      <Video className="w-4 h-4" />
                      {nextSession.status === 'live' ? 'Join Live Now' : 'Enter When Live'}
                    </Link>

                    {/* Upcoming queue */}
                    {upcomingSorted.length > 1 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F5F3EE' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Up next</p>
                        {upcomingSorted.slice(1, 3).map(s => (
                          <div key={s.id} className="flex items-center gap-2 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-300" />
                            <p className="text-[10px] text-gray-500 truncate flex-1">{s.title}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: '#F5F4F0' }}>
                      <CalendarDays className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm font-black text-gray-400">No upcoming classes</p>
                    <p className="text-xs text-gray-400">Your teacher hasn't scheduled anything yet</p>
                    <Link href="/student/schedule"
                      className="text-xs font-black hover:underline" style={{ color: CORAL }}>
                      View schedule →
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {showJoin && (
        <JoinClassroomModal
          token={session?.apiToken ?? ''}
          onClose={() => setShowJoin(false)}
          onJoined={() => { refreshClassrooms(); setShowJoin(false) }}
        />
      )}
    </div>
  )
}

/* ── Student Classroom Card ─────────────────────────────────────────────── */
function StudentClassroomCard({
  classroom, color, token, onLeft,
}: {
  classroom: { id: string; name: string; joinCode: string; sessions: { id: string; title: string; status: string; scheduledAt: string | null; durationMinutes: number | null; createdAt: string; roomId: string | null }[] }
  color: string
  token: string
  onLeft: (id: string) => void
}) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [leaving, setLeaving]         = useState(false)
  const [leaveError, setLeaveError]   = useState('')
  const [copied, setCopied]           = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const today   = new Date()

  const liveSession   = classroom.sessions.find(s => s.status === 'live')
  const sessionCount  = classroom.sessions.length
  const upcomingCount = classroom.sessions.filter(
    s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended'
  ).length

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const copyCode = (e: React.MouseEvent) => {
    e.preventDefault()
    navigator.clipboard.writeText(classroom.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = async () => {
    if (!token || leaving) return
    setLeaving(true); setLeaveError('')
    try {
      await api.classrooms.leave(token, classroom.id)
      onLeft(classroom.id)
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : 'Failed to leave')
      setLeaving(false)
    }
  }

  const INK2   = '#0f0e0e'
  const CORAL2 = '#E04828'

  return (
    <>
      <div className="relative">
        <Link href={`/student/classroom/${classroom.id}`}
          className="block bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-px"
          style={{ border: '1px solid #E8E5DC' }}>
          <div className="h-28 relative" style={{ background: color }}>
            {liveSession && (
              <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-black bg-black/30 text-white px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
              </span>
            )}
            <div ref={menuRef} className="absolute top-3 right-3 z-10">
              <button
                onClick={e => { e.preventDefault(); setMenuOpen(o => !o) }}
                className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors">
                <MoreVertical className="w-3.5 h-3.5 text-white" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 w-36 bg-white rounded-xl py-1 z-20"
                  style={{ border: '1px solid #E8E5DC', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  <Link href={`/student/classroom/${classroom.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" /> Open
                  </Link>
                  <button
                    onClick={e => { e.preventDefault(); setMenuOpen(false); setShowConfirm(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Leave
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="px-4 pt-3.5 pb-4">
            <h3 className="font-black text-sm leading-snug mb-3.5" style={{ color: INK2 }}>{classroom.name}</h3>
            <div className="mb-3.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Join Code</p>
              <button onClick={copyCode}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-mono font-black transition-colors hover:bg-gray-100"
                style={{ background: '#F5F3EE', color: INK2 }}>
                {classroom.joinCode}
                {copied ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Sessions</p>
                <p className="text-lg font-black" style={{ color: INK2 }}>{sessionCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Upcoming</p>
                <p className="text-lg font-black" style={{ color: INK2 }}>{upcomingCount}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F5F3EE' }}>
              <span className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: '#F0FFF4', color: '#16A34A' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Enrolled
              </span>
              <span className="text-xs font-black" style={{ color: INK2 }}>Enter Class →</span>
            </div>
          </div>
        </Link>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !leaving && setShowConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.14)', border: '1px solid #E8E5DC' }}>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
              <LogOut className="w-5 h-5 text-rose-600" />
            </div>
            <h2 className="text-base font-black text-gray-900 mb-1">Leave classroom?</h2>
            <p className="text-sm text-gray-500 mb-5">
              You&apos;ll be removed from <strong>{classroom.name}</strong>. You can rejoin with the join code.
            </p>
            {leaveError && <p className="text-sm text-rose-500 mb-3">{leaveError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowConfirm(false); setLeaveError('') }} disabled={leaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-gray-700 disabled:opacity-50"
                style={{ border: '1px solid #E8E5DC' }}>
                Cancel
              </button>
              <button onClick={handleLeave} disabled={leaving}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-black disabled:opacity-50">
                {leaving ? 'Leaving…' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
