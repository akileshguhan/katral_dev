'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'

export default function MessageInput({ onSend, disabled }: { onSend: (content: string) => Promise<void>; disabled?: boolean }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending || disabled) return
    setSending(true)
    await onSend(text.trim())
    setText('')
    setSending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-3 border-t border-gray-200 bg-white flex gap-2 shrink-0">
      <input
        type="text" value={text} onChange={e => setText(e.target.value)}
        placeholder={disabled ? 'Read-only channel' : 'Message…'}
        disabled={disabled}
        className="flex-1 bg-[#f8f9fb] border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-600/20 transition-all disabled:opacity-50"
      />
      <button type="submit" disabled={!text.trim() || sending || disabled}
        className="w-10 h-10 rounded-xl bg-green-700 hover:bg-green-800 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0">
        <Send className="w-4 h-4 text-white" />
      </button>
    </form>
  )
}
