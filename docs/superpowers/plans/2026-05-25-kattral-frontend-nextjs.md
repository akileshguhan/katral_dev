# Kattral Academy — Next.js 14 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js 14 frontend with role-split routing (`/teacher/*`, `/student/*`), the provided glass-morphism AuthComponent, a Calmendar-inspired student dashboard, a schedule-based teacher dashboard, classroom channel pages, and LiveKit session rooms.

**Architecture:** Next.js calls the .NET 8 API via `lib/api.ts`. NextAuth handles only the Google OAuth callback and stores the .NET JWT in the session. `middleware.ts` enforces role-based route protection. All data fetching is client-side via SWR-style polling.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, framer-motion, canvas-confetti, class-variance-authority, lucide-react, @livekit/components-react

**Prerequisite:** .NET backend must be running on `http://localhost:5000`

---

## File Map

```
frontend/edu-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                              ← AuthComponent landing
│   ├── api/auth/[...nextauth]/route.ts       ← Google OAuth callback
│   ├── teacher/
│   │   ├── dashboard/page.tsx
│   │   ├── classroom/[id]/page.tsx
│   │   └── session/[id]/page.tsx
│   └── student/
│       ├── dashboard/page.tsx
│       ├── classroom/[id]/page.tsx
│       └── session/[id]/page.tsx
├── components/
│   ├── ui/sign-up.tsx                        ← copy-paste provided component
│   ├── classroom/
│   │   ├── CreateClassroomModal.tsx
│   │   └── JoinClassroomModal.tsx
│   ├── channel/
│   │   ├── ChannelList.tsx
│   │   ├── MessageList.tsx
│   │   └── MessageInput.tsx
│   └── session/
│       ├── TeacherRoom.tsx
│       ├── StudentRoom.tsx
│       ├── Whiteboard.tsx
│       └── SessionChat.tsx
├── lib/
│   ├── api.ts
│   └── authOptions.ts
├── types/
│   ├── index.ts
│   └── next-auth.d.ts
├── middleware.ts
├── .env.local
└── next.config.ts
```

---

### Task 1: Scaffold Next.js 14 app with shadcn/ui

**Files:**
- Create: `frontend/edu-web/` (entire new Next.js project)

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend
npx create-next-app@latest edu-web \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias="@/*" --no-git
```

- [ ] **Step 2: Install shadcn/ui**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web
npx shadcn@latest init -d
```
When prompted: choose `Default` style, `slate` base color, CSS variables = yes.

- [ ] **Step 3: Install all dependencies**

```bash
npm install next-auth @auth/core \
  framer-motion canvas-confetti class-variance-authority \
  lucide-react \
  @livekit/components-react @livekit/components-styles livekit-client livekit-server-sdk \
  @types/canvas-confetti
```

- [ ] **Step 4: Write .env.local**

```bash
cat > .env.local << 'EOF'
NEXTAUTH_SECRET=your-random-32-char-string-here
NEXTAUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance-url
EOF
```

> Note: Frontend runs on port 3001 (`npm run dev -- -p 3001`) to avoid conflict with the existing Supabase MVP on port 3000.
> Get your Google OAuth credentials from https://console.cloud.google.com/apis/credentials
> Get your LiveKit URL from your LiveKit Cloud dashboard

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev -- -p 3001 &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
pkill -f "next dev"
```
Expected: `200`

- [ ] **Step 6: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/
git commit -m "chore: scaffold Next.js 14 frontend with shadcn/ui and deps"
```

---

### Task 2: Types + authOptions + NextAuth route

**Files:**
- Create: `frontend/edu-web/types/index.ts`
- Create: `frontend/edu-web/types/next-auth.d.ts`
- Create: `frontend/edu-web/lib/authOptions.ts`
- Create: `frontend/edu-web/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write types/index.ts**

```typescript
export interface User {
  id: string
  email: string
  name: string
  role: 'teacher' | 'student'
}

export interface Classroom {
  id: string
  name: string
  joinCode: string
  teacherId: string
  createdAt: string
  channels?: Channel[]
}

export interface Channel {
  id: string
  name: string
  type: 'general' | 'announcement' | 'resource'
  createdAt: string
}

export interface Message {
  id: string
  content: string
  createdAt: string
  sender: { senderId: string; senderName: string }
}

export interface Session {
  id: string
  title: string
  status: 'waiting' | 'live' | 'ended'
  roomId: string | null
  createdAt: string
}
```

- [ ] **Step 2: Write types/next-auth.d.ts**

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    apiToken: string
    role: string | null
    userId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    apiToken?: string
    role?: string | null
    userId?: string
  }
}
```

- [ ] **Step 3: Write lib/authOptions.ts**

```typescript
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          })
          if (!res.ok) return null
          const data = await res.json()
          return { id: data.user.id, email: data.user.email, name: data.user.name, apiToken: data.token, role: data.user.role }
        } catch { return null }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Google sign-in: exchange Google ID token for .NET JWT
      if (account?.provider === 'google' && account.id_token) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: account.id_token }),
          })
          if (res.ok) {
            const data = await res.json()
            token.apiToken = data.token
            token.role     = data.user.role
            token.userId   = data.user.id
          }
        } catch { /* network error — token remains without apiToken */ }
      }
      // Credentials sign-in: user object has apiToken from authorize()
      if (account?.provider === 'credentials' && (user as any)?.apiToken) {
        token.apiToken = (user as any).apiToken
        token.role     = (user as any).role
        token.userId   = user.id
      }
      // Role update from PATCH /api/auth/role page
      if ((token as any).roleUpdated) {
        token.role = (token as any).roleUpdated
        delete (token as any).roleUpdated
      }
      return token
    },
    async session({ session, token }) {
      session.apiToken = token.apiToken as string ?? ''
      session.role     = token.role as string | null ?? null
      session.userId   = token.userId as string ?? ''
      return session
    },
  },
  pages: { signIn: '/' },
}
```

- [ ] **Step 4: Write app/api/auth/[...nextauth]/route.ts**

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 5: Build check**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only missing provider package errors — install `next-auth/providers/credentials` if needed).

- [ ] **Step 6: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/edu-web/types/ frontend/edu-web/lib/authOptions.ts frontend/edu-web/app/api/
git commit -m "feat: add NextAuth with Google + credentials, types, and JWT session"
```

---

### Task 3: lib/api.ts — all .NET backend calls

**Files:**
- Create: `frontend/edu-web/lib/api.ts`

- [ ] **Step 1: Write lib/api.ts**

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body
}

export const api = {
  auth: {
    register: (email: string, name: string, password: string, role: string) =>
      request<{ token: string; user: { id: string; email: string; name: string; role: string } }>(
        '/api/auth/register', '', { method: 'POST', body: JSON.stringify({ email, name, password, role }) }
      ),
    updateRole: (token: string, role: string) =>
      request<{ role: string }>('/api/auth/role', token, { method: 'PATCH', body: JSON.stringify({ role }) }),
  },

  classrooms: {
    list: (token: string) =>
      request<import('@/types').Classroom[]>('/api/classrooms', token),
    create: (token: string, name: string) =>
      request<import('@/types').Classroom>('/api/classrooms', token, { method: 'POST', body: JSON.stringify({ name }) }),
    get: (token: string, id: string) =>
      request<import('@/types').Classroom & { channels: import('@/types').Channel[]; members: { id: string; name: string; email: string }[] }>(
        `/api/classrooms/${id}`, token
      ),
    join: (token: string, joinCode: string) =>
      request<import('@/types').Classroom>('/api/classrooms/join', token, { method: 'POST', body: JSON.stringify({ joinCode }) }),
  },

  channels: {
    list: (token: string, classroomId: string) =>
      request<import('@/types').Channel[]>(`/api/classrooms/${classroomId}/channels`, token),
    getMessages: (token: string, channelId: string) =>
      request<import('@/types').Message[]>(`/api/channels/${channelId}/messages`, token),
    sendMessage: (token: string, channelId: string, content: string) =>
      request<import('@/types').Message>(`/api/channels/${channelId}/messages`, token, {
        method: 'POST', body: JSON.stringify({ content }),
      }),
  },

  sessions: {
    list: (token: string, classroomId: string) =>
      request<import('@/types').Session[]>(`/api/classrooms/${classroomId}/sessions`, token),
    create: (token: string, classroomId: string, title: string) =>
      request<import('@/types').Session>(`/api/classrooms/${classroomId}/sessions`, token, {
        method: 'POST', body: JSON.stringify({ title }),
      }),
    start: (token: string, sessionId: string) =>
      request<{ token: string; roomId: string; liveKitUrl: string }>(`/api/sessions/${sessionId}/start`, token, { method: 'POST' }),
    join: (token: string, sessionId: string) =>
      request<{ token: string; roomId: string; liveKitUrl: string }>(`/api/sessions/${sessionId}/join`, token, { method: 'POST' }),
    end: (token: string, sessionId: string) =>
      request<void>(`/api/sessions/${sessionId}/end`, token, { method: 'POST' }),
  },
}
```

- [ ] **Step 2: Type check**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/edu-web/lib/api.ts
git commit -m "feat: add api.ts — typed wrappers for all .NET backend endpoints"
```

---

### Task 4: Root layout + middleware + AuthComponent page

**Files:**
- Modify: `frontend/edu-web/app/layout.tsx`
- Create: `frontend/edu-web/middleware.ts`
- Create: `frontend/edu-web/components/ui/sign-up.tsx`
- Modify: `frontend/edu-web/app/page.tsx`

- [ ] **Step 1: Write app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import SessionProvider from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Kattral Academy', description: 'Live learning platform' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create SessionProvider component**

```bash
mkdir -p /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/components/providers
```

```typescript
// frontend/edu-web/components/providers/SessionProvider.tsx
'use client'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

export default function SessionProvider({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return <NextAuthSessionProvider session={session}>{children}</NextAuthSessionProvider>
}
```

- [ ] **Step 3: Write middleware.ts**

```typescript
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  // Unauthenticated → send to landing
  if (!token && (pathname.startsWith('/teacher') || pathname.startsWith('/student'))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Wrong role → redirect to correct dashboard
  if (token?.role === 'student' && pathname.startsWith('/teacher')) {
    return NextResponse.redirect(new URL('/student/dashboard', req.url))
  }
  if (token?.role === 'teacher' && pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL('/teacher/dashboard', req.url))
  }

  // Authenticated user on landing → redirect to dashboard
  if (token?.apiToken && pathname === '/') {
    const dest = token.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/', '/teacher/:path*', '/student/:path*'] }
```

- [ ] **Step 4: Copy AuthComponent — create components/ui/sign-up.tsx**

Copy the full `sign-up.tsx` file provided in the spec into:
`frontend/edu-web/components/ui/sign-up.tsx`

Then modify the `handleFinalSubmit` and `handleSelect` (Google button) to call the .NET API:

```typescript
// Replace the handleFinalSubmit function body inside AuthComponent:
const handleFinalSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (modalStatus !== 'closed' || authStep !== 'confirmPassword') return
  if (password !== confirmPassword) {
    setModalErrorMessage('Passwords do not match!')
    setModalStatus('error')
    return
  }
  setModalStatus('loading')
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: email.split('@')[0], password, role: 'student' }),
    })
    if (!res.ok) {
      const data = await res.json()
      setModalErrorMessage(data.error ?? 'Registration failed')
      setModalStatus('error')
      return
    }
    const { token } = await res.json()
    // Sign in with credentials so NextAuth picks up the session
    const { signIn } = await import('next-auth/react')
    await signIn('credentials', { email, password, redirect: false })
    setTimeout(() => { fireSideCanons(); setModalStatus('success') }, 1500)
    setTimeout(() => { window.location.href = '/student/dashboard' }, 3500)
  } catch {
    setModalErrorMessage('Network error — please try again')
    setModalStatus('error')
  }
}
```

- [ ] **Step 5: Write app/page.tsx**

```typescript
import { AuthComponent } from '@/components/ui/sign-up'

const KattralLogo = () => (
  <div className="bg-indigo-600 text-white rounded-md p-1.5">
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9-5m9 5l9-5" />
    </svg>
  </div>
)

export default function LandingPage() {
  return <AuthComponent logo={<KattralLogo />} brandName="Kattral Academy" />
}
```

- [ ] **Step 6: Build check**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/edu-web/app/ frontend/edu-web/middleware.ts frontend/edu-web/components/
git commit -m "feat: landing page with AuthComponent, middleware role routing"
```

---

### Task 5: Teacher Dashboard

**Files:**
- Create: `frontend/edu-web/app/teacher/dashboard/page.tsx`

- [ ] **Step 1: Write teacher/dashboard/page.tsx**

```typescript
'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import { PlusCircle, LogOut, BookOpen, Video, Settings } from 'lucide-react'
import CreateClassroomModal from '@/components/classroom/CreateClassroomModal'

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
    api.classrooms.list(session.apiToken)
      .then(setClassrooms).catch(() => {}).finally(() => setLoading(false))
  }, [session, status, router])

  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500']

  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-6 gap-6 bg-[#1a1d26] border-r border-white/10">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
          </svg>
        </div>
        <div className="flex-1 flex flex-col gap-4 items-center mt-4">
          {[
            { icon: <BookOpen className="w-5 h-5" />, href: '/teacher/dashboard', active: true },
            { icon: <Video className="w-5 h-5" />,    href: '/teacher/dashboard' },
            { icon: <Settings className="w-5 h-5" />, href: '/teacher/dashboard' },
          ].map((item, i) => (
            <Link key={i} href={item.href}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${item.active ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>
              {item.icon}
            </Link>
          ))}
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Classrooms + Schedule */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-white/50 text-sm mb-1">Welcome back,</p>
              <h1 className="text-2xl font-bold">Hi, {session?.user?.name?.split(' ')[0] ?? 'Teacher'}</h1>
              <p className="text-white/50 text-sm mt-1">Here&apos;s what&apos;s happening with your classes today.</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <PlusCircle className="w-4 h-4" /> New Classroom
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : classrooms.length === 0 ? (
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-16 text-center">
              <p className="text-white/60 mb-4">No classrooms yet</p>
              <button onClick={() => setShowCreate(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                Create your first classroom
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {classrooms.map((c, i) => (
                <Link key={c.id} href={`/teacher/classroom/${c.id}`}
                  className="flex items-center justify-between bg-[#1a1d26] hover:bg-[#1f2330] rounded-xl px-5 py-4 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">Code: {c.joinCode}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </main>

        {/* Right panel — profile */}
        <aside className="w-72 border-l border-white/10 px-6 py-8 flex flex-col gap-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
              {(session?.user?.name ?? 'T').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{session?.user?.name}</p>
              <p className="text-xs text-white/40">Instructor</p>
            </div>
          </div>
          <div className="bg-[#1a1d26] rounded-2xl p-4">
            <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">Quick Stats</p>
            <p className="text-3xl font-bold text-indigo-400">{classrooms.length}</p>
            <p className="text-sm text-white/50 mt-1">Active Classrooms</p>
          </div>
        </aside>
      </div>

      {showCreate && (
        <CreateClassroomModal
          token={session?.apiToken ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={c => { setClassrooms(p => [...p, c]); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write CreateClassroomModal.tsx**

```bash
mkdir -p /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/components/classroom
```

```typescript
// frontend/edu-web/components/classroom/CreateClassroomModal.tsx
'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { Classroom } from '@/types'
import { X } from 'lucide-react'

export default function CreateClassroomModal({
  token, onClose, onCreated
}: { token: string; onClose: () => void; onCreated: (c: Classroom) => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const classroom = await api.classrooms.create(token, name.trim())
      onCreated(classroom)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create classroom')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1d26] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Classroom</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" placeholder="Classroom name" value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading || !name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            {loading ? 'Creating…' : 'Create Classroom'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build check**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/edu-web/app/teacher/dashboard/ frontend/edu-web/components/classroom/
git commit -m "feat: teacher dashboard with classroom list and create modal"
```

---

### Task 6: Student Dashboard (Calmendar-style)

**Files:**
- Create: `frontend/edu-web/app/student/dashboard/page.tsx`
- Create: `frontend/edu-web/components/classroom/JoinClassroomModal.tsx`

- [ ] **Step 1: Write student/dashboard/page.tsx**

```typescript
'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Classroom, Session } from '@/types'
import { BookOpen, LogOut, Video, UserPlus } from 'lucide-react'
import JoinClassroomModal from '@/components/classroom/JoinClassroomModal'

const COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500']
const COLOR_BG = ['bg-indigo-500/20', 'bg-emerald-500/20', 'bg-violet-500/20', 'bg-amber-500/20', 'bg-rose-500/20']

function WeekCalendar({ classrooms, token }: { classrooms: Classroom[]; token: string }) {
  const [sessionMap, setSessionMap] = useState<Record<string, Session[]>>({})

  const fetchSessions = useCallback(async () => {
    const results = await Promise.all(
      classrooms.map(c => api.sessions.list(token, c.id).then(s => ({ id: c.id, sessions: s })).catch(() => ({ id: c.id, sessions: [] })))
    )
    setSessionMap(Object.fromEntries(results.map(r => [r.id, r.sessions])))
  }, [classrooms, token])

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  return (
    <div className="bg-[#1a1d26] rounded-2xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">This Week&apos;s Sessions</h2>
        <span className="text-xs text-white/40">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>
      <div className="space-y-3">
        {classrooms.map((c, i) => {
          const sessions = sessionMap[c.id] ?? []
          const liveSessions = sessions.filter(s => s.status === 'live')
          const waitingSessions = sessions.filter(s => s.status === 'waiting')

          return (
            <div key={c.id} className={`${COLOR_BG[i % COLOR_BG.length]} rounded-xl px-4 py-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${COLORS[i % COLORS.length]}`} />
                  <p className="text-sm font-medium text-white">{c.name}</p>
                </div>
                {liveSessions.length > 0 ? (
                  <Link href={`/student/session/${liveSessions[0].id}`}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors animate-pulse">
                    <Video className="w-3 h-3" /> JOIN LIVE
                  </Link>
                ) : waitingSessions.length > 0 ? (
                  <span className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full">Waiting to start</span>
                ) : (
                  <Link href={`/student/classroom/${c.id}`}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors">
                    View channels →
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
    api.classrooms.list(session.apiToken)
      .then(setClassrooms).catch(() => {}).finally(() => setLoading(false))
  }, [session, status, router])

  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-6 gap-6 bg-[#1a1d26] border-r border-white/10">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
          </svg>
        </div>
        <div className="flex-1 flex flex-col gap-4 items-center mt-4">
          <Link href="/student/dashboard"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-600 text-white">
            <BookOpen className="w-5 h-5" />
          </Link>
          <button onClick={() => setShowJoin(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
          <div>
            <p className="text-white/50 text-sm mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold">Hi, {session?.user?.name?.split(' ')[0] ?? 'Student'}</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : classrooms.length === 0 ? (
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-16 text-center">
              <p className="text-white/60 mb-4">You haven&apos;t joined any classrooms yet</p>
              <button onClick={() => setShowJoin(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                Join with a code
              </button>
            </div>
          ) : (
            <WeekCalendar classrooms={classrooms} token={session?.apiToken ?? ''} />
          )}
        </main>

        <aside className="w-72 border-l border-white/10 px-6 py-8 shrink-0">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-4">My Classrooms</p>
          <div className="space-y-2">
            {classrooms.map((c, i) => (
              <Link key={c.id} href={`/student/classroom/${c.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                <div className={`w-2 h-2 rounded-full ${COLORS[i % COLORS.length]}`} />
                <p className="text-sm text-white/70 group-hover:text-white transition-colors line-clamp-1">{c.name}</p>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      {showJoin && (
        <JoinClassroomModal
          token={session?.apiToken ?? ''}
          onClose={() => setShowJoin(false)}
          onJoined={() => {
            api.classrooms.list(session?.apiToken ?? '').then(setClassrooms).catch(() => {})
            setShowJoin(false)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write JoinClassroomModal.tsx**

```typescript
// frontend/edu-web/components/classroom/JoinClassroomModal.tsx
'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { X } from 'lucide-react'

export default function JoinClassroomModal({
  token, onClose, onJoined
}: { token: string; onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    try {
      await api.classrooms.join(token, code.trim().toUpperCase())
      onJoined()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid join code')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1d26] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Join Classroom</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" placeholder="Enter 6-character code" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6}
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm text-center tracking-widest font-mono uppercase focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading || code.length < 6}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            {loading ? 'Joining…' : 'Join Classroom'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build check + commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web && npx tsc --noEmit 2>&1 | head -20
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/edu-web/app/student/ frontend/edu-web/components/classroom/JoinClassroomModal.tsx
git commit -m "feat: student dashboard with calendar session view and join modal"
```

---

### Task 7: Classroom pages (teacher + student) + channel chat

**Files:**
- Create: `frontend/edu-web/app/teacher/classroom/[id]/page.tsx`
- Create: `frontend/edu-web/app/student/classroom/[id]/page.tsx`
- Create: `frontend/edu-web/components/channel/MessageList.tsx`
- Create: `frontend/edu-web/components/channel/MessageInput.tsx`

- [ ] **Step 1: Write shared channel components**

```bash
mkdir -p /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/components/channel
```

```typescript
// frontend/edu-web/components/channel/MessageList.tsx
import type { Message } from '@/types'

export default function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map(m => (
        <div key={m.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
            {m.sender.senderName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-white/80">{m.sender.senderName}</span>
              <span className="text-xs text-white/30">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-sm text-white/70 mt-0.5">{m.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

```typescript
// frontend/edu-web/components/channel/MessageInput.tsx
'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'

export default function MessageInput({ onSend, disabled }: { onSend: (content: string) => Promise<void>; disabled?: boolean }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending || disabled) return
    setSending(true)
    await onSend(text.trim())
    setText('')
    setSending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/10 flex gap-2">
      <input
        type="text" value={text} onChange={e => setText(e.target.value)}
        placeholder={disabled ? 'Only teachers can post here' : 'Message…'}
        disabled={disabled}
        className="flex-1 bg-[#0f1117] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40"
      />
      <button type="submit" disabled={!text.trim() || sending || disabled}
        className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center transition-colors">
        <Send className="w-4 h-4 text-white" />
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Write teacher/classroom/[id]/page.tsx**

```bash
mkdir -p "/Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/app/teacher/classroom/[id]"
```

```typescript
// frontend/edu-web/app/teacher/classroom/[id]/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Channel, Message, Session, Classroom } from '@/types'
import MessageList from '@/components/channel/MessageList'
import MessageInput from '@/components/channel/MessageInput'
import { ArrowLeft, Video, Plus } from 'lucide-react'

export default function TeacherClassroomPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [newSessionTitle, setNewSessionTitle] = useState('')

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken) return
    api.classrooms.get(session.apiToken, params.id).then(c => {
      setClassroom(c)
      setChannels(c.channels ?? [])
      if (c.channels?.length) setActiveChannel(c.channels[0])
    })
    api.sessions.list(session.apiToken, params.id).then(setSessions)
  }, [session, status, params.id])

  useEffect(() => {
    if (!activeChannel || !session?.apiToken) return
    api.channels.getMessages(session.apiToken, activeChannel.id).then(setMessages)
  }, [activeChannel, session])

  const sendMessage = async (content: string) => {
    if (!activeChannel || !session?.apiToken) return
    const msg = await api.channels.sendMessage(session.apiToken, activeChannel.id, content)
    setMessages(p => [...p, msg])
  }

  const createSession = async () => {
    if (!newSessionTitle.trim() || !session?.apiToken) return
    const s = await api.sessions.create(session.apiToken, params.id, newSessionTitle.trim())
    setSessions(p => [...p, s])
    setNewSessionTitle('')
  }

  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      {/* Channel sidebar */}
      <aside className="w-56 bg-[#1a1d26] border-r border-white/10 flex flex-col">
        <div className="px-4 py-4 border-b border-white/10">
          <Link href="/teacher/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h2 className="font-semibold text-sm text-white truncate">{classroom?.name}</h2>
          <p className="text-xs text-white/40 mt-0.5">Code: {classroom?.joinCode}</p>
        </div>
        <div className="px-3 py-3 flex-1 overflow-y-auto">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2 px-2">Channels</p>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeChannel?.id === ch.id ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
              # {ch.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-white/10 px-5 flex items-center">
          <h3 className="font-semibold text-sm"># {activeChannel?.name}</h3>
        </header>
        <MessageList messages={messages} />
        <MessageInput onSend={sendMessage} disabled={activeChannel?.type === 'announcement' ? false : false} />
      </div>

      {/* Sessions panel */}
      <aside className="w-72 border-l border-white/10 flex flex-col">
        <div className="px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Video className="w-4 h-4 text-indigo-400" /> Live Sessions</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-[#1a1d26] rounded-xl p-3">
              <p className="text-sm font-medium text-white">{s.title}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'live' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'ended' ? 'bg-white/10 text-white/30' : 'bg-amber-500/20 text-amber-400'}`}>
                  {s.status}
                </span>
                {s.status !== 'ended' && (
                  <Link href={`/teacher/session/${s.id}`} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-full transition-colors">
                    {s.status === 'live' ? 'Rejoin' : 'Start'}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          <input
            type="text" placeholder="Session title" value={newSessionTitle}
            onChange={e => setNewSessionTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSession()}
            className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button onClick={createSession} disabled={!newSessionTitle.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Create Session
          </button>
        </div>
      </aside>
    </div>
  )
}
```

- [ ] **Step 3: Write student/classroom/[id]/page.tsx**

```bash
mkdir -p "/Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/app/student/classroom/[id]"
```

```typescript
// frontend/edu-web/app/student/classroom/[id]/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Channel, Message, Session, Classroom } from '@/types'
import MessageList from '@/components/channel/MessageList'
import MessageInput from '@/components/channel/MessageInput'
import { ArrowLeft, Video } from 'lucide-react'

export default function StudentClassroomPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

  const fetchSessions = useCallback(async () => {
    if (!session?.apiToken) return
    api.sessions.list(session.apiToken, params.id).then(setSessions).catch(() => {})
  }, [session?.apiToken, params.id])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken) return
    api.classrooms.get(session.apiToken, params.id).then(c => {
      setClassroom(c)
      setChannels(c.channels ?? [])
      if (c.channels?.length) setActiveChannel(c.channels[0])
    })
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [session, status, params.id, fetchSessions])

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

  return (
    <div className="flex h-screen bg-[#0f1117] text-white">
      <aside className="w-56 bg-[#1a1d26] border-r border-white/10 flex flex-col">
        <div className="px-4 py-4 border-b border-white/10">
          <Link href="/student/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h2 className="font-semibold text-sm text-white truncate">{classroom?.name}</h2>
        </div>
        <div className="px-3 py-3 flex-1 overflow-y-auto">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2 px-2">Channels</p>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeChannel?.id === ch.id ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
              # {ch.name}
            </button>
          ))}
        </div>
        {liveSessions.length > 0 && (
          <div className="px-3 py-3 border-t border-white/10">
            <Link href={`/student/session/${liveSessions[0].id}`}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors animate-pulse">
              <Video className="w-4 h-4" /> Join Live Session
            </Link>
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-white/10 px-5 flex items-center">
          <h3 className="font-semibold text-sm"># {activeChannel?.name}</h3>
        </header>
        <MessageList messages={messages} />
        <MessageInput onSend={sendMessage} disabled={activeChannel?.type === 'announcement'} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build check + commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web && npx tsc --noEmit 2>&1 | head -20
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/edu-web/app/teacher/classroom/ frontend/edu-web/app/student/classroom/ frontend/edu-web/components/channel/
git commit -m "feat: classroom pages with channel chat for teacher and student"
```

---

### Task 8: Session room pages (TeacherRoom + StudentRoom)

**Files:**
- Create: `frontend/edu-web/app/teacher/session/[id]/page.tsx`
- Create: `frontend/edu-web/app/student/session/[id]/page.tsx`
- Create: `frontend/edu-web/components/session/TeacherRoom.tsx`
- Create: `frontend/edu-web/components/session/StudentRoom.tsx`
- Create: `frontend/edu-web/components/session/SessionChat.tsx`
- Create: `frontend/edu-web/components/session/Whiteboard.tsx`

- [ ] **Step 1: Install LiveKit styles in layout**

Add to `frontend/edu-web/app/layout.tsx` imports:

```typescript
import '@livekit/components-styles'
```

- [ ] **Step 2: Write Whiteboard.tsx**

```bash
mkdir -p /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/components/session
```

```typescript
// frontend/edu-web/components/session/Whiteboard.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useDataChannel } from '@livekit/components-react'
import { Eraser, Pen } from 'lucide-react'

const STROKE_PREFIX = 'wb_stroke:'
const CLEAR_MSG     = 'wb_clear'

export default function Whiteboard({ canDraw }: { canDraw: boolean }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const drawing    = useRef(false)
  const lastPos    = useRef<{ x: number; y: number } | null>(null)
  const [color, setColor] = useState('#6366f1')

  const { send } = useDataChannel(msg => {
    const text = new TextDecoder().decode(msg.payload)
    if (text === CLEAR_MSG) clearCanvas(false)
    else if (text.startsWith(STROKE_PREFIX)) {
      const pts = JSON.parse(text.slice(STROKE_PREFIX.length)) as { x: number; y: number; color: string }[]
      drawLine(pts[0], pts[1], pts[2].color ?? '#6366f1', false)
    }
  })

  const clearCanvas = (broadcast = true) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !canvasRef.current) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    if (broadcast) send(new TextEncoder().encode(CLEAR_MSG), { reliable: true })
  }

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }, strokeColor: string, broadcast: boolean) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.stroke()
    if (broadcast) {
      const payload = STROKE_PREFIX + JSON.stringify([from, to, { color: strokeColor }])
      send(new TextEncoder().encode(payload), { reliable: true })
    }
  }

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {canDraw && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10">
          {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ffffff'].map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
          <button onClick={() => clearCanvas()} className="ml-auto flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors">
            <Eraser className="w-4 h-4" /> Clear
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef} width={800} height={500}
        className="flex-1 w-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={e => { if (!canDraw) return; drawing.current = true; lastPos.current = getPos(e) }}
        onMouseMove={e => {
          if (!canDraw || !drawing.current || !lastPos.current) return
          const pos = getPos(e)
          drawLine(lastPos.current, pos, color, true)
          lastPos.current = pos
        }}
        onMouseUp={() => { drawing.current = false; lastPos.current = null }}
        onMouseLeave={() => { drawing.current = false }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Write SessionChat.tsx**

```typescript
// frontend/edu-web/components/session/SessionChat.tsx
'use client'
import { useState } from 'react'
import { useChat } from '@livekit/components-react'
import { Send } from 'lucide-react'

export default function SessionChat() {
  const { chatMessages, send } = useChat()
  const [text, setText] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    send(text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1d26] border-l border-white/10">
      <div className="px-4 py-3 border-b border-white/10">
        <h4 className="text-sm font-semibold text-white">Session Chat</h4>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {chatMessages.map((m, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {(m.from?.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-white/70">{m.from?.name}</p>
              <p className="text-xs text-white/60 mt-0.5">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="px-3 py-3 border-t border-white/10 flex gap-2">
        <input
          type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Chat…"
          className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button type="submit" disabled={!text.trim()}
          className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center transition-colors">
          <Send className="w-3 h-3 text-white" />
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Write TeacherRoom.tsx**

```typescript
// frontend/edu-web/components/session/TeacherRoom.tsx
'use client'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import Whiteboard from './Whiteboard'
import SessionChat from './SessionChat'
import { useState } from 'react'
import { Monitor, PenLine, MessageSquare, PhoneOff } from 'lucide-react'

type Panel = 'video' | 'whiteboard' | 'chat'

export default function TeacherRoom({ token, serverUrl, participantName, onEndSession, onDisconnected }: {
  token: string; serverUrl: string; participantName: string
  onEndSession: () => void; onDisconnected: () => void
}) {
  const [panel, setPanel] = useState<Panel>('video')

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect data-lk-theme="default"
      onDisconnected={onDisconnected} style={{ height: '100vh' }}>
      <div className="flex h-screen bg-[#0f1117]">
        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1d26] border-b border-white/10">
            {([['video', <Monitor className="w-4 h-4" />, 'Video'], ['whiteboard', <PenLine className="w-4 h-4" />, 'Whiteboard'], ['chat', <MessageSquare className="w-4 h-4" />, 'Chat']] as [Panel, React.ReactNode, string][]).map(([p, icon, label]) => (
              <button key={p} onClick={() => setPanel(p)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${panel === p ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                {icon} {label}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-xs text-white/40">{participantName}</span>
            <button onClick={onEndSession}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
              <PhoneOff className="w-4 h-4" /> End Session
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {panel === 'video'      && <VideoConference />}
            {panel === 'whiteboard' && <Whiteboard canDraw={true} />}
            {panel === 'chat'       && <div className="h-full"><SessionChat /></div>}
          </div>
        </div>
      </div>
    </LiveKitRoom>
  )
}
```

- [ ] **Step 5: Write StudentRoom.tsx**

```typescript
// frontend/edu-web/components/session/StudentRoom.tsx
'use client'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import Whiteboard from './Whiteboard'
import SessionChat from './SessionChat'
import { useState } from 'react'
import { Monitor, PenLine, MessageSquare, PhoneOff } from 'lucide-react'

type Panel = 'video' | 'whiteboard' | 'chat'

export default function StudentRoom({ token, serverUrl, participantName, onDisconnected }: {
  token: string; serverUrl: string; participantName: string; onDisconnected: () => void
}) {
  const [panel, setPanel] = useState<Panel>('video')

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect data-lk-theme="default"
      onDisconnected={onDisconnected} style={{ height: '100vh' }}>
      <div className="flex h-screen bg-[#0f1117]">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1d26] border-b border-white/10">
            {([['video', <Monitor className="w-4 h-4" />, 'Video'], ['whiteboard', <PenLine className="w-4 h-4" />, 'Whiteboard'], ['chat', <MessageSquare className="w-4 h-4" />, 'Chat']] as [Panel, React.ReactNode, string][]).map(([p, icon, label]) => (
              <button key={p} onClick={() => setPanel(p)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${panel === p ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                {icon} {label}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-xs text-white/40">{participantName}</span>
            <button onClick={onDisconnected}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
              <PhoneOff className="w-4 h-4" /> Leave
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {panel === 'video'      && <VideoConference />}
            {panel === 'whiteboard' && <Whiteboard canDraw={false} />}
            {panel === 'chat'       && <div className="h-full"><SessionChat /></div>}
          </div>
        </div>
      </div>
    </LiveKitRoom>
  )
}
```

- [ ] **Step 6: Write teacher/session/[id]/page.tsx**

```bash
mkdir -p "/Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/app/teacher/session/[id]"
```

```typescript
// frontend/edu-web/app/teacher/session/[id]/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import TeacherRoom from '@/components/session/TeacherRoom'

export default function TeacherSessionPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [error, setError] = useState('')
  const [classroomId, setClassroomId] = useState('')

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken) return
    api.sessions.start(session.apiToken, params.id)
      .then(r => { setToken(r.token); setServerUrl(r.liveKitUrl) })
      .catch(e => setError(e.message))
  }, [session, status, params.id])

  const handleEnd = async () => {
    if (!session?.apiToken) return
    await api.sessions.end(session.apiToken, params.id)
    router.back()
  }

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.back()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm">Go Back</button>
      </div>
    </div>
  )

  if (!token) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117]">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <TeacherRoom token={token} serverUrl={serverUrl}
      participantName={session?.user?.name ?? 'Teacher'}
      onEndSession={handleEnd}
      onDisconnected={() => router.back()} />
  )
}
```

- [ ] **Step 7: Write student/session/[id]/page.tsx**

```bash
mkdir -p "/Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web/app/student/session/[id]"
```

```typescript
// frontend/edu-web/app/student/session/[id]/page.tsx
'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import StudentRoom from '@/components/session/StudentRoom'

export default function StudentSessionPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken) return
    api.sessions.join(session.apiToken, params.id)
      .then(r => { setToken(r.token); setServerUrl(r.liveKitUrl) })
      .catch(e => setError(e.message))
  }, [session, status, params.id])

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.back()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm">Go Back</button>
      </div>
    </div>
  )

  if (!token) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117]">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <StudentRoom token={token} serverUrl={serverUrl}
      participantName={session?.user?.name ?? 'Student'}
      onDisconnected={() => router.back()} />
  )
}
```

- [ ] **Step 8: Final type check**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/frontend/edu-web
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add frontend/edu-web/app/teacher/session/ frontend/edu-web/app/student/session/ frontend/edu-web/components/session/
git commit -m "feat: session room pages with LiveKit, whiteboard, and chat"
```

---

## Final Verification

- [ ] Start .NET backend: `cd backend/EduPlatform.Api && ASPNETCORE_ENVIRONMENT=Development dotnet run`
- [ ] Start frontend: `cd frontend/edu-web && npm run dev -- -p 3001`
- [ ] Open `http://localhost:3001` — AuthComponent renders
- [ ] Register as teacher → lands on `/teacher/dashboard`
- [ ] Create classroom → join code appears
- [ ] Open incognito → register as student → join with code → `/student/dashboard` shows classroom
- [ ] Teacher creates session → student's dashboard shows "Waiting to start"
- [ ] Teacher clicks Start → student sees JOIN LIVE button (polls every 5s)
- [ ] Both join → LiveKit room with video + whiteboard + chat
