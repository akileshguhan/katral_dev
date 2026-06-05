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
        const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5261'
        try {
          const res = await fetch(`${backendUrl}/api/auth/login`, {
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
    async jwt({ token, account, user, trigger, session: sessionData }: any) {
      if (trigger === 'update' && sessionData?.role) {
        token.role = sessionData.role
      }
      if (trigger === 'update' && sessionData?.apiToken) {
        token.apiToken = sessionData.apiToken
      }
      if (account?.provider === 'google' && account.id_token) {
        const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5261'
        try {
          const res = await fetch(`${backendUrl}/api/auth/google`, {
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
        } catch { /* network error */ }
      }
      if (account?.provider === 'credentials' && (user as any)?.apiToken) {
        token.apiToken = (user as any).apiToken
        token.role     = (user as any).role
        token.userId   = user.id
      }

      // Recovery: if apiToken is still missing (e.g., Google OAuth backend call failed),
      // call the server-to-server endpoint to get/create a backend token from the user's email.
      if (!token.apiToken && token.email) {
        const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5261'
        try {
          const res = await fetch(`${backendUrl}/api/auth/s2s-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Server-Secret': process.env.JWT_SECRET ?? '',
            },
            body: JSON.stringify({ email: token.email, name: token.name ?? '' }),
          })
          if (res.ok) {
            const data = await res.json()
            token.apiToken = data.token
            token.role     = data.user.role ?? ''
            token.userId   = data.user.id ?? ''
          }
        } catch { /* ignore — will surface as empty apiToken in the session */ }
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
  pages: { signIn: '/', error: '/' },
  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,     // refresh token once per day (rolling)
  },
}
