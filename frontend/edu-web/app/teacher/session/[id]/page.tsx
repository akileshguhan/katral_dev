'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { AttendanceRecord } from '@/types'
import { ClipboardCheck, X, Users, CheckCircle } from 'lucide-react'
import TeacherRoom from '@/components/session/TeacherRoom'

type AttendanceState =
  | { phase: 'idle' }
  | { phase: 'taking' }
  | { phase: 'done'; record: AttendanceRecord }
  | { phase: 'error'; message: string }

export default function TeacherSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessionId, setSessionId]           = useState('')
  const [token, setToken]                   = useState<string | null>(null)
  const [serverUrl, setServerUrl]           = useState('')
  const [error, setError]                   = useState('')
  const [ended, setEnded]                   = useState(false)
  const [attendance, setAttendance]         = useState<AttendanceState>({ phase: 'idle' })
  const [showAttendance, setShowAttendance] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    params.then(p => setSessionId(p.id))
  }, [params])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken || !sessionId) return
    if (startedRef.current) return
    startedRef.current = true

    api.sessions.start(session.apiToken, sessionId)
      .then(r => {
        setToken(r.token)
        setServerUrl(r.url)
      })
      .catch(e => setError(e.message))
  }, [session, status, sessionId])

  const handleTakeAttendance = async () => {
    if (!session?.apiToken || !sessionId) return
    setAttendance({ phase: 'taking' })
    setShowAttendance(true)
    try {
      const record = await api.attendance.take(session.apiToken, sessionId)
      setAttendance({ phase: 'done', record })
    } catch (e: any) {
      setAttendance({ phase: 'error', message: e.message ?? 'Failed to take attendance' })
    }
  }

  const handleEnd = async () => {
    if (!session?.apiToken || !sessionId) return
    setEnded(true)
    try { await api.sessions.end(session.apiToken, sessionId) } catch { /* best-effort */ }
    router.replace('/teacher/dashboard')
  }

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.back()}
          className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
          Go Back
        </button>
      </div>
    </div>
  )

  if (ended) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-white/60 text-sm">Session ended — redirecting…</p>
      </div>
    </div>
  )

  if (!token) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117]">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Starting session…</p>
      </div>
    </div>
  )

  return (
    <>
      <TeacherRoom
        token={token}
        serverUrl={serverUrl}
        participantName={session?.user?.name ?? 'Teacher'}
        onEndSession={handleEnd}
        onDisconnected={handleEnd}
        onTakeAttendance={handleTakeAttendance}
      />
      {showAttendance && (
        <AttendanceModal
          attendance={attendance}
          onClose={() => setShowAttendance(false)}
          onRetake={handleTakeAttendance}
        />
      )}
    </>
  )
}

function AttendanceModal({ attendance, onClose, onRetake }: {
  attendance: AttendanceState
  onClose: () => void
  onRetake: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-[#1C1C1E] border border-white/10 overflow-hidden"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            <span className="text-white text-sm font-bold">Attendance</span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        <div className="px-5 py-5">
          {attendance.phase === 'taking' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm">Capturing who&apos;s in the room…</p>
            </div>
          )}

          {attendance.phase === 'error' && (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm">{attendance.message}</p>
              <button onClick={onClose} className="mt-4 text-xs text-white/50 hover:text-white/80 underline">Close</button>
            </div>
          )}

          {attendance.phase === 'done' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5">Taken at</p>
                  <p className="text-sm font-semibold text-white">
                    {new Date(attendance.record.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-black text-emerald-300">{attendance.record.presentCount} present</span>
                </div>
              </div>

              {attendance.record.presentCount === 0 ? (
                <div className="text-center py-6">
                  <p className="text-white/40 text-sm">No students were in the room at this moment.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {attendance.record.presentStudents.map((s, i) => (
                    <div key={s.userId} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ background: ['#3B7FE8','#9333EA','#16A34A','#E04828','#0891B2'][i % 5] }}>
                        {s.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <p className="text-sm text-white/80 font-medium flex-1 min-w-0 truncate">{s.name}</p>
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-white/30 mt-4 text-center">
                Students have been notified. You can take attendance again at any time.
              </p>
              <button onClick={onRetake}
                className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-black py-2.5 rounded-xl text-black transition-all hover:-translate-y-px"
                style={{ background: '#C5D000' }}>
                <ClipboardCheck className="w-3.5 h-3.5" /> Take Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
