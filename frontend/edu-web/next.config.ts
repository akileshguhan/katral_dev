import type { NextConfig } from "next";

// Dev-only ngrok hostnames; in production these are ignored.
// Extend via NEXT_PUBLIC_DEV_ORIGIN env var (comma-separated) if you use a different tunnel.
const devOrigins = [
  '*.ngrok-free.dev',
  '*.ngrok.app',
  '*.ngrok.io',
  ...(process.env.NEXT_PUBLIC_DEV_ORIGIN?.split(',').map(s => s.trim()).filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,

  turbopack: {
    root: __dirname,
  },

  // Proxy known backend endpoints to the .NET API. We list paths explicitly so the
  // /api/auth/* rewrites don't shadow NextAuth's reserved routes (signin, signout,
  // session, providers, csrf, callback, error, _log) which MUST be served by Next.js.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:5261'
    return {
      // beforeFiles runs BEFORE Next.js route handlers — used for backend-owned
      // /api/auth/* paths that would otherwise be swallowed by NextAuth's catch-all.
      beforeFiles: [
        { source: '/api/auth/register',     destination: `${backendUrl}/api/auth/register` },
        { source: '/api/auth/role',         destination: `${backendUrl}/api/auth/role` },
        { source: '/api/auth/switch-role',  destination: `${backendUrl}/api/auth/switch-role` },
      ],
      // afterFiles runs AFTER Next.js route handlers — safe for non-auth backend paths.
      afterFiles: [
        { source: '/api/classrooms/:path*',    destination: `${backendUrl}/api/classrooms/:path*` },
        { source: '/api/channels/:path*',      destination: `${backendUrl}/api/channels/:path*` },
        { source: '/api/sessions/:path*',      destination: `${backendUrl}/api/sessions/:path*` },
        { source: '/api/notifications/:path*', destination: `${backendUrl}/api/notifications/:path*` },
      ],
    }
  },
};

export default nextConfig;
