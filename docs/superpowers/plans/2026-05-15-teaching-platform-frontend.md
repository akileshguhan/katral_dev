# Teaching Platform — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Next.js 14 app into a full teaching platform with Google OAuth, role-based routing, classroom management, real-time messaging, document sharing, and LiveKit live sessions.

**Architecture:** App Router with server components for data-fetching layouts and client components for interactive UI. NextAuth.js v4 handles Google OAuth; the backend JWT is stored in NextAuth session and injected into every API call via a shared `api.ts` client. The existing `/room` demo page is replaced. All LiveKit token minting moves to the backend.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, NextAuth.js v4, @livekit/components-react, livekit-client, @supabase/supabase-js

**Prerequisites:** Backend plan (`2026-05-15-teaching-platform-backend.md`) complete and running on `http://localhost:5000`.

---

## File Map

```
(existing files modified)
app/layout.tsx                     ← add Tailwind, SessionProvider
app/globals.css                    ← replace with Tailwind directives
app/page.tsx                       ← replace: Google OAuth landing page
app/api/get-token/route.ts         ← DELETE (tokens come from backend now)
app/room/page.tsx                  ← DELETE (replaced by session page)
package.json                       ← add new deps

(new files)
app/auth/role/page.tsx             ← one-time role picker
app/dashboard/page.tsx             ← teacher/student home
app/classroom/[id]/page.tsx        ← classroom home (redirect to first channel)
app/classroom/[id]/channel/[channelId]/page.tsx   ← channel view
app/classroom/[id]/session/[sessionId]/page.tsx   ← live session
app/api/auth/[...nextauth]/route.ts               ← NextAuth handler

middleware.ts                      ← protect routes

components/
  providers/SessionProvider.tsx    ← NextAuth provider wrapper
  layout/ClassroomLayout.tsx       ← sidebar + main layout shell
  sidebar/ChannelList.tsx
  sidebar/MemberList.tsx
  dashboard/ClassroomCard.tsx
  dashboard/CreateClassroomModal.tsx
  dashboard/JoinClassroomModal.tsx
  channel/MessageList.tsx
  channel/MessageInput.tsx
  channel/DocumentCard.tsx
  channel/DocumentUpload.tsx
  session/TeacherRoom.tsx
  session/StudentRoom.tsx
  session/Whiteboard.tsx
  session/SessionChat.tsx

lib/
  api.ts                           ← typed fetch wrapper using backend JWT
  supabase.ts                      ← Supabase storage client

types/index.ts                     ← shared TypeScript types

tailwind.config.ts
postcss.config.js
```

---

### Task 11: New Dependencies & Tailwind Setup

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Modify: `app/globals.css`

- [ ] **Step 1: Install new packages**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
npm install next-auth @auth/core @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p --ts
```

- [ ] **Step 2: Configure tailwind.config.ts**

Replace generated file content:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#1e2130',
        'sidebar-hover': '#2a2f45',
        surface: '#ffffff',
        'surface-dark': '#f3f4f6',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Replace app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body { height: 100%; }
```

- [ ] **Step 4: Verify Tailwind works**

```bash
npm run build 2>&1 | tail -5
```
Expected: no CSS errors (may have TS errors for missing files — those are fixed in subsequent tasks).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tailwind.config.ts postcss.config.js app/globals.css
git commit -m "chore: add Tailwind CSS and new npm dependencies"
```

---

### Task 12: Types & Shared Utilities

**Files:**
- Create: `types/index.ts`
- Create: `lib/api.ts`
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create types/index.ts**

```typescript
export interface User {
  userId: string
  email: string
  name: string
  role: 'teacher' | 'student' | null
  studentId: string | null
  avatarUrl: string | null
  needsRoleSelection: boolean
  token: string
}

export interface Classroom {
  id: string
  name: string
  description: string | null
  inviteCode: string
  teacher: Member
  createdAt: string
}

export interface Member {
  userId: string
  name: string
  email: string
  studentId: string | null
  avatarUrl: string | null
  role: string
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
  sender: Member
}

export interface Document {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  createdAt: string
  uploadedBy: Member
}

export interface Session {
  id: string
  title: string
  status: 'waiting' | 'live' | 'ended'
  roomId: string | null
  createdAt: string
}

export interface ClassroomDetail extends Classroom {
  channels: Channel[]
  members: Member[]
}
```

- [ ] **Step 2: Create lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `API error ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  auth: {
    google: (idToken: string) =>
      fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }).then(r => r.json()),

    setRole: (token: string, role: string) =>
      apiFetch('/auth/role', token, {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),

    me: (token: string) => apiFetch('/auth/me', token),
  },

  classrooms: {
    list: (token: string) =>
      apiFetch<import('@/types').Classroom[]>('/classrooms', token),

    create: (token: string, data: { name: string; description?: string }) =>
      apiFetch<import('@/types').Classroom>('/classrooms', token, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (token: string, id: string) =>
      apiFetch<import('@/types').ClassroomDetail>(`/classrooms/${id}`, token),

    join: (token: string, inviteCode: string) =>
      apiFetch<{ classroomId: string }>('/classrooms/join', token, {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      }),

    addMember: (token: string, classroomId: string, studentId: string) =>
      apiFetch(`/classrooms/${classroomId}/members`, token, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      }),

    removeMember: (token: string, classroomId: string, userId: string) =>
      apiFetch(`/classrooms/${classroomId}/members/${userId}`, token, {
        method: 'DELETE',
      }),
  },

  channels: {
    list: (token: string, classroomId: string) =>
      apiFetch<import('@/types').Channel[]>(
        `/classrooms/${classroomId}/channels`, token),

    create: (token: string, classroomId: string, data: { name: string; type: string }) =>
      apiFetch<import('@/types').Channel>(
        `/classrooms/${classroomId}/channels`, token, {
          method: 'POST',
          body: JSON.stringify(data),
        }),

    getMessages: (token: string, channelId: string, page = 1) =>
      apiFetch<import('@/types').Message[]>(
        `/channels/${channelId}/messages?page=${page}`, token),

    sendMessage: (token: string, channelId: string, content: string) =>
      apiFetch<import('@/types').Message>(`/channels/${channelId}/messages`, token, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),

    getDocuments: (token: string, channelId: string) =>
      apiFetch<import('@/types').Document[]>(`/channels/${channelId}/documents`, token),

    saveDocument: (
      token: string,
      channelId: string,
      data: { fileName: string; fileUrl: string; fileSize: number }
    ) =>
      apiFetch<import('@/types').Document>(`/channels/${channelId}/documents`, token, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  sessions: {
    list: (token: string, classroomId: string) =>
      apiFetch<import('@/types').Session[]>(
        `/classrooms/${classroomId}/sessions`, token),

    create: (token: string, classroomId: string, title: string) =>
      apiFetch<import('@/types').Session>(
        `/classrooms/${classroomId}/sessions`, token, {
          method: 'POST',
          body: JSON.stringify({ title }),
        }),

    start: (token: string, sessionId: string) =>
      apiFetch<{ token: string; roomId: string; liveKitUrl: string }>(
        `/sessions/${sessionId}/start`, token, { method: 'POST' }),

    join: (token: string, sessionId: string) =>
      apiFetch<{ token: string; roomId: string; liveKitUrl: string }>(
        `/sessions/${sessionId}/join`, token, { method: 'POST' }),

    end: (token: string, sessionId: string) =>
      apiFetch(`/sessions/${sessionId}/end`, token, { method: 'POST' }),
  },
}
```

- [ ] **Step 3: Create lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadFile(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
```

- [ ] **Step 4: Commit**

```bash
git add types/ lib/
git commit -m "feat: add shared types, API client, and Supabase client"
```

---

### Task 13: NextAuth Setup

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `components/providers/SessionProvider.tsx`
- Modify: `app/layout.tsx`
- Create: `middleware.ts`

NextAuth is configured to handle Google OAuth. After Google login, the frontend calls the backend with the Google ID token to get our own JWT, which we store in the NextAuth session.

- [ ] **Step 1: Add NextAuth env vars to .env.local**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

Add to `.env.local`:
```
NEXTAUTH_SECRET=<output of above command>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Note: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL` remain (kept for fallback) but the token generation moves to backend.

- [ ] **Step 2: Create app/api/auth/[...nextauth]/route.ts**

```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Just confirm Google sign-in succeeded
      return !!account?.id_token
    },

    async jwt({ token, account }) {
      if (account?.id_token) {
        // First sign-in: exchange Google ID token for our backend JWT
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/google`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: account.id_token }),
            }
          )
          const data = await res.json()
          token.backendToken = data.token
          token.userId = data.userId
          token.role = data.role
          token.studentId = data.studentId
          token.needsRoleSelection = data.needsRoleSelection
        } catch {
          // backend unavailable during build/test
        }
      }
      return token
    },

    async session({ session, token }) {
      session.backendToken = token.backendToken as string
      session.userId = token.userId as string
      session.role = token.role as string | null
      session.studentId = token.studentId as string | null
      session.needsRoleSelection = token.needsRoleSelection as boolean
      return session
    },
  },
  pages: {
    signIn: '/',
  },
})

export { handler as GET, handler as POST }
```

- [ ] **Step 3: Extend NextAuth types — create types/next-auth.d.ts**

```typescript
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    backendToken: string
    userId: string
    role: string | null
    studentId: string | null
    needsRoleSelection: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendToken?: string
    userId?: string
    role?: string | null
    studentId?: string | null
    needsRoleSelection?: boolean
  }
}
```

- [ ] **Step 4: Create components/providers/SessionProvider.tsx**

```typescript
'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

- [ ] **Step 5: Update app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import '@livekit/components-styles'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'Teaching Platform',
  description: 'Live classroom powered by LiveKit',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-full bg-gray-50">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Create middleware.ts**

```typescript
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/classroom/:path*', '/auth/role'],
}
```

- [ ] **Step 7: Commit**

```bash
git add app/api/auth/ components/providers/ app/layout.tsx middleware.ts types/next-auth.d.ts
git commit -m "feat: add NextAuth with Google OAuth and backend JWT exchange"
```

---

### Task 14: Landing Page & Auth Flow Pages

**Files:**
- Modify: `app/page.tsx`
- Create: `app/auth/role/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```typescript
'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) return
    if (session.needsRoleSelection) {
      router.replace('/auth/role')
    } else {
      router.replace('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-900">
        <p className="text-gray-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-sm shadow-2xl text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Teaching Platform</h1>
          <p className="text-gray-400 mt-2">Live classrooms, built for teachers and students.</p>
        </div>
        <button
          onClick={() => signIn('google')}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-100 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create app/auth/role/page.tsx**

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function RolePickerPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = async (role: 'teacher' | 'student') => {
    if (!session?.backendToken) return
    setLoading(true)
    setError('')
    try {
      await api.auth.setRole(session.backendToken, role)
      // Force NextAuth to re-fetch session from backend
      await update()
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 rounded-2xl p-10 w-full max-w-md shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Welcome! Pick your role</h1>
          <p className="text-gray-400 mt-1 text-sm">This cannot be changed later.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSelect('teacher')}
            disabled={loading}
            className="flex flex-col items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 transition disabled:opacity-50"
          >
            <span className="text-4xl">👩‍🏫</span>
            <span className="font-semibold">Teacher</span>
            <span className="text-xs text-blue-200">Create classrooms, run sessions</span>
          </button>

          <button
            onClick={() => handleSelect('student')}
            disabled={loading}
            className="flex flex-col items-center gap-3 bg-green-600 hover:bg-green-700 text-white rounded-xl p-6 transition disabled:opacity-50"
          >
            <span className="text-4xl">🎓</span>
            <span className="font-semibold">Student</span>
            <span className="text-xs text-green-200">Join classrooms, attend sessions</span>
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/auth/
git commit -m "feat: landing page with Google sign-in and one-time role picker"
```

---

### Task 15: Dashboard Page & Components

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `components/dashboard/ClassroomCard.tsx`
- Create: `components/dashboard/CreateClassroomModal.tsx`
- Create: `components/dashboard/JoinClassroomModal.tsx`

- [ ] **Step 1: Create components/dashboard/ClassroomCard.tsx**

```typescript
import Link from 'next/link'
import type { Classroom } from '@/types'

export default function ClassroomCard({ classroom }: { classroom: Classroom }) {
  return (
    <Link
      href={`/classroom/${classroom.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
          {classroom.description && (
            <p className="text-sm text-gray-500 mt-1">{classroom.description}</p>
          )}
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
          {classroom.inviteCode}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Teacher: {classroom.teacher.name}
      </p>
    </Link>
  )
}
```

- [ ] **Step 2: Create components/dashboard/CreateClassroomModal.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api'
import type { Classroom } from '@/types'

export default function CreateClassroomModal({
  onCreated,
  onClose,
}: {
  onCreated: (c: Classroom) => void
  onClose: () => void
}) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.backendToken || !name.trim()) return
    setLoading(true)
    setError('')
    try {
      const classroom = await api.classrooms.create(session.backendToken, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      onCreated(classroom)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create classroom')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Create Classroom</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classroom Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Introduction to Physics"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create components/dashboard/JoinClassroomModal.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function JoinClassroomModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.backendToken || !code.trim()) return
    setLoading(true)
    setError('')
    try {
      const { classroomId } = await api.classrooms.join(
        session.backendToken,
        code.trim().toUpperCase()
      )
      router.push(`/classroom/${classroomId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid invite code')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Join Classroom</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite Code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ABC123"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={code.length < 6 || loading}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Joining…' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create app/dashboard/page.tsx**

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Classroom } from '@/types'
import ClassroomCard from '@/components/dashboard/ClassroomCard'
import CreateClassroomModal from '@/components/dashboard/CreateClassroomModal'
import JoinClassroomModal from '@/components/dashboard/JoinClassroomModal'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.replace('/'); return }
    if (session.needsRoleSelection) { router.replace('/auth/role'); return }

    api.classrooms.list(session.backendToken)
      .then(setClassrooms)
      .finally(() => setLoading(false))
  }, [session, status, router])

  const isTeacher = session?.role === 'teacher'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Teaching Platform</h1>
          {session && (
            <p className="text-sm text-gray-500">
              {session.role === 'teacher' ? '👩‍🏫 Teacher' : `🎓 Student • ${session.studentId}`}
              {' '}&middot; {session.user?.name}
            </p>
          )}
        </div>
        {isTeacher ? (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Create Classroom
          </button>
        ) : (
          <button
            onClick={() => setShowJoin(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            + Join Classroom
          </button>
        )}
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {isTeacher ? 'My Classrooms' : 'Joined Classrooms'}
        </h2>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : classrooms.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400 text-sm">
              {isTeacher
                ? 'No classrooms yet. Create one to get started.'
                : 'Not enrolled in any classrooms yet. Use an invite code to join.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classrooms.map(c => (
              <ClassroomCard key={c.id} classroom={c} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateClassroomModal
          onCreated={c => {
            setClassrooms(prev => [...prev, c])
            setShowCreate(false)
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
      {showJoin && <JoinClassroomModal onClose={() => setShowJoin(false)} />}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/ components/dashboard/
git commit -m "feat: dashboard with teacher/student views and classroom modals"
```

---

### Task 16: Classroom Layout & Sidebar

**Files:**
- Create: `app/classroom/[id]/page.tsx`
- Create: `components/layout/ClassroomLayout.tsx`
- Create: `components/sidebar/ChannelList.tsx`
- Create: `components/sidebar/MemberList.tsx`

- [ ] **Step 1: Create components/sidebar/ChannelList.tsx**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Channel } from '@/types'

const channelIcons: Record<string, string> = {
  general: '#',
  announcement: '📢',
  resource: '📁',
}

export default function ChannelList({
  classroomId,
  channels,
  isTeacher,
  onCreateChannel,
}: {
  classroomId: string
  channels: Channel[]
  isTeacher: boolean
  onCreateChannel?: () => void
}) {
  const pathname = usePathname()

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Channels
        </span>
        {isTeacher && (
          <button
            onClick={onCreateChannel}
            className="text-gray-400 hover:text-white text-lg leading-none"
            title="Add channel"
          >
            +
          </button>
        )}
      </div>
      <ul className="space-y-0.5 px-2">
        {channels.map(ch => {
          const href = `/classroom/${classroomId}/channel/${ch.id}`
          const active = pathname === href
          return (
            <li key={ch.id}>
              <Link
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <span className="w-4 text-center text-xs">
                  {channelIcons[ch.type] ?? '#'}
                </span>
                {ch.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Create components/sidebar/MemberList.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api'
import type { Member } from '@/types'

export default function MemberList({
  classroomId,
  members,
  isTeacher,
  onMemberRemoved,
}: {
  classroomId: string
  members: Member[]
  isTeacher: boolean
  onMemberRemoved?: (userId: string) => void
}) {
  const { data: session } = useSession()
  const [addingId, setAddingId] = useState('')
  const [addError, setAddError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.backendToken || !addingId.trim()) return
    setLoading(true)
    setAddError('')
    try {
      await api.classrooms.addMember(session.backendToken, classroomId, addingId.trim())
      setAddingId('')
      window.location.reload()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Student not found')
      setLoading(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!session?.backendToken) return
    try {
      await api.classrooms.removeMember(session.backendToken, classroomId, userId)
      onMemberRemoved?.(userId)
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="mt-4">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">
        Members ({members.length})
      </span>

      {isTeacher && (
        <form onSubmit={handleAdd} className="px-3 mt-2">
          <input
            type="text"
            value={addingId}
            onChange={e => setAddingId(e.target.value.toUpperCase())}
            placeholder="STU-XXXXX"
            className="w-full bg-gray-700 text-white text-xs px-2 py-1.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {addError && <p className="text-red-400 text-xs mt-1">{addError}</p>}
          <button
            type="submit"
            disabled={!addingId || loading}
            className="mt-1 w-full bg-blue-700 hover:bg-blue-600 text-white text-xs py-1 rounded disabled:opacity-40"
          >
            Add Student
          </button>
        </form>
      )}

      <ul className="mt-2 space-y-0.5 px-2">
        {members.map(m => (
          <li
            key={m.userId}
            className="flex items-center gap-2 px-3 py-2 rounded-lg group"
          >
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{m.name}</p>
              {m.studentId && (
                <p className="text-xs text-gray-500 font-mono">{m.studentId}</p>
              )}
            </div>
            {isTeacher && (
              <button
                onClick={() => handleRemove(m.userId)}
                className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition"
                title="Remove"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Create components/layout/ClassroomLayout.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { ClassroomDetail, Channel } from '@/types'
import ChannelList from '@/components/sidebar/ChannelList'
import MemberList from '@/components/sidebar/MemberList'

export default function ClassroomLayout({
  classroomId,
  children,
}: {
  classroomId: string
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null)
  const [members, setMembers] = useState(classroom?.members ?? [])

  useEffect(() => {
    if (!session?.backendToken) return
    api.classrooms.get(session.backendToken, classroomId).then(c => {
      setClassroom(c)
      setMembers(c.members)
    })
  }, [session, classroomId])

  const isTeacher = session?.role === 'teacher' &&
    session?.userId === classroom?.teacher.userId

  const addChannel = async () => {
    const name = prompt('Channel name:')
    if (!name || !session?.backendToken) return
    const type = prompt('Type (general/announcement/resource):', 'general') ?? 'general'
    const ch = await api.channels.create(session.backendToken, classroomId, { name, type })
    setClassroom(prev => prev ? { ...prev, channels: [...prev.channels, ch] } : prev)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar flex flex-col shrink-0">
        {/* Classroom name */}
        <div className="px-4 py-4 border-b border-gray-700">
          <Link href="/dashboard" className="text-gray-400 text-xs hover:text-white">
            ← Dashboard
          </Link>
          <h2 className="text-white font-bold mt-1 truncate">
            {classroom?.name ?? '…'}
          </h2>
          {isTeacher && classroom && (
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              Code: {classroom.inviteCode}
            </p>
          )}
        </div>

        {/* Sessions shortcut */}
        {classroom && (
          <div className="px-4 py-2 border-b border-gray-700">
            <Link
              href={`/classroom/${classroomId}/sessions`}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              🎥 Sessions
            </Link>
          </div>
        )}

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-2">
          {classroom && (
            <ChannelList
              classroomId={classroomId}
              channels={classroom.channels}
              isTeacher={isTeacher}
              onCreateChannel={addChannel}
            />
          )}
        </div>

        {/* Members */}
        <div className="border-t border-gray-700 py-2 overflow-y-auto max-h-64">
          {classroom && (
            <MemberList
              classroomId={classroomId}
              members={members}
              isTeacher={isTeacher}
              onMemberRemoved={uid =>
                setMembers(prev => prev.filter(m => m.userId !== uid))
              }
            />
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create app/classroom/[id]/page.tsx**

```typescript
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

export default async function ClassroomHome({
  params,
}: {
  params: { id: string }
}) {
  // Redirect to first channel — client layout handles this
  // For now just show the layout shell
  redirect(`/classroom/${params.id}/channel/default`)
}
```

Note: `default` will 404 gracefully; real channel IDs come from the sidebar. This can be improved later with a proper redirect after loading channels client-side.

- [ ] **Step 5: Commit**

```bash
git add app/classroom/ components/layout/ components/sidebar/
git commit -m "feat: classroom layout with sidebar, channels, and member list"
```

---

### Task 17: Channel View (Messages + Documents)

**Files:**
- Create: `app/classroom/[id]/channel/[channelId]/page.tsx`
- Create: `components/channel/MessageList.tsx`
- Create: `components/channel/MessageInput.tsx`
- Create: `components/channel/DocumentCard.tsx`
- Create: `components/channel/DocumentUpload.tsx`

- [ ] **Step 1: Create components/channel/MessageList.tsx**

```typescript
import type { Message } from '@/types'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(msg => (
        <div key={msg.id} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {msg.sender.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm text-gray-900">
                {msg.sender.name}
              </span>
              {msg.sender.studentId && (
                <span className="text-xs text-gray-400 font-mono">
                  {msg.sender.studentId}
                </span>
              )}
              <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-800 mt-0.5">{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create components/channel/MessageInput.tsx**

```typescript
'use client'

import { useState } from 'react'

export default function MessageInput({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (content: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || sending) return
    setSending(true)
    try {
      await onSend(content.trim())
      setContent('')
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 p-4 flex gap-3 bg-white"
    >
      <input
        type="text"
        value={content}
        onChange={e => setContent(e.target.value)}
        disabled={disabled || sending}
        placeholder={placeholder ?? 'Type a message…'}
        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
      <button
        type="submit"
        disabled={!content.trim() || sending || disabled}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
      >
        Send
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create components/channel/DocumentCard.tsx**

```typescript
import type { Document } from '@/types'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileIcon: Record<string, string> = {
  pdf: '📄', pptx: '📊', ppt: '📊', docx: '📝', doc: '📝',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
}

function getIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return fileIcon[ext] ?? '📎'
}

export default function DocumentCard({ doc }: { doc: Document }) {
  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4">
      <span className="text-3xl">{getIcon(doc.fileName)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{doc.fileName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatSize(doc.fileSize)} &middot; {doc.uploadedBy.name} &middot;{' '}
          {new Date(doc.createdAt).toLocaleDateString()}
        </p>
      </div>
      <a
        href={doc.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={doc.fileName}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition"
      >
        Download
      </a>
    </div>
  )
}
```

- [ ] **Step 4: Create components/channel/DocumentUpload.tsx**

```typescript
'use client'

import { useRef, useState } from 'react'
import { uploadFile } from '@/lib/supabase'

export default function DocumentUpload({
  onUploaded,
}: {
  onUploaded: (data: { fileName: string; fileUrl: string; fileSize: number }) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const path = `documents/${Date.now()}-${file.name}`
      const fileUrl = await uploadFile(file, 'classroom-files', path)
      await onUploaded({ fileName: file.name, fileUrl, fileSize: file.size })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.pptx,.ppt,.docx,.doc,.jpg,.jpeg,.png,.gif"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg transition disabled:opacity-50"
      >
        {uploading ? '⏳ Uploading…' : '📎 Upload File'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Create app/classroom/[id]/channel/[channelId]/page.tsx**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api'
import type { Channel, Message, Document } from '@/types'
import ClassroomLayout from '@/components/layout/ClassroomLayout'
import MessageList from '@/components/channel/MessageList'
import MessageInput from '@/components/channel/MessageInput'
import DocumentCard from '@/components/channel/DocumentCard'
import DocumentUpload from '@/components/channel/DocumentUpload'

export default function ChannelPage({
  params,
}: {
  params: { id: string; channelId: string }
}) {
  const { data: session } = useSession()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const isTeacher = session?.role === 'teacher'

  useEffect(() => {
    if (!session?.backendToken) return

    const loadData = async () => {
      const [msgs, docs, channels] = await Promise.all([
        api.channels.getMessages(session.backendToken, params.channelId),
        api.channels.getDocuments(session.backendToken, params.channelId),
        api.classrooms.get(session.backendToken, params.id)
          .then(c => c.channels)
          .catch(() => [] as Channel[]),
      ])
      setMessages(msgs)
      setDocuments(docs)
      const ch = channels.find(c => c.id === params.channelId)
      if (ch) setChannel(ch)
    }

    loadData()

    // Poll messages every 3 seconds
    const interval = setInterval(() => {
      if (!session?.backendToken) return
      api.channels.getMessages(session.backendToken, params.channelId)
        .then(setMessages)
    }, 3000)

    return () => clearInterval(interval)
  }, [session, params.channelId, params.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!session?.backendToken) return
    const msg = await api.channels.sendMessage(
      session.backendToken, params.channelId, content)
    setMessages(prev => [...prev, msg])
  }

  const saveDocument = async (data: {
    fileName: string; fileUrl: string; fileSize: number
  }) => {
    if (!session?.backendToken) return
    const doc = await api.channels.saveDocument(
      session.backendToken, params.channelId, data)
    setDocuments(prev => [doc, ...prev])
  }

  const isAnnouncement = channel?.type === 'announcement'
  const isResource = channel?.type === 'resource'
  const canPost = !isAnnouncement || isTeacher
  const canUpload = isTeacher || (!isResource)

  return (
    <ClassroomLayout classroomId={params.id}>
      <div className="flex flex-col h-full">
        {/* Channel header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">
              {channel?.type === 'general' && '#'}{' '}
              {channel?.name ?? 'Channel'}
            </h2>
            {isAnnouncement && (
              <p className="text-xs text-gray-400">Only teachers can post here</p>
            )}
          </div>
          {canUpload && (
            <DocumentUpload onUploaded={saveDocument} />
          )}
        </div>

        {/* Documents */}
        {documents.length > 0 && (
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Files</p>
            {documents.map(d => <DocumentCard key={d.id} doc={d} />)}
          </div>
        )}

        {/* Messages */}
        <MessageList messages={messages} />
        <div ref={bottomRef} />

        {/* Input */}
        <MessageInput
          onSend={sendMessage}
          disabled={!canPost}
          placeholder={isAnnouncement && !isTeacher
            ? 'Only teachers can post in announcements'
            : `Message #${channel?.name ?? ''}`}
        />
      </div>
    </ClassroomLayout>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/classroom/ components/channel/
git commit -m "feat: channel view with real-time messages (polling) and document upload"
```

---

### Task 18: Live Session Page

**Files:**
- Create: `app/classroom/[id]/sessions/page.tsx`
- Create: `app/classroom/[id]/session/[sessionId]/page.tsx`
- Create: `components/session/TeacherRoom.tsx`
- Create: `components/session/StudentRoom.tsx`
- Create: `components/session/Whiteboard.tsx`
- Create: `components/session/SessionChat.tsx`

- [ ] **Step 1: Create app/classroom/[id]/sessions/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Session } from '@/types'
import ClassroomLayout from '@/components/layout/ClassroomLayout'

export default function SessionsPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const isTeacher = session?.role === 'teacher'

  useEffect(() => {
    if (!session?.backendToken) return
    api.sessions.list(session.backendToken, params.id)
      .then(setSessions)
      .finally(() => setLoading(false))
  }, [session, params.id])

  const createSession = async () => {
    const title = prompt('Session title:')
    if (!title || !session?.backendToken) return
    const s = await api.sessions.create(session.backendToken, params.id, title)
    setSessions(prev => [s, ...prev])
  }

  return (
    <ClassroomLayout classroomId={params.id}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Sessions</h2>
          {isTeacher && (
            <button
              onClick={createSession}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + New Session
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{s.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString()} &middot;{' '}
                    <span className={
                      s.status === 'live' ? 'text-red-500 font-semibold' :
                      s.status === 'ended' ? 'text-gray-400' : 'text-yellow-600'
                    }>
                      {s.status === 'live' ? '🔴 LIVE' :
                       s.status === 'ended' ? 'Ended' : 'Waiting'}
                    </span>
                  </p>
                </div>
                <Link
                  href={`/classroom/${params.id}/session/${s.id}`}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {s.status === 'live' ? 'Join' : isTeacher ? 'Start' : 'View'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClassroomLayout>
  )
}
```

- [ ] **Step 2: Create components/session/SessionChat.tsx**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Room, DataPacket_Kind } from 'livekit-client'

interface ChatMessage {
  sender: string
  content: string
  timestamp: number
}

export default function SessionChat({
  room,
  participantName,
}: {
  room: Room
  participantName: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (payload: Uint8Array) => {
      try {
        const msg: ChatMessage = JSON.parse(new TextDecoder().decode(payload))
        setMessages(prev => [...prev, msg])
      } catch {
        // ignore malformed
      }
    }

    room.on('dataReceived', handler)
    return () => { room.off('dataReceived', handler) }
  }, [room])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    const msg: ChatMessage = {
      sender: participantName,
      content: input.trim(),
      timestamp: Date.now(),
    }
    const encoded = new TextEncoder().encode(JSON.stringify(msg))
    await room.localParticipant.publishData(encoded, { reliable: true })
    setMessages(prev => [...prev, msg])
    setInput('')
  }

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-700">
        Chat
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i}>
            <span className="font-semibold text-xs text-gray-700">{m.sender}: </span>
            <span className="text-xs text-gray-600">{m.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage} className="border-t border-gray-200 p-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message…"
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-blue-600 text-white text-xs px-3 rounded hover:bg-blue-700 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create components/session/Whiteboard.tsx**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'

type Tool = 'pen' | 'eraser'

export default function Whiteboard({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(4)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const draw = (e: React.MouseEvent) => {
    if (!drawing.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.lineWidth = tool === 'eraser' ? size * 5 : size
    ctx.lineCap = 'round'
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.beginPath()
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPos.current = pos
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden"
           style={{ width: 800, height: 560 }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 border-b border-gray-200">
          <button
            onClick={() => setTool('pen')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              tool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            🧹 Eraser
          </button>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0"
            title="Color"
          />
          <input
            type="range" min="1" max="20" value={size}
            onChange={e => setSize(Number(e.target.value))}
            className="w-24"
          />
          <button
            onClick={clear}
            className="px-3 py-1 rounded text-sm bg-red-100 text-red-600 hover:bg-red-200"
          >
            Clear
          </button>
          <div className="ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded text-sm bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              Close ✕
            </button>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={508}
          className="cursor-crosshair block"
          onMouseDown={e => { drawing.current = true; lastPos.current = getPos(e) }}
          onMouseMove={draw}
          onMouseUp={() => { drawing.current = false; lastPos.current = null }}
          onMouseLeave={() => { drawing.current = false; lastPos.current = null }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create components/session/TeacherRoom.tsx**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import SessionChat from './SessionChat'
import Whiteboard from './Whiteboard'

function TeacherControls({
  onEndSession,
  onToggleWhiteboard,
}: {
  onEndSession: () => void
  onToggleWhiteboard: () => void
}) {
  const room = useRoomContext()
  const [sharingScreen, setSharingScreen] = useState(false)

  const toggleScreenShare = async () => {
    await room.localParticipant.setScreenShareEnabled(!sharingScreen)
    setSharingScreen(s => !s)
  }

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
      <button
        onClick={toggleScreenShare}
        className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
          sharingScreen ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        {sharingScreen ? '⏹ Stop Share' : '🖥 Screen Share'}
      </button>
      <button
        onClick={onToggleWhiteboard}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
      >
        🖊 Whiteboard
      </button>
      <button
        onClick={onEndSession}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700"
      >
        End Session
      </button>
    </div>
  )
}

export default function TeacherRoom({
  token,
  serverUrl,
  participantName,
  onEndSession,
  onDisconnected,
}: {
  token: string
  serverUrl: string
  participantName: string
  onEndSession: () => Promise<void>
  onDisconnected: () => void
}) {
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [roomInstance, setRoomInstance] = useState<import('livekit-client').Room | null>(null)

  return (
    <div className="flex h-screen bg-gray-900 relative">
      <div className="flex-1 relative" data-lk-theme="default">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          video={true}
          audio={true}
          onDisconnected={onDisconnected}
          onConnected={room => setRoomInstance(room)}
          style={{ height: '100%' }}
        >
          <VideoConference />
          <TeacherControls
            onEndSession={onEndSession}
            onToggleWhiteboard={() => setShowWhiteboard(s => !s)}
          />
        </LiveKitRoom>
      </div>

      {roomInstance && (
        <div className="w-72 h-full">
          <SessionChat room={roomInstance} participantName={participantName} />
        </div>
      )}

      {showWhiteboard && (
        <Whiteboard onClose={() => setShowWhiteboard(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create components/session/StudentRoom.tsx**

```typescript
'use client'

import { useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import SessionChat from './SessionChat'

export default function StudentRoom({
  token,
  serverUrl,
  participantName,
  onDisconnected,
}: {
  token: string
  serverUrl: string
  participantName: string
  onDisconnected: () => void
}) {
  const [roomInstance, setRoomInstance] = useState<import('livekit-client').Room | null>(null)

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1" data-lk-theme="default">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          video={true}
          audio={true}
          onDisconnected={onDisconnected}
          onConnected={room => setRoomInstance(room)}
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>

      {roomInstance && (
        <div className="w-72 h-full">
          <SessionChat room={roomInstance} participantName={participantName} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create app/classroom/[id]/session/[sessionId]/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import TeacherRoom from '@/components/session/TeacherRoom'
import StudentRoom from '@/components/session/StudentRoom'

export default function SessionPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [livekitToken, setLivekitToken] = useState<string | null>(null)
  const [livekitUrl, setLivekitUrl] = useState<string>('')
  const [error, setError] = useState('')
  const isTeacher = session?.role === 'teacher'

  useEffect(() => {
    if (!session?.backendToken) return

    const getToken = async () => {
      try {
        let result: { token: string; roomId: string; liveKitUrl: string }
        if (isTeacher) {
          result = await api.sessions.start(session.backendToken, params.sessionId)
        } else {
          result = await api.sessions.join(session.backendToken, params.sessionId)
        }
        setLivekitToken(result.token)
        setLivekitUrl(result.liveKitUrl)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to join session')
      }
    }

    getToken()
  }, [session, params.sessionId, isTeacher])

  const handleEndSession = async () => {
    if (!session?.backendToken) return
    await api.sessions.end(session.backendToken, params.sessionId)
    router.push(`/classroom/${params.id}/sessions`)
  }

  const handleDisconnected = () => {
    router.push(`/classroom/${params.id}/sessions`)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/classroom/${params.id}/sessions`)}
            className="bg-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-600"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    )
  }

  if (!livekitToken) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-gray-400">Connecting to session…</p>
      </div>
    )
  }

  if (isTeacher) {
    return (
      <TeacherRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        participantName={session?.user?.name ?? 'Teacher'}
        onEndSession={handleEndSession}
        onDisconnected={handleDisconnected}
      />
    )
  }

  return (
    <StudentRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      participantName={session?.user?.name ?? 'Student'}
      onDisconnected={handleDisconnected}
    />
  )
}
```

- [ ] **Step 7: Delete old files no longer needed**

```bash
rm app/room/page.tsx
# The app/api/get-token/route.ts can be kept as fallback for the original demo
# but it's unused by the new app flow
```

- [ ] **Step 8: Commit**

```bash
git add app/classroom/ components/session/
git commit -m "feat: live session pages with teacher/student views, whiteboard, and in-session chat"
```

---

### Task 19: Final Wiring & Verification

- [ ] **Step 1: Update next.config.js to allow images from Google**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
}
module.exports = nextConfig
```

- [ ] **Step 2: Add tsconfig path alias**

In `tsconfig.json`, ensure `paths` is set:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors (warnings about `any` are acceptable).

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete teaching platform frontend — all pages and components"
```

---

## Frontend Complete ✓

The frontend now provides:
- `/` — Google OAuth landing
- `/auth/role` — one-time role picker (teacher / student)
- `/dashboard` — classroom list with create/join modals
- `/classroom/[id]/channel/[channelId]` — channel view with messages (3s poll) + document upload/download
- `/classroom/[id]/sessions` — session list, teacher can create + start
- `/classroom/[id]/session/[sessionId]` — live room (teacher: whiteboard + controls; student: viewer + chat)

---

---

### Task 20: Bug Fixes (Self-Review Corrections)

**Files:**
- Modify: `app/classroom/[id]/page.tsx`
- Modify: `components/session/Whiteboard.tsx`
- Modify: `components/session/TeacherRoom.tsx`
- Modify: `components/session/StudentRoom.tsx`

- [ ] **Step 1: Fix /classroom/[id]/page.tsx — show welcome screen, not broken redirect**

Replace the entire file:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import ClassroomLayout from '@/components/layout/ClassroomLayout'

export default function ClassroomHome({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session?.backendToken) return
    api.classrooms.get(session.backendToken, params.id).then(c => {
      const firstChannel = c.channels[0]
      if (firstChannel) {
        router.replace(`/classroom/${params.id}/channel/${firstChannel.id}`)
      }
    })
  }, [session, params.id, router])

  return (
    <ClassroomLayout classroomId={params.id}>
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Loading channels…</p>
      </div>
    </ClassroomLayout>
  )
}
```

- [ ] **Step 2: Fix Whiteboard.tsx — add canvas.captureStream() to broadcast via LiveKit**

Replace `components/session/Whiteboard.tsx` entirely:
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Room, LocalTrack } from 'livekit-client'

type Tool = 'pen' | 'eraser'

export default function Whiteboard({
  onClose,
  room,
}: {
  onClose: () => void
  room: import('livekit-client').Room
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#000000')
  const [size, setSize] = useState(4)
  const [sharing, setSharing] = useState(false)
  const trackRef = useRef<LocalTrack | null>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const draw = (e: React.MouseEvent) => {
    if (!drawing.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const pos = getPos(e)
    ctx.lineWidth = tool === 'eraser' ? size * 5 : size
    ctx.lineCap = 'round'
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.beginPath()
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPos.current = pos
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const toggleShare = async () => {
    if (sharing) {
      if (trackRef.current) {
        await room.localParticipant.unpublishTrack(trackRef.current)
        trackRef.current = null
      }
      setSharing(false)
    } else {
      const canvas = canvasRef.current
      if (!canvas) return
      const stream = (canvas as any).captureStream(30) as MediaStream
      const videoTrack = stream.getVideoTracks()[0]
      const { LocalVideoTrack, Track } = await import('livekit-client')
      const livekitTrack = new LocalVideoTrack(videoTrack)
      await room.localParticipant.publishTrack(livekitTrack, {
        source: Track.Source.ScreenShare,
      })
      trackRef.current = livekitTrack
      setSharing(true)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden"
           style={{ width: 800, height: 580 }}>
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 border-b border-gray-200">
          <button
            onClick={() => setTool('pen')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              tool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            🧹 Eraser
          </button>
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0"
          />
          <input
            type="range" min="1" max="20" value={size}
            onChange={e => setSize(Number(e.target.value))}
            className="w-24"
          />
          <button
            onClick={clear}
            className="px-3 py-1 rounded text-sm bg-red-100 text-red-600 hover:bg-red-200"
          >
            Clear
          </button>
          <button
            onClick={toggleShare}
            className={`px-3 py-1 rounded text-sm font-medium ${
              sharing
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {sharing ? '📡 Sharing' : '📡 Share'}
          </button>
          <div className="ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded text-sm bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              Close ✕
            </button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={528}
          className="cursor-crosshair block"
          onMouseDown={e => { drawing.current = true; lastPos.current = getPos(e) }}
          onMouseMove={draw}
          onMouseUp={() => { drawing.current = false; lastPos.current = null }}
          onMouseLeave={() => { drawing.current = false; lastPos.current = null }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Fix TeacherRoom.tsx — use child component to get Room instance instead of onConnected**

Replace `components/session/TeacherRoom.tsx` entirely:
```typescript
'use client'

import { useState } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
} from '@livekit/components-react'
import SessionChat from './SessionChat'
import Whiteboard from './Whiteboard'

function TeacherControls({
  onEndSession,
  onToggleWhiteboard,
}: {
  onEndSession: () => void
  onToggleWhiteboard: () => void
}) {
  const room = useRoomContext()
  const [sharingScreen, setSharingScreen] = useState(false)

  const toggleScreenShare = async () => {
    await room.localParticipant.setScreenShareEnabled(!sharingScreen)
    setSharingScreen(s => !s)
  }

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
      <button
        onClick={toggleScreenShare}
        className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
          sharingScreen ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        {sharingScreen ? '⏹ Stop Share' : '🖥 Screen Share'}
      </button>
      <button
        onClick={onToggleWhiteboard}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
      >
        🖊 Whiteboard
      </button>
      <button
        onClick={onEndSession}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700"
      >
        End Session
      </button>
    </div>
  )
}

function ChatAndWhiteboard({
  participantName,
  onEndSession,
}: {
  participantName: string
  onEndSession: () => void
}) {
  const room = useRoomContext()
  const [showWhiteboard, setShowWhiteboard] = useState(false)

  return (
    <>
      <div className="w-72 h-full flex flex-col">
        <SessionChat room={room} participantName={participantName} />
      </div>
      <TeacherControls
        onEndSession={onEndSession}
        onToggleWhiteboard={() => setShowWhiteboard(s => !s)}
      />
      {showWhiteboard && (
        <Whiteboard room={room} onClose={() => setShowWhiteboard(false)} />
      )}
    </>
  )
}

export default function TeacherRoom({
  token,
  serverUrl,
  participantName,
  onEndSession,
  onDisconnected,
}: {
  token: string
  serverUrl: string
  participantName: string
  onEndSession: () => Promise<void>
  onDisconnected: () => void
}) {
  return (
    <div className="flex h-screen bg-gray-900 relative overflow-hidden">
      <div className="flex-1 relative" data-lk-theme="default">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          video={true}
          audio={true}
          onDisconnected={onDisconnected}
          style={{ height: '100%' }}
        >
          <VideoConference />
          <ChatAndWhiteboard
            participantName={participantName}
            onEndSession={onEndSession}
          />
        </LiveKitRoom>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Fix StudentRoom.tsx — use child component for Room instance**

Replace `components/session/StudentRoom.tsx` entirely:
```typescript
'use client'

import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react'
import SessionChat from './SessionChat'

function ChatPanel({ participantName }: { participantName: string }) {
  const room = useRoomContext()
  return (
    <div className="w-72 h-full">
      <SessionChat room={room} participantName={participantName} />
    </div>
  )
}

export default function StudentRoom({
  token,
  serverUrl,
  participantName,
  onDisconnected,
}: {
  token: string
  serverUrl: string
  participantName: string
  onDisconnected: () => void
}) {
  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <div className="flex-1" data-lk-theme="default">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          video={true}
          audio={true}
          onDisconnected={onDisconnected}
          style={{ height: '100%' }}
        >
          <VideoConference />
          <ChatPanel participantName={participantName} />
        </LiveKitRoom>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit fixes**

```bash
git add app/classroom/ components/session/
git commit -m "fix: classroom home redirect, whiteboard canvas stream, Room instance access"
```

---

## Supabase Setup

1. Create project at https://supabase.com
2. Go to **Storage → Buckets → New bucket**: name `classroom-files`, set **Public**
3. Go to **Settings → API**: copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Google Cloud OAuth Setup

1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID, type: **Web application**
3. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID → `GOOGLE_CLIENT_ID` (frontend + backend)
5. Copy Client Secret → `GOOGLE_CLIENT_SECRET` (frontend only; backend uses Client ID for token validation)
