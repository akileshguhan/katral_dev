'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import StudentRoom from '@/components/session/StudentRoom'

export default function StudentSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessionId, setSessionId]       = useState('')
  const [token, setToken]               = useState<string | null>(null)
  const [serverUrl, setServerUrl]       = useState('')
  const [error, setError]               = useState('')
  const [left, setLeft]                 = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const joinedRef                       = useRef(false)

  useEffect(() => {
    params.then(p => setSessionId(p.id))
  }, [params])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken || !sessionId) return
    if (joinedRef.current) return
    joinedRef.current = true

    api.sessions.join(session.apiToken, sessionId)
      .then(r => {
        setToken(r.token)
        setServerUrl(r.url)
      })
      .catch(e => setError(e.message))
  }, [session, status, sessionId])

  // Poll session status every 15 s; redirect when teacher ends session
  useEffect(() => {
    if (!session?.apiToken || !sessionId || !token) return
    const id = setInterval(async () => {
      try {
        const s = await api.sessions.getStatus(session.apiToken!, sessionId)
        if (s.status === 'ended') {
          setSessionEnded(true)
          clearInterval(id)
          setTimeout(() => router.replace('/student/dashboard'), 3000)
        }
      } catch { /* ignore */ }
    }, 15_000)
    return () => clearInterval(id)
  }, [session, sessionId, token, router])

  const handleLeave = () => {
    setLeft(true)
    router.replace('/student/dashboard')
  }

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.back()} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">Go Back</button>
      </div>
    </div>
  )

  if (sessionEnded) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-white/80 font-semibold">Session ended</p>
        <p className="text-white/40 text-sm">Redirecting to dashboard…</p>
      </div>
    </div>
  )

  if (left) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-3">
        <p className="text-white/60 text-sm">You left the session — redirecting…</p>
      </div>
    </div>
  )

  if (!token) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117]">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Joining session…</p>
      </div>
    </div>
  )

  return (
    <StudentRoom
      token={token}
      serverUrl={serverUrl}
      participantName={session?.user?.name ?? 'Student'}
      onDisconnected={handleLeave}
    />
  )
}
