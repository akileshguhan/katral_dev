'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Channel, Message, Session, Classroom } from '@/types'
import MessageList from '@/components/channel/MessageList'
import MessageInput from '@/components/channel/MessageInput'
import { ArrowLeft, Video, Plus, Hash, CalendarDays, Settings, Copy, Check, Zap } from 'lucide-react'

// ── Doodle SVG components ─────────────────────────────────────────────────────

function DoodleStars({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 130 22" fill="currentColor" aria-hidden>
      {[13, 36, 59, 82, 105].map((x, i) => (
        <path key={i} d={`M${x} 2l2.8 6.2 6.8.5-5 4.4 1.6 6.6L${x} 16.5l-6.2 3.2 1.6-6.6-5-4.4 6.8-.5z`} />
      ))}
    </svg>
  )
}

function DoodleTeacher({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 160" fill="none" stroke="currentColor"
      strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="60" cy="28" r="18" />
      <path d="M52 32 Q60 40 68 32" />
      <circle cx="54" cy="25" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="66" cy="25" r="2.5" fill="currentColor" stroke="none" />
      <line x1="60" y1="46" x2="60" y2="100" />
      <line x1="60" y1="62" x2="28" y2="82" />
      <line x1="60" y1="60" x2="92" y2="48" />
      <line x1="92" y1="48" x2="104" y2="36" strokeWidth="4.5" />
      <line x1="60" y1="100" x2="40" y2="142" />
      <line x1="60" y1="100" x2="80" y2="142" />
      <line x1="40" y1="142" x2="26" y2="144" />
      <line x1="80" y1="142" x2="94" y2="144" />
    </svg>
  )
}

// ── Session dot accent colors ─────────────────────────────────────────────────
const SESSION_DOTS = ['#E04828', '#3B4FE8', '#16A34A', '#9333EA']

// ─────────────────────────────────────────────────────────────────────────────

export default function TeacherClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classroomId, setClassroomId]         = useState('')
  const [classroom, setClassroom]             = useState<Classroom | null>(null)
  const [channels, setChannels]               = useState<Channel[]>([])
  const [activeChannel, setActiveChannel]     = useState<Channel | null>(null)
  const [messages, setMessages]               = useState<Message[]>([])
  const [sessions, setSessions]               = useState<Session[]>([])
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [copied, setCopied]                   = useState(false)

  useEffect(() => { params.then(p => setClassroomId(p.id)) }, [params])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken || !classroomId) return
    api.classrooms.get(session.apiToken, classroomId).then(c => {
      setClassroom(c)
      setChannels(c.channels ?? [])
      if (c.channels?.length) setActiveChannel(c.channels[0])
    })
    api.sessions.list(session.apiToken, classroomId).then(setSessions)
  }, [session, status, classroomId])

  useEffect(() => {
    if (!activeChannel || !session?.apiToken) return
    api.channels.getMessages(session.apiToken, activeChannel.id).then(setMessages)
  }, [activeChannel, session])

  const sendMessage = async (content: string) => {
    if (!activeChannel || !session?.apiToken) return
    const msg = await api.channels.sendMessage(session.apiToken, activeChannel.id, content)
    setMessages(p => [...p, msg])
  }

  const createSession = async (quickStart = false) => {
    if (!newSessionTitle.trim() || !session?.apiToken) return
    const s = await api.sessions.create(session.apiToken, classroomId, newSessionTitle.trim())
    setSessions(p => [...p, s])
    setNewSessionTitle('')
    if (quickStart) router.push(`/teacher/session/${s.id}`)
  }

  const copyCode = () => {
    if (!classroom?.joinCode) return
    navigator.clipboard.writeText(classroom.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const userInitials = (session?.user?.name ?? 'T')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-screen flex-col" style={{ background: '#E8EDE5' }}>

      {/* ══ App Header ════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 h-16 bg-white flex items-center px-5 shrink-0"
        style={{ borderBottom: '1px solid #E8E5DC' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#0f0e0e' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <span className="font-black text-sm" style={{ color: '#0f0e0e' }}>Kattral Academy</span>
        </div>

        {/* Right: avatar */}
        <div className="ml-auto flex items-center gap-3">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0"
            style={{ background: '#C5D000', color: '#0f0e0e' }}>
            {userInitials}
          </button>
        </div>
      </header>

      {/* ══ Body: sidebar + main + sessions ══════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 flex flex-col px-3 py-4 gap-2.5 overflow-hidden"
          style={{ background: '#F5F4F0', borderRight: '1px solid rgba(15,14,14,0.06)' }}>

          {/* Classroom info card */}
          <div className="rounded-2xl bg-white px-4 py-3">
            <Link href="/teacher/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <h2 className="font-black text-sm leading-snug line-clamp-2 mb-1.5"
              style={{ color: '#0f0e0e' }}>
              {classroom?.name ?? '…'}
            </h2>
            <button onClick={copyCode} className="flex items-center gap-1.5 group">
              <span className="font-mono text-[10px] text-gray-400 tracking-wider">
                {classroom?.joinCode ?? '──────'}
              </span>
              {copied
                ? <Check className="w-3 h-3 text-green-500" />
                : <Copy className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />}
            </button>
          </div>

          {/* Channels card */}
          <div className="rounded-2xl bg-white px-2 py-2 flex-1 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1.5 px-2 pt-1">
              Channels
            </p>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-xs transition-all mb-0.5 ${
                  activeChannel?.id === ch.id
                    ? 'text-white font-semibold'
                    : 'text-gray-500 hover:bg-[#F5F3EE]'
                }`}
                style={activeChannel?.id === ch.id ? { background: '#0f0e0e' } : {}}>
                <Hash className="w-3.5 h-3.5 shrink-0" /> {ch.name}
              </button>
            ))}
          </div>

          {/* Bottom nav card */}
          <div className="rounded-2xl bg-white px-2 py-2">
            {[
              { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Schedule', href: '/teacher/schedule' },
              { icon: <Settings     className="w-3.5 h-3.5" />, label: 'Settings', href: '/teacher/settings' },
            ].map(item => (
              <Link key={item.label} href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-[#F5F3EE] transition-colors">
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </aside>

        {/* ── Message Area ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
          {/* Channel header */}
          <div className="h-14 px-6 flex items-center gap-2.5 shrink-0"
            style={{ borderBottom: '1px solid #E8E5DC' }}>
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <h3 className="font-bold text-sm" style={{ color: '#0f0e0e' }}>
              {activeChannel?.name ?? 'Select a channel'}
            </h3>
          </div>

          <MessageList messages={messages} />
          <MessageInput onSend={sendMessage} />
        </div>

        {/* ── Sessions Panel ────────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 flex flex-col px-3 py-4 gap-2.5"
          style={{ background: '#F5F4F0', borderLeft: '1px solid rgba(15,14,14,0.06)' }}>

          {/* Header card */}
          <div className="rounded-2xl bg-white px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 shrink-0" style={{ color: '#0f0e0e' }} />
                <h3 className="font-black text-sm" style={{ color: '#0f0e0e' }}>Sessions</h3>
              </div>
              {sessions.filter(s => s.status === 'live').length > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-black text-green-600 px-2 py-0.5 rounded-full bg-green-50">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Session cards */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {sessions.length === 0 ? (
              <div className="rounded-2xl bg-white flex flex-col items-center px-4 py-8 gap-3 select-none">
                <DoodleTeacher className="w-20 h-28 text-gray-200" />
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  No sessions yet.<br />Create your first one below!
                </p>
              </div>
            ) : (
              sessions.map((s, i) => {
                const dot = SESSION_DOTS[i % SESSION_DOTS.length]
                return (
                  <div key={s.id} className="rounded-2xl bg-white p-4">
                    <div className="flex items-start gap-2.5 mb-3">
                      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                      <p className="text-sm font-black leading-snug flex-1 min-w-0" style={{ color: '#0f0e0e' }}>
                        {s.title}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        s.status === 'live' ? 'bg-green-100 text-green-700'
                          : s.status === 'ended' ? 'bg-gray-100 text-gray-500'
                          : 'text-gray-500'
                      }`} style={s.status !== 'live' && s.status !== 'ended' ? { background: '#F0EDE8' } : {}}>
                        {s.status === 'live' ? '● Live' : s.status === 'ended' ? 'Ended' : 'Ready'}
                      </span>
                      {s.status !== 'ended' && (
                        <Link href={`/teacher/session/${s.id}`}
                          className="text-xs font-black px-3 py-2 rounded-xl text-white hover:opacity-80 transition-opacity"
                          style={{ background: '#0f0e0e' }}>
                          {s.status === 'live' ? 'Rejoin →' : 'Start →'}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick Start card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0f0e0e' }}>
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-3.5 h-3.5" style={{ color: '#C5D000' }} />
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#C5D000' }}>
                  Quick Start
                </p>
              </div>
              <input
                type="text" placeholder="Session name…" value={newSessionTitle}
                onChange={e => setNewSessionTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createSession(true)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all mb-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#C5D000' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
              <button onClick={() => createSession(true)} disabled={!newSessionTitle.trim()}
                className="w-full disabled:opacity-30 text-sm font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-px active:scale-[0.99]"
                style={{ background: '#C5D000', color: '#0f0e0e' }}>
                <Zap className="w-4 h-4" /> Start Now
              </button>
            </div>
            <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => createSession(false)} disabled={!newSessionTitle.trim()}
                className="w-full mt-2.5 disabled:opacity-30 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-white/50 hover:text-white/80"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule for later
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
