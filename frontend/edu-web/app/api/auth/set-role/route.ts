import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5261'

async function getUserWithRole(email: string, name: string): Promise<{ token: string; role: string } | null> {
  try {
    const res = await fetch(`${BACKEND}/api/auth/s2s-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-Secret': process.env.JWT_SECRET ?? '',
      },
      body: JSON.stringify({ email, name }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { token: data.token, role: data.user?.role ?? '' }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { role } = await req.json().catch(() => ({}))

  if (role !== 'teacher' && role !== 'student') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let apiToken: string = (session.apiToken as string) ?? ''
  const email = session.user?.email ?? ''
  const name  = session.user?.name  ?? ''

  if (!apiToken) {
    if (!email) return NextResponse.json({ error: 'No email in session' }, { status: 400 })
    const recovered = await getUserWithRole(email, name)
    if (!recovered) return NextResponse.json({ error: 'Could not obtain backend token' }, { status: 502 })
    apiToken = recovered.token
    // If the DB already has a role, return it immediately — no need to PATCH
    if (recovered.role === 'teacher' || recovered.role === 'student') {
      return NextResponse.json({ role: recovered.role, apiToken: recovered.token })
    }
  }

  try {
    const res = await fetch(`${BACKEND}/api/auth/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ role }),
    })

    const data = await res.json().catch(() => ({}))

    // 403 = role already set in DB — recover the real role and return it
    if (res.status === 403 && email) {
      const recovered = await getUserWithRole(email, name)
      if (recovered && (recovered.role === 'teacher' || recovered.role === 'student')) {
        return NextResponse.json({ role: recovered.role, apiToken: recovered.token })
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: (data as any).error ?? 'Failed to set role' },
        { status: res.status }
      )
    }

    return NextResponse.json({ role: (data as any).role, apiToken: (data as any).token })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
