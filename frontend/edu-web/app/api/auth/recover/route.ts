import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.apiToken) {
    return NextResponse.json({ apiToken: session.apiToken, role: session.role ?? '' })
  }

  const email = session.user?.email
  if (!email) {
    return NextResponse.json({ error: 'No email in session' }, { status: 400 })
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5261'

  try {
    const res = await fetch(`${backendUrl}/api/auth/s2s-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-Secret': process.env.JWT_SECRET ?? '',
      },
      body: JSON.stringify({ email, name: session.user?.name ?? '' }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Backend recovery failed' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ apiToken: data.token, role: data.user.role ?? '' })
  } catch {
    return NextResponse.json({ error: 'Network error' }, { status: 502 })
  }
}
