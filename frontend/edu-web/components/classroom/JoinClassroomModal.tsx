'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { X } from 'lucide-react'

export default function JoinClassroomModal({
  token, onClose, onJoined
}: { token: string; onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    try {
      await api.classrooms.join(token, code.trim().toUpperCase())
      onJoined()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid join code')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900 tracking-tight">Join Classroom</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Join code</label>
            <input
              type="text"
              placeholder="Enter 6-character code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all bg-white text-center tracking-widest font-mono uppercase"
            />
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5">
              <p className="text-sm text-amber-800 text-center">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-[0.97] transition-all text-sm font-bold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold"
            >
              {loading ? 'Joining…' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
