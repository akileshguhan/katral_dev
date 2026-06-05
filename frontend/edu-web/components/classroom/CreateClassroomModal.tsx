'use client'
import { useRef, useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { api, AuthError } from '@/lib/api'
import type { Classroom } from '@/types'
import { X } from 'lucide-react'

export default function CreateClassroomModal({
  token, onClose, onCreated
}: { token: string; onClose: () => void; onCreated: (c: Classroom) => void }) {
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const classroom = await api.classrooms.create(token, name.trim())
      onCreated(classroom)
    } catch (err) {
      if (err instanceof AuthError) {
        setError('__auth__')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create classroom')
      }
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
          <h2 className="text-base font-black text-gray-900 tracking-tight">Create classroom</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Classroom name</label>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. Physics — Grade 10"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-2 border-gray-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all bg-white"
            />
          </div>

          {error === '__auth__' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-800">Session expired.</p>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm font-semibold text-amber-700 hover:text-amber-900 underline shrink-0"
              >
                Sign out
              </button>
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : null}

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
              disabled={loading || !name.trim()}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating
                </span>
              ) : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
