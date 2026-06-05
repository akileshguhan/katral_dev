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
