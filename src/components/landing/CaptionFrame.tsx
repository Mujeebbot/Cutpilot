import { useEffect, useRef, useState } from 'react'
import type { Caption } from '../../types'
import { drawCaption } from '../../lib/render'
import { ensureFonts } from '../../lib/fonts'
import { templateById } from '../../lib/templates'

export function CaptionFrame({
  templateId,
  text,
  activeWord = 1,
  width = 270,
  height = 480,
  y = 0.74,
  imageSrc = '/media/creator-reel-1.jpg',
  badge,
  animate = true,
  className = '',
}: {
  templateId: string
  text: string
  activeWord?: number
  width?: number
  height?: number
  y?: number
  imageSrc?: string
  badge?: string
  animate?: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState(false)

  // Map known aliases or fallback to heavy-pop so no card is ever empty
  const resolvedTemplateId =
    templateId === 'neon' ? 'neon-glow' :
    templateId === 'minimal-editorial' ? 'editorial' :
    templateId

  useEffect(() => {
    const t = templateById(resolvedTemplateId) || templateById('heavy-pop')!
    const c = canvasRef.current
    if (!c) return
    let dead = false
    const toks = text.split(/\s+/).filter(Boolean)
    const wordDuration = 0.44
    const totalDuration = toks.length * wordDuration + 0.8

    const cap: Caption = {
      id: 'demo',
      start: 0,
      end: toks.length * wordDuration,
      text,
      x: 0.5,
      y,
      words: toks.map((w, i) => ({
        t: w.replace(/\*/g, ''),
        s: i * wordDuration,
        e: (i + 1) * wordDuration,
      })),
    }

    // Start mid-animation on load so active words are immediately highlighted
    const midPointSec = Math.min(activeWord, Math.max(0, toks.length - 1)) * wordDuration + 0.18
    let start = performance.now() - midPointSec * 1000
    let rafId: number

    const renderFrame = (now: number) => {
      if (dead || !c) return
      const ctx = c.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, c.width, c.height)

      let timeSec: number
      if (animate || hover) {
        const elapsed = ((now - start) / 1000) % totalDuration
        timeSec = elapsed
      } else {
        timeSec = midPointSec
      }

      drawCaption(ctx, c.width, c.height, cap, t.style, timeSec)

      if (animate || hover) {
        rafId = requestAnimationFrame(renderFrame)
      }
    }

    void ensureFonts([t.style]).then(() => {
      if (!dead) {
        rafId = requestAnimationFrame(renderFrame)
      }
    })

    return () => {
      dead = true
      cancelAnimationFrame(rafId)
    }
  }, [resolvedTemplateId, text, activeWord, y, animate, hover])

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-white/10 bg-slate transition-all duration-300 hover:border-white/30 ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Background Creator Footage Image */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-[#181a20] via-[#121316] to-[#0a0b0e]" />
      )}

      {/* Cinematic Vignette Overlay to ensure caption contrast */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/15" />

      {/* Top Metadata & Live REC Status */}
      <div className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-white/90 backdrop-blur-md border border-white/10">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-[10px]">00:18</span>
        </div>
        {badge && (
          <span className="rounded-full bg-accent-500/25 px-2 py-0.5 text-[10px] text-accent-300 backdrop-blur-md border border-accent-500/40">
            {badge}
          </span>
        )}
      </div>

      {/* Transparent Canvas Layer for Dynamic Captions */}
      <canvas
        ref={canvasRef}
        width={width * 2}
        height={height * 2}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />
    </div>
  )
}
