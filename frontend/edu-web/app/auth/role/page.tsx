'use client'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

const LAVENDER = '#C4B5FA'
const PURPLE   = '#7C3AED'
const LIME     = '#BEF264'
const LIME_D   = '#65A30D'
const CREAM    = '#FFFEF9'
const INK      = '#1e1b4b'

export default function RoleSelectionPage() {
  const { data: session, status, update } = useSession()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (session?.role === 'teacher' || session?.role === 'student') {
      window.location.href = session.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    }
  }, [status, session?.role])

  const choose = async (role: 'teacher' | 'student') => {
    if (saving) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError((data as any).error ?? 'Could not save your role. Please try again.'); setSaving(false); return }
      // update() patches the JWT cookie — the useEffect above watches session.role
      // and navigates once it reflects in the session. Hard-navigate as fallback after 2s.
      await update({ role: (data as any).role, apiToken: (data as any).apiToken })
      setTimeout(() => {
        const dest = (data as any).role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
        window.location.href = dest
      }, 400)
    } catch {
      setError('Network error. Please try again.'); setSaving(false)
    }
  }

  if (status === 'loading' || (session?.role && session.role !== '')) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PURPLE }} />
      </div>
    )
  }

  if (saving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: CREAM }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 border-2 border-[#111]"
          style={{ background: LAVENDER, boxShadow: '4px 4px 0 #111' }}>
          <svg className="w-7 h-7" fill="none" stroke="#111" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
          </svg>
        </div>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: PURPLE }} />
        <p className="text-gray-500 text-sm font-medium">Setting up your account…</p>
      </div>
    )
  }

  const teacherPerks = ['Unlimited classrooms', 'HD live video', 'Shared whiteboard', 'Student channels']
  const studentPerks = ['Join via invite code', 'Live video sessions', 'Collaborate on whiteboard', 'Class chat']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-14" style={{ background: CREAM }}>

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed top-0 left-0 w-[500px] h-[500px] rounded-full -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{ background: LAVENDER, filter: 'blur(120px)' }} />
      <div className="pointer-events-none fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full translate-x-1/3 translate-y-1/3 opacity-30"
        style={{ background: LIME, filter: 'blur(100px)' }} />

      <div className="relative z-10 w-full max-w-2xl">

        {/* Logo + header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-[#111]"
              style={{ background: LAVENDER, boxShadow: '3px 3px 0 #111' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="font-black text-2xl tracking-tight" style={{ color: INK }}>Kattral Academy</span>
          </div>
          <h1 className="font-black mb-3 leading-[0.95] tracking-tight" style={{ fontSize: 'clamp(36px, 6vw, 56px)', color: INK }}>
            Who are you here as?
          </h1>
          <p className="text-gray-400 text-base font-medium">
            Pick your role — you can always change it later.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">

          {/* Teacher */}
          <div className="bg-white rounded-3xl overflow-hidden flex flex-col relative"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-black tracking-wide"
              style={{ background: LAVENDER, color: INK, boxShadow: '0 2px 8px rgba(124,58,237,0.2)' }}>
              Educator Portal
            </div>
            <div className="relative overflow-hidden" style={{ height: 260 }}>
              <img src="/teacher-character.jpeg" alt="Teacher" className="w-full h-full object-cover object-top" />
              <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white to-transparent" />
            </div>
            <div className="px-7 pt-2 pb-7 flex flex-col flex-1">
              <h2 className="font-black text-2xl tracking-tight mb-2" style={{ color: INK }}>Teacher</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Create classrooms, schedule live sessions, and guide your students.
              </p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {teacherPerks.map(p => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={PURPLE} strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
              <button onClick={() => choose('teacher')} disabled={saving}
                className="w-full disabled:opacity-50 font-black py-3.5 rounded-2xl text-sm border-2 border-[#111] transition-transform hover:-translate-y-0.5"
                style={{ background: LAVENDER, color: '#1e1b4b', boxShadow: '4px 4px 0 #111' }}>
                Continue as Teacher
              </button>
            </div>
          </div>

          {/* Student */}
          <div className="bg-white rounded-3xl overflow-hidden flex flex-col relative"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-black tracking-wide"
              style={{ background: LIME, color: INK, boxShadow: '0 2px 8px rgba(101,163,13,0.2)' }}>
              Student Portal
            </div>
            <div className="relative overflow-hidden" style={{ height: 260 }}>
              <img src="/student-character.jpeg" alt="Student" className="w-full h-full object-cover object-top" />
              <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-white to-transparent" />
            </div>
            <div className="px-7 pt-2 pb-7 flex flex-col flex-1">
              <h2 className="font-black text-2xl tracking-tight mb-2" style={{ color: INK }}>Student</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Join with a code, attend sessions, and learn alongside your class.
              </p>
              <ul className="space-y-2.5 mb-7 flex-1">
                {studentPerks.map(p => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={LIME_D} strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
              <button onClick={() => choose('student')} disabled={saving}
                className="w-full disabled:opacity-50 font-black py-3.5 rounded-2xl text-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: LIME, color: INK, boxShadow: '0 4px 18px rgba(190,242,100,0.40)' }}>
                Continue as Student
              </button>
            </div>
          </div>

        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4 font-medium">{error}</p>}

        <p className="text-center text-gray-400 text-sm">
          Wrong account?{' '}
          <button onClick={() => signOut({ callbackUrl: '/' })}
            className="font-semibold hover:underline" style={{ color: PURPLE }}>
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}
