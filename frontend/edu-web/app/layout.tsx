import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import SessionProvider from '@/components/providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Kattral Academy', description: 'Live learning platform' }

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('kattral-theme') || 'light';
    var f = localStorage.getItem('kattral-fontsize') || 'medium';
    if (t === 'system') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-fontsize', f);
  } catch(e){}
})();
`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
