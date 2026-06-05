import type { Message } from '@/types'

export default function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#f8f9fb]">
      {messages.length === 0 && (
        <p className="text-gray-400 text-sm text-center pt-10">No messages yet. Say hello!</p>
      )}
      {messages.map(m => (
        <div key={m.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
            {m.sender.senderName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-gray-800">{m.sender.senderName}</span>
              <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{m.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
