'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Channel, Message, Session, Classroom } from '@/types'
import MessageList from '@/components/channel/MessageList'
import MessageInput from '@/components/channel/MessageInput'
import NotificationBell from '@/components/NotificationBell'
import { ArrowLeft, Video, Hash, CalendarDays, Settings, LogOut } from 'lucide-react'

const CORAL = '#E04828'

export default function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classroomId, setClassroomId] = useState('')
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    params.then(p => setClassroomId(p.id))
  }, [params])

  const fetchSessions = useCallback(async () => {
    if (!session?.apiToken || !classroomId) return
    api.sessions.list(session.apiToken, classroomId).then(setSessions).catch(() => {})
  }, [session?.apiToken, classroomId])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken || !classroomId) return
    api.classrooms.get(session.apiToken, classroomId).then(c => {
      setClassroom(c)
      setChannels(c.channels ?? [])
      if (c.channels?.length) setActiveChannel(c.channels[0])
    })
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [session, status, classroomId, fetchSessions])

  useEffect(() => {
    if (!activeChannel || !session?.apiToken) return
    api.channels.getMessages(session.apiToken, activeChannel.id).then(setMessages)
  }, [activeChannel, session])

  const sendMessage = async (content: string) => {
    if (!activeChannel || !session?.apiToken) return
    const msg = await api.channels.sendMessage(session.apiToken, activeChannel.id, content)
    setMessages(p => [...p, msg])
  }

  const liveSessions = sessions.filter(s => s.status === 'live')

  const handleLeave = async () => {
    if (!session?.apiToken || !classroomId || leaving) return
    setLeaving(true)
    try {
      await api.classrooms.leave(session.apiToken, classroomId)
      router.replace('/student/dashboard')
    } catch {
      setLeaving(false)
      setShowLeaveConfirm(false)
    }
  }

  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ST'

  return (
    <div className="flex flex-col h-screen" style={{ background: '#E8EDE5' }}>

      {/* App Header */}
      <header className="sticky top-0 z-40 h-16 bg-white border-b flex items-center px-4 shrink-0" style={{ borderColor: '#E8E5DC' }}>
        <div className="flex items-center gap-2 flex-1">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-black text-sm text-black">Kattral Academy</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.apiToken && <NotificationBell token={session.apiToken} />}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
            style={{ background: CORAL }}
          >
            {userInitials}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-56 shrink-0 flex flex-col px-3 py-4 gap-2.5 overflow-hidden"
          style={{ background: '#F5F4F0', borderRight: '1px solid rgba(15,14,14,0.06)' }}>

          {/* Classroom info card */}
          <div className="rounded-2xl bg-white px-4 py-3">
            <Link
              href="/student/dashboard"
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-xs transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
            </Link>
            <h2 className="font-black text-sm text-gray-900 truncate leading-snug mb-1">{classroom?.name}</h2>
            {classroom?.joinCode && (
              <span className="font-mono text-[10px] text-gray-400 tracking-widest">{classroom.joinCode}</span>
            )}
          </div>

          {/* Channels card */}
          <div className="rounded-2xl bg-white px-2 py-2 flex-1 overflow-y-auto">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-2 pt-1">Channels</p>
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-xs transition-all mb-0.5 ${
                  activeChannel?.id === ch.id ? 'text-white font-semibold' : 'text-gray-500 hover:bg-[#F5F3EE]'
                }`}
                style={activeChannel?.id === ch.id ? { background: '#0f0e0e' } : {}}
              >
                <Hash className="w-3.5 h-3.5 shrink-0" /> {ch.name}
              </button>
            ))}
          </div>

          {/* Bottom nav card */}
          <div className="rounded-2xl bg-white px-2 py-2">
            {[
              { icon: <CalendarDays className="w-3.5 h-3.5" />, label: 'Schedule', href: '/student/schedule' },
              { icon: <Settings className="w-3.5 h-3.5" />, label: 'Settings', href: '/student/settings' },
            ].map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-[#F5F3EE] transition-colors"
              >
                {item.icon} {item.label}
              </Link>
            ))}
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-500 hover:bg-[#FFF1F2] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Leave Classroom
            </button>
          </div>
        </aside>

        {/* Message area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Live sessions banner */}
          {liveSessions.length > 0 && (
            <div
              className="shrink-0 flex items-center justify-between px-5 py-2.5 text-white text-sm font-semibold"
              style={{ background: CORAL }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span>Live session in progress</span>
              </div>
              <Link
                href={`/student/session/${liveSessions[0].id}`}
                className="flex items-center gap-1.5 font-black text-white underline-offset-2 hover:underline text-sm"
              >
                <Video className="w-4 h-4" /> Join Live →
              </Link>
            </div>
          )}

          {/* Channel header */}
          <div className="bg-white border-b h-14 px-5 flex items-center gap-2 shrink-0" style={{ borderColor: '#E8E5DC' }}>
            <Hash className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-sm text-gray-900">{activeChannel?.name}</h3>
            {activeChannel?.type === 'announcement' && (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full ml-2">
                Read-only
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 bg-white overflow-hidden flex flex-col">
            <MessageList messages={messages} />
            <MessageInput onSend={sendMessage} disabled={activeChannel?.type === 'announcement'} />
          </div>
        </div>
      </div>

      {/* Leave Classroom confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border bg-white shadow-lg w-full max-w-sm mx-4 p-6" style={{ borderColor: '#E8E5DC' }}>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-rose-600" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-gray-900 mb-1">Leave classroom?</h2>
            <p className="text-sm text-gray-500 mb-6">
              You&apos;ll be removed from <strong>{classroom?.name}</strong>. You can rejoin later with the join code.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 hover:border-gray-300 text-sm font-bold text-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {leaving ? 'Leaving…' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
