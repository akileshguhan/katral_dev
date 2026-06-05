'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDataChannel } from '@livekit/components-react'
import { Pencil, Eraser, Minus, Plus, Trash2 } from 'lucide-react'

type Tool = 'pen' | 'eraser'
type Stroke = { from: { x: number; y: number }; to: { x: number; y: number }; color: string; width: number; eraser: boolean }

const MSG_STROKE = 'wb:'
const MSG_CLEAR  = 'wb_clear'

const COLORS = ['#111827', '#6366f1', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#ffffff']

export default function Whiteboard({ canDraw }: { canDraw: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const drawing      = useRef(false)
  const lastPos      = useRef<{ x: number; y: number } | null>(null)
  const strokes      = useRef<Stroke[]>([])

  const [color, setColor]           = useState('#111827')
  const [tool, setTool]             = useState<Tool>('pen')
  const [strokeWidth, setStrokeWidth] = useState(3)

  const applyStroke = useCallback((ctx: CanvasRenderingContext2D, s: Stroke) => {
    ctx.beginPath()
    ctx.moveTo(s.from.x, s.from.y)
    ctx.lineTo(s.to.x, s.to.y)
    ctx.strokeStyle = s.color
    ctx.lineWidth   = s.eraser ? s.width * 6 : s.width
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.globalCompositeOperation = s.eraser ? 'destination-out' : 'source-over'
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    strokes.current.forEach(s => applyStroke(ctx, s))
  }, [applyStroke])

  // Resize canvas to fill container exactly (fixes coordinate mismatch)
  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return
    const ro = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect()
      canvas.width  = width
      canvas.height = height
      redraw()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [redraw])

  const { send } = useDataChannel((msg) => {
    const text = new TextDecoder().decode(msg.payload)
    if (text === MSG_CLEAR) {
      strokes.current = []
      redraw()
    } else if (text.startsWith(MSG_STROKE)) {
      const s: Stroke = JSON.parse(text.slice(MSG_STROKE.length))
      strokes.current.push(s)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) applyStroke(ctx, s)
    }
  })

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const s: Stroke = { from, to, color, width: strokeWidth, eraser: tool === 'eraser' }
    strokes.current.push(s)
    applyStroke(ctx, s)
    send(new TextEncoder().encode(MSG_STROKE + JSON.stringify(s)), { reliable: true })
  }

  const clearAll = () => {
    strokes.current = []
    redraw()
    send(new TextEncoder().encode(MSG_CLEAR), { reliable: true })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDraw) return
    drawing.current = true
    lastPos.current = getPos(e)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDraw || !drawing.current || !lastPos.current) return
    const pos = getPos(e)
    drawSegment(lastPos.current, pos)
    lastPos.current = pos
  }

  const stopDrawing = () => { drawing.current = false; lastPos.current = null }

  return (
    <div className="flex flex-col h-full bg-white select-none">

      {/* Toolbar */}
      {canDraw && (
        <div className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-gray-200 bg-white shadow-sm">

          {/* Tool toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTool('pen')}
              title="Pen"
              className={`p-1.5 rounded-md transition-colors ${tool === 'pen' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              title="Eraser"
              className={`p-1.5 rounded-md transition-colors ${tool === 'eraser' ? 'bg-white shadow-sm text-green-700' : 'text-gray-400 hover:text-gray-700'}`}
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200" />

          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool('pen') }}
                className={`w-5 h-5 rounded-full transition-all ${
                  color === c && tool === 'pen'
                    ? 'ring-2 ring-offset-1 ring-green-500 scale-125'
                    : 'hover:scale-110'
                }`}
                style={{
                  backgroundColor: c,
                  boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #d1d5db' : undefined,
                }}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200" />

          {/* Stroke width */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStrokeWidth(w => Math.max(1, w - 1))}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="w-8 flex items-center justify-center">
              <div
                className="rounded-full bg-gray-700"
                style={{ width: Math.min(strokeWidth * 3, 22), height: Math.min(strokeWidth * 3, 22) }}
              />
            </div>
            <button
              onClick={() => setStrokeWidth(w => Math.min(20, w + 1))}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clear */}
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </button>
        </div>
      )}

      {/* Canvas container — grid is the div background, canvas sits on top */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundColor: '#ffffff',
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            cursor: !canDraw ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  )
}
