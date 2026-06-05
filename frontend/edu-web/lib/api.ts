import type { SessionResponse } from '@/types'

// Empty string → relative URL → Next.js rewrite proxy handles routing to the backend.
// In local dev without sharing, set NEXT_PUBLIC_API_URL=http://localhost:5261 to skip the proxy.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export class AuthError extends Error {
  constructor() { super('Session expired. Please sign in again.') }
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  if (!token) throw new AuthError()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (res.status === 401) throw new AuthError()
  if (res.status === 204) return undefined as T

  const text = await res.text()
  let body: any
  try { body = JSON.parse(text) } catch {
    // Backend returned a non-JSON body (e.g. a .NET exception page)
    throw new Error(res.ok ? 'Invalid server response' : `Server error (${res.status})`)
  }

  if (!res.ok) throw new Error(body.error ?? body.message ?? body.title ?? `HTTP ${res.status}`)
  return body
}

export const api = {
  auth: {
    register: (email: string, name: string, password: string, role: string) =>
      request<{ token: string; user: { id: string; email: string; name: string; role: string } }>(
        '/api/auth/register', '', { method: 'POST', body: JSON.stringify({ email, name, password, role }) }
      ),
    updateRole: (token: string, role: string) =>
      request<{ role: string; token: string }>('/api/auth/role', token, { method: 'PATCH', body: JSON.stringify({ role }) }),
    switchRole: (token: string) =>
      request<{ role: string; token: string }>('/api/auth/switch-role', token, { method: 'POST' }),
    updateProfile: (token: string, name: string) =>
      request<{ token: string; user: { id: string; email: string; name: string; role: string } }>(
        '/api/auth/profile', token, { method: 'PATCH', body: JSON.stringify({ name }) }
      ),
    changePassword: (token: string, currentPassword: string, newPassword: string) =>
      request<{ message: string }>(
        '/api/auth/change-password', token, { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }
      ),
    twoFaSetup: (token: string) =>
      request<{ secret: string; uri: string }>('/api/auth/2fa/setup', token, { method: 'POST' }),
    twoFaVerify: (token: string, code: string) =>
      request<{ message: string }>('/api/auth/2fa/verify', token, { method: 'POST', body: JSON.stringify({ code }) }),
    twoFaDisable: (token: string, code: string) =>
      request<{ message: string }>('/api/auth/2fa', token, { method: 'DELETE', body: JSON.stringify({ code }) }),
    deleteAccount: (token: string, password?: string) =>
      request<{ message: string }>('/api/auth/account', token, { method: 'DELETE', body: JSON.stringify({ password: password ?? null }) }),
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
    leave: (token: string, classroomId: string) =>
      request<void>(`/api/classrooms/${classroomId}/leave`, token, { method: 'DELETE' }),
    delete: (token: string, classroomId: string) =>
      request<void>(`/api/classrooms/${classroomId}`, token, { method: 'DELETE' }),
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
    create: (token: string, classroomId: string, title: string, scheduledAt?: string, durationMinutes?: number) =>
      request<import('@/types').Session>(`/api/classrooms/${classroomId}/sessions`, token, {
        method: 'POST', body: JSON.stringify({ title, scheduledAt: scheduledAt ?? null, durationMinutes: durationMinutes ?? null }),
      }),
    start: (token: string, sessionId: string) =>
      request<SessionResponse>(`/api/sessions/${sessionId}/start`, token, { method: 'POST' }),
    join: (token: string, sessionId: string) =>
      request<SessionResponse>(`/api/sessions/${sessionId}/join`, token, { method: 'POST' }),
    end: (token: string, sessionId: string) =>
      request<void>(`/api/sessions/${sessionId}/end`, token, { method: 'POST' }),
    getStatus: (token: string, sessionId: string) =>
      request<{ status: string }>(`/api/sessions/${sessionId}/status`, token),
  },

  notifications: {
    list: (token: string) =>
      request<import('@/types').Notification[]>('/api/notifications', token),
    readAll: (token: string) =>
      request<void>('/api/notifications/read-all', token, { method: 'PATCH' }),
  },

  attendance: {
    take: (token: string, sessionId: string) =>
      request<import('@/types').AttendanceRecord>(`/api/sessions/${sessionId}/attendance`, token, { method: 'POST' }),
    getBySession: (token: string, sessionId: string) =>
      request<import('@/types').AttendanceRecord[]>(`/api/sessions/${sessionId}/attendance`, token),
    getByClassroom: (token: string, classroomId: string) =>
      request<import('@/types').AttendanceRecord[]>(`/api/classrooms/${classroomId}/attendance`, token),
    getMine: (token: string) =>
      request<import('@/types').AttendanceRecord[]>('/api/me/attendance', token),
  },
}
