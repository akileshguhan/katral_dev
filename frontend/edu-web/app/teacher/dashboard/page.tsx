'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api, AuthError } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import {
  Plus, LogOut, BookOpen, Settings, CalendarDays,
  MoreVertical, Trash2, Video, Clock, Copy, Check, Zap,
} from 'lucide-react'
import CreateClassroomModal from '@/components/classroom/CreateClassroomModal'
import NotificationBell from '@/components/NotificationBell'

const CARD_COLORS = ['#3B7FE8', '#9333EA', '#16A34A', '#F97316', '#0891B2', '#DC2626']
const INK = '#0f0e0e'
const LIME = '#C5D000'

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

const NAV = [
  { icon: BookOpen,     label: 'Classrooms', href: '/teacher/dashboard' },
  { icon: CalendarDays, label: 'Schedule',   href: '/teacher/schedule'  },
  { icon: Settings,     label: 'Settings',   href: '/teacher/settings'  },
]

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  const [classrooms, setClassrooms]       = useState<ClassroomWithSessions[]>([])
  const [loading, setLoading]             = useState(true)
  const [sessionsReady, setSessionsReady] = useState(false)
  const [showCreate, setShowCreate]       = useState(false)
  const [hoveredDay, setHoveredDay]       = useState<number | null>(null)
  const [authExpired, setAuthExpired]     = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)
  const [qsTitle, setQsTitle]             = useState('')
  const [qsClassId, setQsClassId]         = useState('')
  const [qsLoading, setQsLoading]         = useState(false)
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
      live:     allSessions.filter(s => s.status === 'live').length,
      upcoming: allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended').length,
      thisWeek: allSessions.filter(s => s.scheduledAt && new Date(s.scheduledAt) >= weekStart && new Date(s.scheduledAt) < weekEnd).length,
      ended:    allSessions.filter(s => s.status === 'ended').length,
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

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Teacher'
  const initials  = (session?.user?.name ?? 'T').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const hour      = today.getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const featured  = liveSessions[0] ?? nextSession

  const quickStartSession = async () => {
    if (!qsTitle.trim() || !session?.apiToken) return
    const targetId = qsClassId || classrooms[0]?.id
    if (!targetId) return
    setQsLoading(true)
    try {
      const s = await api.sessions.create(session.apiToken, targetId, qsTitle.trim())
      router.push(`/teacher/session/${s.id}`)
    } catch { setQsLoading(false) }
  }

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
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 rounded-full text-[#0f0e0e] text-xs font-black flex items-center justify-center"
              style={{ background: LIME }}>
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-60 bg-white rounded-xl py-1 z-50"
                style={{ border: '1px solid #E8E5DC', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E5DC' }}>
                  <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 break-all">{session?.user?.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-xs font-black"
                    style={{ background: LIME, color: INK }}>Teacher</span>
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
            {NAV.map(({ icon: Icon, label, href }) => {
              const active = pathname === href
              return (
                <Link key={label} href={href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                    active ? 'text-white' : 'text-gray-500 hover:bg-[#F5F3EE] hover:text-gray-900'
                  }`}
                  style={active ? { background: INK } : {}}>
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              )
            })}
          </div>

          <button onClick={() => setShowCreate(true)}
            className="rounded-2xl bg-white px-3 py-3 flex items-center gap-2.5 text-sm font-black transition-all active:scale-[0.97] select-none w-full"
            style={{ color: INK }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: LIME }}>
              <Plus className="w-3.5 h-3.5" />
            </div>
            New Classroom
          </button>

          {sessionsReady && (
            <div className="rounded-2xl bg-white px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Classes</span>
                <span className="text-sm font-black">{classrooms.length}</span>
              </div>
              {stats.live > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Live now</span>
                  <span className="flex items-center gap-1.5 text-sm font-black text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500" />{stats.live}
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
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Educator Portal</p>
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
                        : `Next session starts in ${timeUntilShort(featured.scheduledAt!)}`}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-0.5 truncate">{featured.title}</h2>
                  <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {(featured as any).classroom?.name}
                  </p>
                </div>
                <Link href={`/teacher/session/${featured.id}`}
                  className="shrink-0 flex items-center gap-2 font-black text-sm px-5 py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.97] select-none"
                  style={{ background: LIME, color: INK }}>
                  {liveSessions.length > 0 ? 'Rejoin →' : 'Start Session →'}
                </Link>
              </div>
            )}

            {/* ── 3. Action row ───────────────────────────────────────────── */}
            <div className="flex gap-3 mb-8">
              <button onClick={() => setShowCreate(true)}
                className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 transition-all active:scale-[0.97] select-none"
                style={{ background: LIME, color: INK }}>
                <Plus className="w-4 h-4" /> New Classroom
              </button>
              <Link href="/teacher/schedule"
                className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 transition-all active:scale-[0.97] select-none"
                style={{ background: '#F7F6F3', color: INK }}>
                View Schedule
              </Link>
            </div>

            {/* ── 4. Stats row ────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: 'CLASSROOMS', value: classrooms.length,                              sub: 'Total active' },
                { label: 'SESSIONS',   value: sessionsReady ? allSessions.length : null,      sub: 'All time' },
                { label: 'LIVE NOW',   value: sessionsReady ? stats.live : null,              sub: 'Active sessions', live: true },
                { label: 'THIS WEEK',  value: sessionsReady ? stats.thisWeek : null,          sub: 'Scheduled' },
              ].map(({ label, value, sub, live }) => (
                <div key={label} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E5DC' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                    {live && value && value > 0 && (
                      <span className="w-2 h-2 rounded-full animate-pulse bg-green-500" />
                    )}
                  </div>
                  {value === null
                    ? <div className="h-9 w-10 rounded-lg animate-pulse" style={{ background: '#F0EDE8' }} />
                    : <p className="text-3xl font-black leading-none"
                        style={{ color: live && value > 0 ? '#16A34A' : INK }}>{value}</p>
                  }
                  <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── 5. Classrooms + Upcoming sessions grid ──────────────────── */}
            <div className="grid grid-cols-3 gap-6 mb-6">

              {/* Classrooms (2/3) */}
              <div className="col-span-2">
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-black">Your Classrooms</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Manage and monitor your active classes</p>
                  </div>
                  <button onClick={() => setShowCreate(true)}
                    className="text-xs font-black px-3 py-1.5 rounded-lg hover:bg-white active:scale-[0.95] transition-all"
                    style={{ color: INK }}>+ New</button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: '#E8E5DC' }} />)}
                  </div>
                ) : classrooms.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white col-span-2"
                    style={{ borderColor: '#E8E5DC' }}>
                    <BookOpen className="w-8 h-8 text-gray-200 mb-3" />
                    <p className="text-sm font-black text-gray-500 mb-1">No classrooms yet</p>
                    <p className="text-xs text-gray-400 mb-4">Create your first classroom to get started</p>
                    <button onClick={() => setShowCreate(true)}
                      className="text-sm font-black px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-[0.97] select-none"
                      style={{ background: LIME, color: INK }}>
                      <Plus className="w-4 h-4" /> Create Classroom
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {classrooms.map((c, i) => (
                      <TeacherClassroomCard
                        key={c.id} classroom={c} color={CARD_COLORS[i % CARD_COLORS.length]}
                        token={session?.apiToken ?? ''}
                        onDeleted={id => setClassrooms(prev => prev.filter(x => x.id !== id))}
                      />
                    ))}
                    <button onClick={() => setShowCreate(true)}
                      className="min-h-[220px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2.5 bg-white text-gray-300 hover:text-gray-500 transition-colors"
                      style={{ borderColor: '#E8E5DC' }}>
                      <div className="w-10 h-10 rounded-xl border-2 border-current flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold">New classroom</p>
                    </button>
                  </div>
                )}
              </div>

              {/* Right column: heading mirrors left column exactly, then cards */}
              <div className="flex flex-col">

                {/* Same heading structure as left column so cards align */}
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-black">Sessions</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Quick start or view upcoming</p>
                  </div>
                </div>

                <div className="flex flex-col gap-5">

                {/* Quick Start */}
                <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: INK }}>
                    <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: LIME }} />
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: LIME }}>Quick Start</p>
                  </div>
                  <div className="px-4 py-4">
                    <input
                      type="text"
                      placeholder="Session name…"
                      value={qsTitle}
                      onChange={e => setQsTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && quickStartSession()}
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none mb-3 transition-all"
                      style={{ background: '#F7F6F3', border: '1.5px solid transparent' }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = LIME }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'transparent' }}
                    />
                    {classrooms.length === 1 && (
                      <div className="flex items-center gap-1.5 px-1 mb-3">
                        <span className="text-[10px] text-gray-400 font-medium">→</span>
                        <span className="text-xs font-semibold text-gray-500 truncate">{classrooms[0].name}</span>
                      </div>
                    )}
                    {classrooms.length > 1 && (
                      <select
                        value={qsClassId || classrooms[0]?.id || ''}
                        onChange={e => setQsClassId(e.target.value)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none mb-3"
                        style={{ background: '#F7F6F3', border: '1.5px solid transparent' }}>
                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={quickStartSession}
                      disabled={!qsTitle.trim() || qsLoading || classrooms.length === 0}
                      className="w-full disabled:opacity-40 text-sm font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-px active:scale-[0.98]"
                      style={{ background: LIME, color: INK }}>
                      <Zap className="w-4 h-4" />
                      {qsLoading ? 'Starting…' : 'Start Now'}
                    </button>
                  </div>
                </div>

                {/* Upcoming Sessions */}
                <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #F5F3EE' }}>
                    <p className="text-xs font-black text-gray-900">Upcoming Sessions</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Your scheduled classes</p>
                  </div>
                  <div>
                    {!sessionsReady ? (
                      <div className="p-4 space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: '#F0EDE8' }} />
                        ))}
                      </div>
                    ) : upcomingSorted.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-black text-gray-400">No upcoming sessions</p>
                        <p className="text-xs text-gray-400 mt-1">Sessions are created inside a classroom</p>
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
                      <Link href="/teacher/schedule"
                        className="block w-full text-center text-sm font-black py-2.5 rounded-xl transition-all active:scale-[0.97]"
                        style={{ background: LIME, color: INK }}>
                        View All Sessions
                      </Link>
                    </div>
                  </div>
                </div>

                </div>{/* end flex flex-col gap-5 */}
              </div>{/* end right column */}
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
                        <span className="text-[10px] font-black px-2 py-1 rounded-full"
                          style={{ background: '#F0FFF4', color: '#16A34A' }}>
                          {stats.thisWeek} this week
                        </span>
                      )}
                    </div>

                    {/* Bars */}
                    <div className="flex items-end gap-1.5 mb-1 relative" style={{ height: 72 }}>
                      {counts.map((count, i) => {
                        const isT    = i === todayIdx
                        const isHov  = hoveredDay === i
                        const h      = count === 0 ? 4 : Math.max(10, Math.round((count / max) * 72))
                        const bgCol  = isHov  ? INK
                                     : isT && count > 0 ? LIME
                                     : isT    ? '#E8F9C0'
                                     : count > 0 ? '#DCDFE6'
                                     : '#F0EDE8'
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 relative cursor-pointer select-none"
                            onMouseEnter={() => setHoveredDay(i)}
                            onMouseLeave={() => setHoveredDay(null)}>
                            {isHov && (
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#0f0e0e] text-white text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none"
                                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                {count} session{count !== 1 ? 's' : ''}
                                <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                  style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #0f0e0e' }} />
                              </div>
                            )}
                            <div className="w-full rounded-md"
                              style={{
                                height: h,
                                background: bgCol,
                                transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                                transform: isHov ? 'scaleY(1.08)' : 'scaleY(1)',
                                transformOrigin: 'bottom',
                              }} />
                            <span className="text-[9px] font-bold" style={{ color: isT ? INK : '#9ca3af' }}>{labels[i]}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Tooltip detail row */}
                    <div className="min-h-[28px] mb-2">
                      {hoveredDay !== null && daySessions[hoveredDay].length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {daySessions[hoveredDay].slice(0, 3).map(s => (
                            <span key={s.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F3EE] text-gray-600 truncate max-w-[120px]">
                              {s.title}
                            </span>
                          ))}
                          {daySessions[hoveredDay].length > 3 && (
                            <span className="text-[10px] text-gray-400">+{daySessions[hoveredDay].length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-6 pt-3 mt-auto" style={{ borderTop: '1px solid #F5F3EE' }}>
                      <div>
                        <p className="text-xl font-black">{allSessions.length}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Total Sessions</p>
                      </div>
                      <div>
                        <p className="text-xl font-black">{stats.ended}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Completed</p>
                      </div>
                      <div>
                        <p className="text-xl font-black" style={{ color: stats.upcoming > 0 ? '#3B7FE8' : INK }}>{stats.upcoming}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Upcoming</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Widget 2: Session status rings */}
              <div className="rounded-2xl bg-white p-5 flex flex-col" style={{ border: '1px solid #E8E5DC' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Session Breakdown</p>
                <p className="text-xs text-gray-400 mb-5">All sessions at a glance</p>

                {!sessionsReady ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* 3 rings in a row */}
                    <div className="flex items-center justify-around mb-5">
                      <div className="flex flex-col items-center gap-2">
                        <DonutRing value={stats.live} total={Math.max(allSessions.length, 1)}
                          color="#16A34A" size={72} thickness={7}
                          centerLabel={String(stats.live)} centerSub="live" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Live</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <DonutRing value={stats.upcoming} total={Math.max(allSessions.length, 1)}
                          color="#3B7FE8" size={72} thickness={7}
                          centerLabel={String(stats.upcoming)} centerSub="ahead" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Upcoming</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <DonutRing value={stats.ended} total={Math.max(allSessions.length, 1)}
                          color={LIME} size={72} thickness={7}
                          centerLabel={String(stats.ended)} centerSub="done" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Done</span>
                      </div>
                    </div>

                    {/* Total bar */}
                    <div className="rounded-2xl px-4 py-3 mb-3" style={{ background: '#F5F4F0' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-gray-500">Total sessions</span>
                        <span className="text-sm font-black" style={{ color: INK }}>{allSessions.length}</span>
                      </div>
                      <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: '#E8E5DC' }}>
                        <div className="h-full rounded-full flex overflow-hidden">
                          {allSessions.length > 0 && [
                            { v: stats.live,     c: '#16A34A' },
                            { v: stats.upcoming, c: '#3B7FE8' },
                            { v: stats.ended,    c: LIME },
                          ].map(({ v, c }, i) => (
                            <div key={i} className="h-full transition-all duration-700"
                              style={{ width: `${(v / allSessions.length) * 100}%`, background: c }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Next up */}
                    {nextSession && (
                      <Link href={`/teacher/session/${nextSession.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all hover:-translate-y-px active:scale-[0.98]"
                        style={{ background: INK }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: LIME }}>
                          <Video className="w-3.5 h-3.5" style={{ color: INK }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white truncate">{nextSession.title}</p>
                          <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {nextSession.scheduledAt ? fmtRelativeDate(nextSession.scheduledAt) : 'Start now'}
                          </p>
                        </div>
                        <span className="text-[10px] font-black shrink-0" style={{ color: LIME }}>Start →</span>
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* Widget 3: Classroom activity with sparklines */}
              <div className="rounded-2xl bg-white p-5 flex flex-col" style={{ border: '1px solid #E8E5DC' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Classroom Activity</p>
                <p className="text-xs text-gray-400 mb-4">7-day session trend</p>

                {!sessionsReady ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#F0EDE8' }} />)}
                  </div>
                ) : classrooms.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <BookOpen className="w-8 h-8 text-gray-200" />
                    <p className="text-xs text-gray-400">No classrooms yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 flex-1">
                    {classrooms.map((c, i) => {
                      const col      = CARD_COLORS[i % CARD_COLORS.length]
                      const live     = c.sessions.filter(s => s.status === 'live').length
                      const upcoming = c.sessions.filter(s => s.scheduledAt && new Date(s.scheduledAt) > today && s.status !== 'ended').length
                      // Build 7-day sparkline data
                      const sparks = Array.from({ length: 7 }, (_, d) => {
                        const dt = new Date(today)
                        dt.setDate(today.getDate() - (6 - d))
                        dt.setHours(0, 0, 0, 0)
                        return c.sessions.filter(s =>
                          s.scheduledAt && new Date(s.scheduledAt).toDateString() === dt.toDateString()
                        ).length
                      })
                      return (
                        <Link key={c.id} href={`/teacher/classroom/${c.id}`}
                          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:-translate-y-px active:scale-[0.98] group"
                          style={{ background: '#FAFAF8', border: '1px solid #F0EDE8' }}>
                          <div className="w-2 h-10 rounded-full shrink-0" style={{ background: col }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate" style={{ color: INK }}>{c.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {c.sessions.length} session{c.sessions.length !== 1 ? 's' : ''}
                              {live > 0 ? <span className="ml-1.5 text-green-500 font-bold">● Live</span> : null}
                              {upcoming > 0 && live === 0 ? <span className="ml-1.5 text-blue-400 font-semibold"> · {upcoming} upcoming</span> : null}
                            </p>
                          </div>
                          <div className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Sparkline data={sparks} color={col} w={48} h={22} />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Summary totals */}
                {sessionsReady && (
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #F5F3EE' }}>
                    <div className="rounded-xl p-2.5 text-center" style={{ background: '#F5F4F0' }}>
                      <p className="text-base font-black" style={{ color: INK }}>{classrooms.length}</p>
                      <p className="text-[9px] text-gray-400 font-medium">Classes</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center" style={{ background: '#F5F4F0' }}>
                      <p className="text-base font-black" style={{ color: INK }}>{allSessions.length}</p>
                      <p className="text-[9px] text-gray-400 font-medium">Sessions</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {showCreate && (
        <CreateClassroomModal
          token={session?.apiToken ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={c => { setClassrooms(p => [...p, { ...c, sessions: [] }]); setShowCreate(false) }}
        />
      )}
    </div>
  )
}

/* ── Classroom Card ─────────────────────────────────────────────────────── */
function TeacherClassroomCard({
  classroom, color, token, onDeleted,
}: {
  classroom: { id: string; name: string; joinCode: string; sessions: { id: string; title: string; status: string; scheduledAt: string | null; durationMinutes: number | null; createdAt: string; roomId: string | null }[] }
  color: string
  token: string
  onDeleted: (id: string) => void
}) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [copied, setCopied]           = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  const liveSession    = classroom.sessions.find(s => s.status === 'live')
  const sessionCount   = classroom.sessions.length
  const upcomingCount  = classroom.sessions.filter(
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

  const handleDelete = async () => {
    if (!token || deleting) return
    setDeleting(true); setDeleteError('')
    try {
      await api.classrooms.delete(token, classroom.id)
      onDeleted(classroom.id)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  const INK2  = '#0f0e0e'
  const LIME2 = '#C5D000'

  return (
    <>
      <div className="relative">
        <Link href={`/teacher/classroom/${classroom.id}`}
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
                  <Link href={`/teacher/classroom/${classroom.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" /> Open
                  </Link>
                  <button
                    onClick={e => { e.preventDefault(); setMenuOpen(false); setShowConfirm(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
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
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
              </span>
              <span className="text-xs font-black" style={{ color: INK2 }}>View Details →</span>
            </div>
          </div>
        </Link>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !deleting && setShowConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.14)', border: '1px solid #E8E5DC' }}>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <h2 className="text-base font-black text-gray-900 mb-1">Delete classroom?</h2>
            <p className="text-sm text-gray-500 mb-5">
              <strong>{classroom.name}</strong> and all its sessions will be permanently deleted.
            </p>
            {deleteError && <p className="text-sm text-rose-500 mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-gray-700 disabled:opacity-50"
                style={{ border: '1px solid #E8E5DC' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-black disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
