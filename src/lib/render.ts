import type { Caption, CaptionStyle } from '../types'
import { FONT_META } from '../types'
import { autoKeywords, hasEmoji } from './captions'

export interface Box { x: number; y: number; w: number; h: number }

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3)
const easeOutBack = (k: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2) }
const EMOJI_STACK = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji"'

const stack = (font: string) => {
  const m = FONT_META[font]
  const fb = m?.serif ? 'Georgia,"Times New Roman",serif' : m && m.weights.length === 1 ? 'Impact,"Arial Black",sans-serif' : 'Arial,"Segoe UI",sans-serif'
  return `"${font}",${fb},${EMOJI_STACK}`
}

const contrast = (hex: string) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6 ? '#0a0b0e' : '#ffffff'
}

/**
 * Draws one caption. This single function is used by the live preview, the template thumbnails and the
 * exporter, so styles and animations are rendered by the same code in all three places. All sizes scale with H/1080.
 * `t` is the video time in seconds; animations are pure functions of t, so they replay identically on export.
 */
export function drawCaption(ctx: CanvasRenderingContext2D, W: number, H: number, cap: Caption, st: CaptionStyle, t: number): Box {
  const empty: Box = { x: 0, y: 0, w: 0, h: 0 }
  const s = H / 1080
  const px = st.size * s

  // tokens + keywords (manual *markers* always win over automatic detection)
  const raw: { w: string; kw: boolean }[] = []
  let inKw = false
  for (const r of cap.text.split(/\s+/).filter(Boolean)) {
    let w = r
    if (w.startsWith('*')) { inKw = true; w = w.replace(/^\*+/, '') }
    const kw = inKw
    if (w.endsWith('*')) { inKw = false; w = w.replace(/\*+$/, '') }
    if (w) raw.push({ w, kw })
  }
  if (!raw.length) return empty
  const kwIdx = cap.text.includes('*')
    ? new Set(raw.flatMap((r, i) => (r.kw ? [i] : [])))
    : st.autoEmphasis ? autoKeywords(raw.map((r) => r.w)) : new Set<number>()
  const words = raw.map((r) => (st.uppercase ? r.w.toUpperCase() : r.w))
  const n = words.length
  const kwStyled = !!st.kwFont || st.kwItalic || st.kwScale !== 1 || st.kwWeight !== 0
  const useKw = (i: number) => kwStyled && kwIdx.has(i)

  const baseFont = `${st.weight} ${px}px ${stack(st.font)}`
  const kwFace = `${st.kwItalic ? 'italic ' : ''}${st.kwWeight || st.weight} ${px * st.kwScale}px ${stack(st.kwFont || st.font)}`

  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.lineJoin = 'round'
  const lsCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in ctx) lsCtx.letterSpacing = `${st.letterSpacing * px}px`

  ctx.font = baseFont
  const space = ctx.measureText(' ').width
  const widths = words.map((w, i) => { ctx.font = useKw(i) ? kwFace : baseFont; return ctx.measureText(w).width })

  // wrap
  const maxW = W * 0.86
  const lines: number[][] = [[]]
  const lineW: number[] = [0]
  words.forEach((_, i) => {
    const li = lines.length - 1
    const add = (lines[li].length ? space : 0) + widths[i]
    if (lineW[li] + add > maxW && lines[li].length) { lines.push([i]); lineW.push(widths[i]) } else { lines[li].push(i); lineW[li] += add }
  })
  const lineH = lines.map((idxs) => px * 1.22 * Math.max(1, ...idxs.map((i) => (useKw(i) ? st.kwScale : 1))))

  // word start times: measured when the caption has matching word timing, otherwise spread by letter count
  const wS: number[] = []
  if (cap.words && cap.words.length === n) cap.words.forEach((w) => wS.push(w.s))
  else {
    const total = words.reduce((a, w) => a + w.length + 1, 0)
    const dur = Math.max(cap.end - cap.start, 0.01)
    let acc = 0
    words.forEach((w) => { wS.push(cap.start + (dur * acc) / total); acc += w.length + 1 })
  }
  let active = -1
  if (st.wordHighlight || st.animation === 'pop' || st.animation === 'karaoke') {
    active = 0
    for (let i = 0; i < n; i++) if (t >= wS[i]) active = i
  }

  // caption-level animation
  const spd = Math.max(0.25, st.animSpeed), I = st.animIntensity
  const e = clamp01((t - cap.start) / (0.22 / spd))
  const f = clamp01((cap.end - t) / (0.14 / spd))
  let alpha = 1, dy = 0, sc = 1
  if (st.animation === 'fade') alpha = Math.min(easeOutCubic(e), f)
  else if (st.animation === 'slide') { alpha = Math.min(1, e * 2); dy = (1 - easeOutCubic(e)) * px * (0.4 + I) }
  else if (st.animation === 'bounce') { alpha = Math.min(1, e * 3); sc = 1 - (1 - easeOutBack(e)) * (0.25 + 0.5 * I) }

  const totalH = lineH.reduce((a, b) => a + b, 0)
  const blockW = Math.max(...lineW)
  const cx = cap.x * W, cy = cap.y * H
  const top = cy - totalH / 2
  const pad = px * st.bgPad
  const box: Box = { x: cx - blockW / 2 - pad, y: top - pad, w: blockW + pad * 2, h: totalH + pad * 2 }

  ctx.translate(cx, cy + dy)
  ctx.scale(sc, sc)
  ctx.translate(-cx, -cy)

  if (st.bgOpacity > 0) {
    ctx.globalAlpha = alpha * st.bgOpacity
    ctx.fillStyle = st.bgColor
    ctx.beginPath()
    ctx.roundRect(box.x, box.y, box.w, box.h, px * st.bgRadius)
    ctx.fill()
  }
  ctx.globalAlpha = alpha

  const shadow = (on: boolean) => {
    if (on && st.shadow > 0) { ctx.shadowColor = 'rgba(0,0,0,0.72)'; ctx.shadowBlur = st.shadow * s * 1.6; ctx.shadowOffsetY = st.shadow * s * 0.7 }
    else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0 }
  }

  let lineTop = top
  lines.forEach((idxs, li) => {
    const lh = lineH[li]
    const center = lineTop + lh / 2
    const baseline = center + px * 0.35
    let x = st.align === 'left' ? cx - blockW / 2 : st.align === 'right' ? cx + blockW / 2 - lineW[li] : cx - lineW[li] / 2
    for (const i of idxs) {
      ctx.font = useKw(i) ? kwFace : baseFont
      const isKw = kwIdx.has(i)
      const isActive = i === active
      const actBox = isActive && st.wordHighlight && st.highlightBox
      const boxed = actBox || (st.kwBox && isKw)
      const hl = (isKw && !st.kwBox) || (isActive && st.wordHighlight && !st.highlightBox) || (st.animation === 'karaoke' && i <= active)
      const color = boxed ? contrast(st.highlightColor) : hl ? st.highlightColor : st.color
      const emoji = hasEmoji(words[i])

      ctx.save()
      if (st.animation === 'pop' && isActive) {
        const k = clamp01((t - wS[i]) / (0.24 / spd))
        const ps = 1 + (0.12 + 0.3 * I) * Math.pow(1 - k, 2)
        ctx.translate(x + widths[i] / 2, center)
        ctx.scale(ps, ps)
        ctx.translate(-(x + widths[i] / 2), -center)
      }
      if (boxed) {
        ctx.fillStyle = st.highlightColor
        ctx.beginPath()
        ctx.roundRect(x - px * 0.16, center - lh * 0.46, widths[i] + px * 0.32, lh * 0.92, px * 0.2)
        ctx.fill()
      }
      if (st.glow > 0 && !boxed) {
        ctx.shadowColor = st.glowColor
        ctx.shadowBlur = st.glow * s * 1.5
        ctx.shadowOffsetY = 0
        ctx.fillStyle = color
        ctx.fillText(words[i], x, baseline)
        ctx.fillText(words[i], x, baseline)
      }
      ctx.fillStyle = color
      if (st.outlineWidth > 0 && !boxed && !emoji) {
        ctx.strokeStyle = st.outlineColor
        ctx.lineWidth = st.outlineWidth * s * 2
        shadow(true)
        ctx.strokeText(words[i], x, baseline)
        shadow(false)
        ctx.fillText(words[i], x, baseline)
      } else {
        shadow(!boxed && st.bgOpacity === 0)
        ctx.fillText(words[i], x, baseline)
        shadow(false)
      }
      ctx.restore()
      x += widths[i] + space
    }
    lineTop += lh
  })
  ctx.restore()
  return box
}
