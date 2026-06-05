'use client'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import Whiteboard from './Whiteboard'
import SessionChat from './SessionChat'
import { useState } from 'react'
import { PenLine, MessageSquare, PhoneOff, X, Users, Video, ClipboardCheck } from 'lucide-react'

type Mode = 'video' | 'whiteboard'

export default function TeacherRoom({ token, serverUrl, participantName, onEndSession, onDisconnected, onTakeAttendance }: {
  token: string; serverUrl: string; participantName: string
  onEndSession: () => void; onDisconnected: () => void
  onTakeAttendance?: () => void
}) {
  const [mode, setMode]       = useState<Mode>('video')
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect data-lk-theme="default"
      onDisconnected={onDisconnected} style={{ height: '100vh' }}>

      <div className="flex flex-col h-screen bg-[#202124]">

        {/* ── Top bar ── */}
        <div className="h-14 shrink-0 flex items-center justify-between px-4 bg-[#202124] border-b border-white/8">

          {/* Left: brand + status */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
              </svg>
            </div>
            <span className="text-white/80 text-sm font-semibold">Live Session</span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
            </span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5">

            {/* Mode toggles */}
            <button
              onClick={() => setMode('video')}
              title="Camera"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'video'
                  ? 'bg-white text-gray-900'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
            </button>

            <button
              onClick={() => setMode('whiteboard')}
              title="Whiteboard"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'whiteboard'
                  ? 'bg-white text-gray-900'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">Board</span>
            </button>

            <button
              onClick={() => setChatOpen(o => !o)}
              title="Chat"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chatOpen
                  ? 'bg-white text-gray-900'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>

            {onTakeAttendance && (
              <button
                onClick={onTakeAttendance}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Attendance</span>
              </button>
            )}

            <div className="w-px h-5 bg-white/15 mx-1" />

            <div className="flex items-center gap-2 bg-white/8 px-3 py-1.5 rounded-lg">
              <Users className="w-3.5 h-3.5 text-white/40" />
              <span className="text-white/60 text-xs font-medium">{participantName}</span>
            </div>

            <button
              onClick={onEndSession}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ml-1"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End</span>
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Main area */}
          <div className="flex-1 overflow-hidden min-w-0">
            {mode === 'whiteboard' ? (
              <Whiteboard canDraw={true} />
            ) : (
              <VideoConference />
            )}
          </div>

          {/* Chat panel */}
          {chatOpen && (
            <div className="w-80 shrink-0 flex flex-col bg-[#2d2d30] border-l border-white/10">
              <div className="h-11 shrink-0 flex items-center justify-between px-4 border-b border-white/10">
                <span className="text-white text-sm font-semibold">Chat</span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SessionChat />
              </div>
            </div>
          )}
        </div>
      </div>
    </LiveKitRoom>
  )
}
