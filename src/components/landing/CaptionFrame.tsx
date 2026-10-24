import { useEffect, useRef } from 'react'
import type { Caption } from '../../types'
import { drawCaption } from '../../lib/render'
import { ensureFonts } from '../../lib/fonts'
import { templateById } from '../../lib/templates'

/**
 * A still of a colour-graded interview frame (painted with canvas, placeholder footage) with a caption drawn by
 * CutPilot's real caption renderer and one of its real templates, so what the page shows is what the product produces.
 */
function paintScene(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1f4a4e'); g.addColorStop(0.55, '#163538'); g.addColorStop(1, '#0d1f22')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // practical light in the background (sodium amber) and a window of cool light
  ctx.fillStyle = 'rgba(224,164,88,0.9)'; ctx.fillRect(W * 0.08, H * 0.12, W * 0.14, H * 0.26)
  ctx.fillStyle = 'rgba(224,164,88,0.25)'; ctx.fillRect(W * 0.04, H * 0.1, W * 0.22, H * 0.3)
  ctx.fillStyle = 'rgba(160,200,205,0.18)'; ctx.fillRect(W * 0.7, H * 0.08, W * 0.2, H * 0.34)
  // shoulders and head, lit warm from camera left
  ctx.fillStyle = '#1a1d22'
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.98, W * 0.46, H * 0.3, 0, Math.PI, 0); ctx.fill()
  const skin = ctx.createRadialGradient(W * 0.44, H * 0.38, W * 0.02, W * 0.5, H * 0.42, W * 0.22)
  skin.addColorStop(0, '#d9a47c'); skin.addColorStop(1, '#8a5a40')
  ctx.fillStyle = skin
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.42, W * 0.16, H * 0.14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#2a1d18'
  ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.33, W * 0.17, H * 0.085, 0, Math.PI, 0); ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, W, H)
}

export function CaptionFrame({ templateId, text, activeWord = 1, width = 270, height = 480, y = 0.78, className = '' }: {
  templateId: string; text: string; activeWord?: number; width?: number; height?: number; y?: number; className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const t = templateById(templateId)
    const c = ref.current
    if (!t || !c) return
    let dead = false
    const toks = text.split(/\s+/)
    const cap: Caption = { id: 'demo', start: 0, end: toks.length, text, x: 0.5, y, words: toks.map((w, i) => ({ t: w.replace(/\*/g, ''), s: i, e: i + 1 })) }
    const draw = () => {
      if (dead) return
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      paintScene(ctx, c.width, c.height)
      drawCaption(ctx, c.width, c.height, cap, t.style, Math.min(activeWord, toks.length - 1) + 0.5)
    }
    draw()
    void ensureFonts([t.style]).then(draw)
    return () => { dead = true }
  }, [templateId, text, activeWord, y])
  return <canvas ref={ref} width={width * 2} height={height * 2} role="img" aria-label={`Example frame with the “${templateById(templateId)?.name ?? ''}” caption style: ${text.replace(/\*/g, '')}`} className={className} style={{ aspectRatio: `${width} / ${height}` }} />
}
