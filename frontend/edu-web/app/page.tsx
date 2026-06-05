'use client'
import { signIn } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion'

type Mode = 'login' | 'register'

// Committed palette: cream surface, near-black text, lime primary, coral accent
const LIME  = '#C5D000'
const CORAL = '#E04828'
const INK   = '#0f0e0e'
const CREAM = '#F9F8F3'
const MIST  = '#F2F0E8'

const FEATURES = [
  { n: '01', title: 'Live Video',      desc: 'HD video classrooms with screen share and recording. Start in seconds.',    accent: CORAL },
  { n: '02', title: 'Whiteboard',      desc: 'An infinite shared canvas. Draw, annotate, and teach in real time.',         accent: '#7C3AED' },
  { n: '03', title: 'Class Channels',  desc: 'Persistent text channels for Q&A, announcements, and resources.',            accent: '#0284C7' },
  { n: '04', title: 'Classroom Mgmt', desc: 'Invite codes, student rosters, session scheduling — all in one place.',       accent: '#16A34A' },
]

export default function LandingPage() {
  const [mode, setMode]         = useState<Mode>('register')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history)
      window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

  const heroRef  = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress: heroScroll }  = useScroll({ target: heroRef,  offset: ['start start', 'end start'] })
  const { scrollYProgress: cardsScroll } = useScroll({ target: cardsRef, offset: ['start end', 'end start'] })
  const heroY       = useTransform(heroScroll,  [0, 1], ['0%', '28%'])
  const heroOpacity = useTransform(heroScroll,  [0, 0.55], [1, 0])
  const card1Y      = useTransform(cardsScroll, [0, 1], ['-5%', '5%'])
  const card2Y      = useTransform(cardsScroll, [0, 1], ['5%', '-5%'])

  const { scrollYProgress } = useScroll({ target: morphRef, offset: ['start end', 'end start'] })
  const S           = { stiffness: 38, damping: 14, mass: 1.1 }
  const orbScale    = useSpring(useTransform(scrollYProgress, [0.04, 0.46], [1, 62]), S)
  const orbRadius   = useSpring(useTransform(scrollYProgress, [0.04, 0.46], [50, 14]), S)
  const orbOpacity  = useTransform(scrollYProgress, [0.02, 0.14, 0.50, 0.63], [0, 1, 1, 0])
  const sectionBg   = useTransform(scrollYProgress, [0.48, 0.62], [0, 1])
  const formOpacity = useTransform(scrollYProgress, [0.56, 0.74], [0, 1])
  const formY       = useTransform(scrollYProgress, [0.56, 0.74], [36, 0])

  const handleGoogle = () => signIn('google', { callbackUrl: '/auth/role' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    if (mode === 'register') {
      try {
        const res = await fetch('/api/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password }),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Registration failed'); setLoading(false); return }
      } catch { setError('Network error'); setLoading(false); return }
    }
    let result: Awaited<ReturnType<typeof signIn>> | undefined
    try { result = await signIn('credentials', { email, password, redirect: false }) }
    catch { setError('Network error. Please try again.'); setLoading(false); return }
    if (result?.error || !result?.ok) { setError('Invalid email or password'); setLoading(false); return }
    window.location.href = '/auth/role'
  }

  const scrollToAuth = () => {
    if (!morphRef.current) return
    const el = morphRef.current
    const elementTop = el.getBoundingClientRect().top + window.scrollY
    const vh = window.innerHeight
    window.scrollTo({ top: (elementTop - vh) + 0.72 * (el.offsetHeight + vh), behavior: 'smooth' })
  }

  return (
    <div style={{ background: CREAM, color: INK }} className="min-h-screen">

      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 h-16 bg-white/90 backdrop-blur-md"
        style={{ borderBottom: '1px solid rgba(15,14,14,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: LIME }}>
            <svg className="w-4 h-4" fill="none" stroke={INK} strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: INK }}>Kattral Academy</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => { setMode('login'); scrollToAuth() }}
            className="text-sm font-medium transition-opacity hover:opacity-50" style={{ color: INK }}>
            Sign in
          </button>
          <button onClick={scrollToAuth}
            className="text-sm font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: INK, color: LIME }}>
            Get started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section ref={heroRef} className="relative overflow-hidden flex flex-col items-center justify-center px-6 pt-20 pb-32"
        style={{ minHeight: '100vh', background: CREAM }}>

        {/* Subtle dot grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle, rgba(15,14,14,0.07) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }} />

        {/* Lime radial glow behind headline */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(200,250,86,0.09) 0%, transparent 65%)' }} />

        {/* ── Floating card: For Teachers (top-left, −8°) ── */}
        <motion.div className="absolute hidden lg:block pointer-events-none select-none"
          style={{ top: '12%', left: '5%', rotate: -8 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -12, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: 0.3, ease: 'easeOut' },
            y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
          }}>
          <div className="w-44 bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(15,14,14,0.07)', boxShadow: '0 16px 48px rgba(15,14,14,0.12)' }}>
            <div className="h-28 bg-[#f0ebff] overflow-hidden">
              <img src="/teacher-character.jpeg" alt="" className="w-full h-full object-cover object-top" />
            </div>
            <div className="px-3.5 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black" style={{ color: INK }}>For Teachers</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Create & guide</p>
              </div>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#7C3AED' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Floating card: Live Sessions (top-right, +7°) ── */}
        <motion.div className="absolute hidden lg:block pointer-events-none select-none"
          style={{ top: '10%', right: '5%', rotate: 7 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: 0.5, ease: 'easeOut' },
            y: { duration: 2.9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
          }}>
          <div className="w-44 bg-white rounded-2xl p-4"
            style={{ border: '1px solid rgba(15,14,14,0.07)', boxShadow: '0 16px 48px rgba(15,14,14,0.12)' }}>
            <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center shrink-0" style={{ background: CORAL }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p className="text-xs font-black" style={{ color: INK }}>Live Sessions</p>
            <p className="text-[10px] text-gray-400 mt-0.5">HD video classrooms</p>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-[9px] font-bold text-emerald-600">Active right now</p>
            </div>
          </div>
        </motion.div>

        {/* ── Floating card: For Students (bottom-right, +11°) ── */}
        <motion.div className="absolute hidden lg:block pointer-events-none select-none"
          style={{ bottom: '13%', right: '4%', rotate: 11 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: 0.7, ease: 'easeOut' },
            y: { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 1 },
          }}>
          <div className="w-44 bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(15,14,14,0.07)', boxShadow: '0 16px 48px rgba(15,14,14,0.12)' }}>
            <div className="h-28 bg-[#f0fdf4] overflow-hidden">
              <img src="/student-character.jpeg" alt="" className="w-full h-full object-cover object-top" />
            </div>
            <div className="px-3.5 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black" style={{ color: INK }}>For Students</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Learn & connect</p>
              </div>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#16A34A' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Floating card: Whiteboard (bottom-left, −6°) ── */}
        <motion.div className="absolute hidden lg:block pointer-events-none select-none"
          style={{ bottom: '18%', left: '4%', rotate: -6 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -14, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: 0.9, ease: 'easeOut' },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.4 },
          }}>
          <div className="w-40 bg-white rounded-2xl p-4"
            style={{ border: '1px solid rgba(15,14,14,0.07)', boxShadow: '0 16px 48px rgba(15,14,14,0.12)' }}>
            <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center shrink-0" style={{ background: LIME }}>
              <svg className="w-5 h-5" fill="none" stroke={INK} strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <p className="text-xs font-black" style={{ color: INK }}>Whiteboard</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Infinite shared canvas</p>
          </div>
        </motion.div>

        <motion.div className="relative z-10 text-center max-w-5xl mx-auto w-full"
          style={{ y: heroY, opacity: heroOpacity }}>

          {/* Category label */}
          <div className="inline-flex items-center gap-2 mb-10">
            <span className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color: CORAL }}>
              Learning Management Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-black leading-[0.88] tracking-[-0.04em] mb-8"
            style={{ fontSize: 'clamp(60px, 10vw, 128px)', color: INK }}>
            <span className="block">Teaching,</span>
            <span className="block" style={{ color: CORAL }}>effortlessly</span>
            <span className="block">yours.</span>
          </h1>

          <p className="text-lg max-w-lg mx-auto mb-12 leading-relaxed font-normal"
            style={{ color: 'rgba(15,14,14,0.5)' }}>
            Create classrooms, run live sessions, and guide your students. All in one place, free to start.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={scrollToAuth}
              className="font-bold text-sm px-8 py-3.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: INK, color: LIME }}>
              Start for free
            </button>
            <button onClick={() => { setMode('login'); scrollToAuth() }}
              className="font-medium text-sm px-8 py-3.5 rounded-xl border transition-opacity hover:opacity-60"
              style={{ borderColor: 'rgba(15,14,14,0.15)', color: INK, background: 'transparent' }}>
              Sign in
            </button>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-xs font-medium" style={{ color: 'rgba(15,14,14,0.35)' }}>
            No credit card required. Free for teachers and students.
          </p>
        </motion.div>
      </section>

      {/* ILLUSTRATED ROLE CARDS */}
      <section ref={cardsRef} className="py-24 px-6 overflow-hidden" style={{ background: MIST, borderTop: '1px solid rgba(15,14,14,0.08)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: CORAL }}>Who it's for</p>
            <h2 className="font-black leading-[0.92] tracking-tight"
              style={{ fontSize: 'clamp(32px, 4.5vw, 54px)', color: INK }}>
              Made for teachers.<br />Built for students.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <motion.div style={{ y: card1Y, border: '1px solid rgba(15,14,14,0.08)' }}
              className="bg-white rounded-2xl overflow-hidden cursor-pointer group"
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={scrollToAuth}>
              <div className="relative overflow-hidden bg-[#f0ebff]" style={{ height: 240 }}>
                <img src="/teacher-character.jpeg" alt="Teacher"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>
              <div className="px-7 py-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-xl" style={{ color: INK }}>Teacher</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md"
                    style={{ background: '#f0ebff', color: '#7C3AED' }}>Educator</span>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(15,14,14,0.5)' }}>
                  Create classrooms, schedule live sessions, and guide your students through their learning journey.
                </p>
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#7C3AED' }}>
                  Get started as a teacher
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>

            <motion.div style={{ y: card2Y }}
              className="bg-white rounded-2xl overflow-hidden cursor-pointer group"
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={scrollToAuth}>
              <div className="relative overflow-hidden bg-[#f0fdf4]" style={{ height: 240 }}>
                <img src="/student-character.jpeg" alt="Student"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>
              <div className="px-7 py-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-xl" style={{ color: INK }}>Student</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md"
                    style={{ background: '#f0fdf4', color: '#16A34A' }}>Learner</span>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(15,14,14,0.5)' }}>
                  Join with a code, attend live sessions, collaborate on a shared whiteboard, and connect with classmates.
                </p>
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#16A34A' }}>
                  Get started as a student
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — numbered rows, not cards */}
      <section style={{ background: INK, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: LIME }}>How it works</p>
          <h2 className="font-black leading-[0.92] tracking-tight"
            style={{ fontSize: 'clamp(32px, 4.5vw, 54px)', color: 'white' }}>
            Live in three steps.
          </h2>
        </div>
        {[
          { n: '01', title: 'Create a classroom', desc: 'Set up your virtual class in seconds. You get a unique join code to share with students.' },
          { n: '02', title: 'Invite your students', desc: 'Students enter the code on any device. No accounts required to join for the first time.' },
          { n: '03', title: 'Go live together', desc: 'Launch HD video, open the shared whiteboard, and start teaching. Everything in one tab.' },
        ].map((step, i) => (
          <motion.div key={step.n}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
            className="border-t"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="max-w-4xl mx-auto px-6 py-10 flex items-center gap-10 sm:gap-16">
              <span className="font-black tabular-nums shrink-0"
                style={{ fontSize: 'clamp(11px,1vw,13px)', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
                {step.n}
              </span>
              <h3 className="font-black leading-none tracking-tight flex-1"
                style={{ fontSize: 'clamp(24px,3.5vw,48px)', color: 'white' }}>
                {step.title}
              </h3>
              <p className="hidden md:block text-sm leading-relaxed max-w-[200px] shrink-0"
                style={{ color: 'rgba(255,255,255,0.4)' }}>
                {step.desc}
              </p>
            </div>
          </motion.div>
        ))}
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      </section>

      {/* FEATURES */}
      <section style={{ background: CREAM, borderTop: '1px solid rgba(15,14,14,0.08)' }}>
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-4" style={{ color: CORAL }}>Features</p>
          <h2 className="font-black leading-[0.92] tracking-tight"
            style={{ fontSize: 'clamp(32px,4.5vw,54px)', color: INK }}>
            Everything you need.
          </h2>
        </div>

        {FEATURES.map((f, i) => (
          <motion.div key={f.n}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="border-t group"
            style={{ borderColor: 'rgba(15,14,14,0.08)' }}>
            <div className="max-w-4xl mx-auto px-6 py-10 flex items-center gap-10 sm:gap-16">
              <span className="font-black tabular-nums shrink-0"
                style={{ fontSize: '13px', color: 'rgba(15,14,14,0.25)', letterSpacing: '0.08em' }}>
                {f.n}
              </span>
              <h3 className="font-black leading-none tracking-tight flex-1 whitespace-nowrap transition-colors duration-300"
                style={{ fontSize: 'clamp(26px,3.8vw,56px)', color: INK }}>
                <span style={{ color: f.accent }}>{f.title[0]}</span>{f.title.slice(1)}
              </h3>
              <p className="hidden md:block text-sm leading-relaxed max-w-[220px] shrink-0"
                style={{ color: 'rgba(15,14,14,0.5)' }}>
                {f.desc}
              </p>
              <div className="w-8 h-8 rounded-full shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: f.accent, opacity: 0.15 }} />
            </div>
          </motion.div>
        ))}
        <div className="border-t" style={{ borderColor: 'rgba(15,14,14,0.08)' }} />
      </section>

      {/* SCROLL MORPH AUTH */}
      <div ref={morphRef} style={{ height: '220vh' }}>
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center"
          style={{ background: CREAM, borderTop: '1px solid rgba(15,14,14,0.08)' }}>
          <motion.div style={{ opacity: sectionBg, background: INK }} className="absolute inset-0" />

          <motion.div
            style={{ scale: orbScale, opacity: orbOpacity, borderRadius: orbRadius, background: LIME }}
            className="absolute z-10 w-14 h-14 flex items-center justify-center"
            aria-hidden>
            <svg className="w-6 h-6" fill="none" stroke={INK} strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </motion.div>

          <motion.div style={{ opacity: formOpacity, y: formY }}
            className="relative z-20 w-full max-w-sm mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="font-black text-white mb-2"
                style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                Join Kattral<br />Academy
              </h2>
              <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {mode === 'login' ? "No account? " : 'Already have one? '}
                <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
                  className="text-white font-semibold hover:opacity-70 transition-opacity">
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
              <button onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 border font-medium py-3 rounded-xl text-sm transition-colors hover:bg-gray-50 mb-5"
                style={{ borderColor: 'rgba(15,14,14,0.12)', color: INK }}>
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 border-t" style={{ borderColor: 'rgba(15,14,14,0.08)' }} />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 border-t" style={{ borderColor: 'rgba(15,14,14,0.08)' }} />
              </div>
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div key="name"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden">
                      <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required
                        className="w-full bg-[#F7F6F3] border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                        style={{ borderColor: 'rgba(15,14,14,0.12)', color: INK }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(15,14,14,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(15,14,14,0.12)')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-[#F7F6F3] border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                  style={{ borderColor: 'rgba(15,14,14,0.12)', color: INK }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(15,14,14,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(15,14,14,0.12)')}
                />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-[#F7F6F3] border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                  style={{ borderColor: 'rgba(15,14,14,0.12)', color: INK }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(15,14,14,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(15,14,14,0.12)')}
                />
                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-xs font-medium text-center py-1" style={{ color: CORAL }}>
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                <button type="submit" disabled={loading}
                  className="w-full disabled:opacity-50 font-bold py-3 rounded-xl text-sm transition-opacity hover:opacity-80"
                  style={{ background: INK, color: LIME }}>
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Loading
                      </span>
                    : mode === 'login' ? 'Sign In' : 'Create Account'
                  }
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <section className="py-24 px-6 text-center" style={{ background: INK }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <h2 className="font-black text-white leading-[0.92] tracking-tight mb-5"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
            Ready to start?
          </h2>
          <p className="mb-10 text-base font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Free for teachers and students. No credit card required.
          </p>
          <button onClick={scrollToAuth}
            className="font-bold text-sm px-8 py-3.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: LIME, color: INK }}>
            Get started free
          </button>
        </motion.div>
      </section>

      <footer style={{ background: CREAM, borderTop: '1px solid rgba(15,14,14,0.08)' }}
        className="py-8 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: LIME }}>
            <svg className="w-3 h-3" fill="none" stroke={INK} strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: INK }}>Kattral Academy</span>
        </div>
        <p className="text-xs" style={{ color: 'rgba(15,14,14,0.35)' }}>
          2025 Kattral Academy. Built for learners everywhere.
        </p>
      </footer>
    </div>
  )
}
