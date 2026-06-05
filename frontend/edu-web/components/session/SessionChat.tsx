'use client'
import { useState } from 'react'
import { useChat } from '@livekit/components-react'
import { Send } from 'lucide-react'

export default function SessionChat() {
  const { chatMessages, send } = useChat()
  const [text, setText] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    send(text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1d26] border-l border-white/10">
      <div className="px-4 py-3 border-b border-white/10 shrink-0">
        <h4 className="text-sm font-semibold text-white">Session Chat</h4>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {chatMessages.map((m, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-green-700/30 flex items-center justify-center text-xs font-bold text-green-300 shrink-0">
              {(m.from?.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-white/70">{m.from?.name}</p>
              <p className="text-xs text-white/60 mt-0.5">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="px-3 py-3 border-t border-white/10 flex gap-2 shrink-0">
        <input
          type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Chat…"
          className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-green-500 transition-colors"
        />
        <button type="submit" disabled={!text.trim()}
          className="w-8 h-8 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-40 flex items-center justify-center transition-colors">
          <Send className="w-3 h-3 text-white" />
        </button>
      </form>
    </div>
  )
}
