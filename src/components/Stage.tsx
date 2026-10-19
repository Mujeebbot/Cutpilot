import { useEffect, useRef, useState } from 'react'
import type { RefObject, VideoHTMLAttributes } from 'react'
import type { CanvasSettings, Caption, CaptionStyle } from '../types'
import { drawCaption } from '../lib/render'
import type { Box } from '../lib/render'
import { drawFrame } from '../lib/compose'
import { styleFor } from '../lib/captions'
import { clamp } from '../lib/util'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  url: string | null
  dims: { w: number; h: number } // output canvas size (sets the preview shape)
  canvas: CanvasSettings
  time: number
  frameTick: number
  captions: Caption[]
  style: CaptionStyle
  selId: string | null
  fontTick: number
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onTogglePlay: () => void
  videoProps: VideoHTMLAttributes<HTMLVideoElement>
}

/**
 * Preview = the same composition the exporter renders: video frame (letter-boxed on the chosen canvas)
 * + captions drawn by drawCaption. The <video> element only decodes and plays audio.
 */
export function Stage(p: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const boxes = useRef<{ id: string; box: Box }[]>([])
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [guide, setGuide] = useState<{ v: boolean; h: boolean } | null>(null)

  useEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      const ar = p.dims.w / p.dims.h
      let w = width, h = width / ar
      if (h > height) { h = height; w = h * ar }
      setSize({ w: Math.floor(w), h: Math.floor(h) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [p.dims.w, p.dims.h])

  useEffect(() => {
    const c = canvas.current
    const v = p.videoRef.current
    if (!c || !v || !size.w) return
    const dpr = window.devicePixelRatio || 1
    const W = Math.round(size.w * dpr), H = Math.round(size.h * dpr)
    if (c.width !== W) c.width = W
    if (c.height !== H) c.height = H
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    if (p.url) drawFrame(ctx, v, W, H, p.canvas)
    boxes.current = []
    for (const cap of p.captions) {
      if (p.time < cap.start || p.time >= cap.end) continue
      const box = drawCaption(ctx, W, H, cap, styleFor(cap, p.style), p.time)
      boxes.current.push({ id: cap.id, box })
      if (cap.id === p.selId) {
        ctx.save()
        ctx.strokeStyle = '#a99cff'
        ctx.lineWidth = 2 * dpr
        ctx.setLineDash([8 * dpr, 6 * dpr])
        ctx.strokeRect(box.x, box.y, box.w, box.h)
        ctx.restore()
      }
    }
    if (guide) { // alignment guides + safe margin, shown only while dragging (never exported)
      ctx.save()
      ctx.lineWidth = dpr
      ctx.strokeStyle = 'rgba(169,156,255,0.9)'
      if (guide.v) { ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke() }
      if (guide.h) { ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke() }
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.setLineDash([6 * dpr, 6 * dpr])
      ctx.strokeRect(W * 0.06, H * 0.06, W * 0.88, H * 0.88)
      ctx.restore()
    }
  }, [p.captions, p.style, p.time, p.selId, p.fontTick, p.frameTick, p.canvas, p.url, size, guide, p.videoRef])

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  const down = (e: React.PointerEvent) => {
    const c = canvas.current!
    const { x, y } = pos(e)
    const px = x * c.width, py = y * c.height
    const hit = [...boxes.current].reverse().find(({ box: b }) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h)
    if (hit) {
      const cap = p.captions.find((k) => k.id === hit.id)!
      p.onSelect(hit.id)
      drag.current = { id: hit.id, dx: x - cap.x, dy: y - cap.y }
      c.setPointerCapture(e.pointerId)
      setGuide({ v: false, h: false })
    } else drag.current = null
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const { x, y } = pos(e)
    let nx = clamp(x - d.dx, 0.05, 0.95), ny = clamp(y - d.dy, 0.05, 0.95)
    const sv = Math.abs(nx - 0.5) < 0.015, sh = Math.abs(ny - 0.5) < 0.015
    if (sv) nx = 0.5
    if (sh) ny = 0.5
    setGuide({ v: sv, h: sh })
    p.onMove(d.id, nx, ny)
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    setGuide(null)
    if (!d) p.onTogglePlay()
  }

  return (
    <div ref={wrap} className="grid h-full w-full place-items-center">
      <div className="relative overflow-hidden rounded-md bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.07),0_20px_60px_rgba(0,0,0,0.55)]"
        style={{ width: size.w, height: size.h, visibility: p.url ? 'visible' : 'hidden' }}>
        <video ref={p.videoRef} src={p.url ?? undefined} playsInline preload="auto" className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0" {...p.videoProps} />
        <canvas ref={canvas} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: 'pointer' }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} />
      </div>
    </div>
  )
}
