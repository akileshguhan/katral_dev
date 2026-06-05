import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  // Unauthenticated — send to landing page
  if (!token && (pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/auth'))) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Logged in but no role yet — must complete onboarding
  if (token?.apiToken && !token.role && pathname !== '/auth/role') {
    return NextResponse.redirect(new URL('/auth/role', req.url))
  }

  // Cross-role access guards
  if (token?.role === 'student' && pathname.startsWith('/teacher')) {
    return NextResponse.redirect(new URL('/student/dashboard', req.url))
  }
  if (token?.role === 'teacher' && pathname.startsWith('/student')) {
    return NextResponse.redirect(new URL('/teacher/dashboard', req.url))
  }

  // Logged-in user hits root — send to their dashboard
  if (token?.apiToken && pathname === '/') {
    if (!token.role) return NextResponse.redirect(new URL('/auth/role', req.url))
    const dest = token.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/', '/teacher/:path*', '/student/:path*', '/auth/:path*'] }
