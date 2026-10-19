import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Caption, Trim } from '../types'
import { clamp, fmt } from '../lib/util'

interface Props {
  duration: number
  time: number
  trim: Trim
  captions: Caption[]
  selId: string | null
  disabled: boolean
  label: string
  url: string | null
  onSeek: (t: number) => void
  onTrim: (t: Trim) => void
  onSelect: (id: string) => void
  onUpdate: (id: string, p: Partial<Caption>) => void
}

const STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600]
const MAX_ZOOM = 64

/** Filmstrip frames from a second, muted <video>; at most 40, generated one at a time so the UI never blocks. */
function useFilmstrip(url: string | null, duration: number) {
  const n = useMemo(() => Math.min(40, Math.max(6, Math.ceil(duration / 2))), [duration])
  const [thumbs, setThumbs] = useState<string[]>([])
  useEffect(() => {
    setThumbs([])
    if (!url || !duration) return
    let dead = false
    const made: string[] = []
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'auto'
    v.playsInline = true
    v.src = url
    const run = async () => {
      await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('thumbs')) })
      const c = document.createElement('canvas')
      c.height = 64
      c.width = Math.max(2, Math.round((64 * v.videoWidth) / v.videoHeight))
      const ctx = c.getContext('2d')!
      for (let i = 0; i < n && !dead; i++) {
        await new Promise<void>((r) => { const to = setTimeout(r, 2500); v.onseeked = () => { clearTimeout(to); r() }; v.currentTime = Math.min(((i + 0.5) * duration) / n, duration - 0.05) })
        ctx.drawImage(v, 0, 0, c.width, c.height)
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.6))
        if (!blob || dead) break
        made.push(URL.createObjectURL(blob))
        if (i % 3 === 2 || i === n - 1) setThumbs([...made])
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    run().catch(() => undefined)
    return () => { dead = true; v.removeAttribute('src'); v.load(); made.forEach((u) => URL.revokeObjectURL(u)) }
  }, [url, duration, n])
  return { thumbs, n }
}

/** Fixed-height timeline: filmstrip video track with trim handles, caption track, zoom + horizontal scroll, snapping. */
export function Timeline({ duration, time, trim, captions, selId, disabled, label, url, onSeek, onTrim, onSelect, onUpdate }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const anchor = useRef<{ t: number; px: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [viewW, setViewW] = useState(600)
  const [snapAt, setSnapAt] = useState<number | null>(null)
  const { thumbs, n } = useFilmstrip(url, duration)

  const fullW = viewW * zoom
  const pxPerSec = duration ? fullW / duration : 1
  const pct = (t: number) => (duration ? (t / duration) * 100 : 0)
  const step = STEPS.find((s) => s * pxPerSec >= 80) ?? 3600
  const ticks = Array.from({ length: duration ? Math.floor(duration / step) + 1 : 0 }, (_, i) => +(i * step).toFixed(3))

  useEffect(() => {
    const el = scroller.current!
    const ro = new ResizeObserver(([e]) => setViewW(Math.max(200, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const zoomTo = (z: number, t: number, px: number) => { anchor.current = { t, px }; setZoom(clamp(z, 1, MAX_ZOOM)) }
  useLayoutEffect(() => {
    const a = anchor.current
    if (a && scroller.current && duration) { scroller.current.scrollLeft = (a.t / duration) * viewW * zoom - a.px; anchor.current = null }
  }, [zoom, viewW, duration])

  // Ctrl/Cmd + wheel zooms around the cursor; plain wheel scrolls sideways only while zoomed in (page itself never scrolls).
  const wheelState = useRef({ zoom, viewW, duration })
  wheelState.current = { zoom, viewW, duration }
  useEffect(() => {
    const el = scroller.current!
    const onWheel = (e: WheelEvent) => {
      const w = wheelState.current
      if (!w.duration) return
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const px = e.clientX - el.getBoundingClientRect().left
        zoomTo(w.zoom * (e.deltaY < 0 ? 1.25 : 0.8), ((el.scrollLeft + px) / (w.viewW * w.zoom)) * w.duration, px)
      } else if (w.zoom > 1 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // keep the playhead in view
  useEffect(() => {
    const el = scroller.current
    if (!el || zoom <= 1 || !duration) return
    const x = (time / duration) * fullW
    if (x < el.scrollLeft + 16 || x > el.scrollLeft + viewW - 40) el.scrollLeft = x - viewW * 0.25
  }, [time, zoom, duration, fullW, viewW])

  const zoomBtn = (f: number) => zoomTo(zoom * f, time, clamp((time / (duration || 1)) * fullW - (scroller.current?.scrollLeft ?? 0), 20, viewW - 20))

  const tAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    return clamp((clientX - r.left) / r.width, 0, 1) * duration
  }
  const cands = (ex?: string) => [0, duration, time, trim.start, trim.end, ...captions.filter((c) => c.id !== ex).flatMap((c) => [c.start, c.end])]
  /** Snap to the nearest boundary within ~9 px. Hold Alt to disable. */
  const snap = (t: number, skip: number[], alt: boolean, ex?: string) => {
    if (alt) return { t, hit: null as number | null }
    let best = t, hit: number | null = null, bd = 9 / pxPerSec
    for (const c of cands(ex)) {
      if (skip.some((x) => Math.abs(x - c) < 1e-6)) continue
      const d = Math.abs(c - t)
      if (d < bd) { bd = d; best = c; hit = c }
    }
    return { t: best, hit }
  }
  const listen = (mv: (e: PointerEvent) => void, done?: () => void) => {
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); setSnapAt(null); done?.() }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }

  const dragHandle = (kind: 'start' | 'end' | 'head') => (e: React.PointerEvent) => {
    if (disabled) return
    e.stopPropagation()
    e.preventDefault()
    const apply = (x: number, alt: boolean) => {
      const sn = snap(tAt(x), kind === 'start' ? [trim.start] : kind === 'end' ? [trim.end] : [time], alt)
      setSnapAt(sn.hit)
      if (kind === 'head') onSeek(sn.t)
      else if (kind === 'start') onTrim({ start: Math.min(sn.t, trim.end - 0.1), end: trim.end })
      else onTrim({ start: trim.start, end: Math.max(sn.t, trim.start + 0.1) })
    }
    listen((ev) => apply(ev.clientX, ev.altKey))
    apply(e.clientX, e.altKey)
  }

  const dragCaption = (c: Caption, mode: 'move' | 'l' | 'r') => (e: React.PointerEvent) => {
    if (disabled) return
    e.stopPropagation()
    e.preventDefault()
    onSelect(c.id)
    const x0 = e.clientX
    const s0 = c.start, e0 = c.end, len = e0 - s0
    let moved = false
    listen((ev) => {
      if (Math.abs(ev.clientX - x0) > 3) moved = true
      const d = (ev.clientX - x0) / pxPerSec
      if (mode === 'move') {
        const a = snap(s0 + d, [], ev.altKey, c.id), b = snap(e0 + d, [], ev.altKey, c.id)
        let ns = s0 + d, hit: number | null = null
        if (a.hit !== null && (b.hit === null || Math.abs(a.t - (s0 + d)) <= Math.abs(b.t - (e0 + d)))) { ns = a.t; hit = a.hit }
        else if (b.hit !== null) { ns = b.t - len; hit = b.hit }
        setSnapAt(hit)
        ns = clamp(ns, 0, Math.max(0, duration - len))
        onUpdate(c.id, { start: ns, end: ns + len })
      } else if (mode === 'l') {
        const sn = snap(s0 + d, [s0], ev.altKey, c.id); setSnapAt(sn.hit)
        onUpdate(c.id, { start: clamp(sn.t, 0, e0 - 0.2) })
      } else {
        const sn = snap(e0 + d, [e0], ev.altKey, c.id); setSnapAt(sn.hit)
        onUpdate(c.id, { end: clamp(sn.t, s0 + 0.2, duration) })
      }
    }, () => { if (!moved) onSeek(c.start) })
  }

  const zb = 'grid h-5 place-items-center rounded text-[13px] leading-none text-mute transition-colors hover:bg-ink-700 hover:text-fg disabled:opacity-40'
  return (
    <div className={`h-[176px] shrink-0 select-none border-t border-line bg-ink-900 px-4 pb-1 pt-2 ${disabled ? 'opacity-60' : ''}`}>
      <div className="grid h-full grid-cols-[56px_minmax(0,1fr)] gap-x-3">
        <div className="flex flex-col">
          <div className="flex h-5 items-center gap-0.5">
            <button className={`${zb} w-4`} title="Zoom out (Ctrl + scroll)" aria-label="Zoom out" disabled={disabled || zoom <= 1} onClick={() => zoomBtn(0.8)}>−</button>
            <button className={`${zb} w-4`} title="Zoom in (Ctrl + scroll)" aria-label="Zoom in" disabled={disabled || zoom >= MAX_ZOOM} onClick={() => zoomBtn(1.25)}>+</button>
            <button className={`${zb} w-6 text-[10px]`} title="Fit whole video" aria-label="Fit timeline" disabled={disabled || zoom === 1} onClick={() => zoomTo(1, 0, 0)}>Fit</button>
          </div>
          <span className="mt-1.5 flex h-14 items-center text-xs text-mute">Video</span>
          <span className="mt-1.5 flex h-8 items-center text-xs text-mute">Captions</span>
        </div>

        <div ref={scroller} className="overflow-x-auto overflow-y-hidden">
          <div ref={track} className="relative" style={{ width: `${zoom * 100}%` }}>
            <div className="relative h-5 cursor-pointer text-[10px] text-dim" onPointerDown={dragHandle('head')}>
              {ticks.map((t) => (
                <span key={t} className="absolute top-0.5 -translate-x-1/2 tabular-nums" style={{ left: `${pct(t)}%` }}>
                  {step < 1 ? fmt(t) : fmt(t).replace(/\.\d+$/, '')}
                </span>
              ))}
            </div>
            <div className="relative mt-1.5 cursor-text" onPointerDown={dragHandle('head')}>
              <div className="relative h-14 overflow-hidden rounded-md border border-line bg-ink-850">
                {thumbs.map((src, i) => (
                  <img key={i} src={src} alt="" draggable={false} className="pointer-events-none absolute inset-y-0 h-full object-cover opacity-80"
                    style={{ left: `${(i / n) * 100}%`, width: `${100 / n}%` }} />
                ))}
                <div className="absolute inset-y-0 bg-accent-500/15" style={{ left: `${pct(trim.start)}%`, width: `${pct(trim.end - trim.start)}%` }} />
                <div className="absolute inset-y-0 bg-black/60" style={{ left: 0, width: `${pct(trim.start)}%` }} />
                <div className="absolute inset-y-0 bg-black/60" style={{ right: 0, width: `${100 - pct(trim.end)}%` }} />
                <div className="absolute inset-y-0 border-y-2 border-accent-400/80" style={{ left: `${pct(trim.start)}%`, width: `${pct(trim.end - trim.start)}%` }} />
                {!thumbs.length && <span className="pointer-events-none absolute left-3 top-1/2 max-w-[60%] -translate-y-1/2 truncate text-[11px] text-mute">{label}</span>}
              </div>
              <div className="relative mt-1.5 h-8 rounded-md bg-ink-850">
                {captions.map((c) => (
                  <div key={c.id} title={c.text.replace(/\*/g, '')} onPointerDown={dragCaption(c, 'move')}
                    className={`absolute inset-y-1 cursor-grab overflow-hidden whitespace-nowrap rounded px-2 text-[11px] leading-6 transition-colors ${c.id === selId ? 'bg-accent-500 text-white' : 'bg-ink-600 text-fg hover:bg-ink-700'}`}
                    style={{ left: `${pct(c.start)}%`, width: `${Math.max(pct(c.end - c.start), 0.3)}%` }}>
                    <span onPointerDown={dragCaption(c, 'l')} className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize hover:bg-white/40" />
                    {c.text.replace(/\*/g, '')}
                    <span onPointerDown={dragCaption(c, 'r')} className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize hover:bg-white/40" />
                  </div>
                ))}
                {!captions.length && <span className="pointer-events-none sticky left-0 grid h-full w-full max-w-[420px] place-items-center text-[11px] text-dim">Captions you add appear here</span>}
              </div>

              {(['start', 'end'] as const).map((k) => (
                <div key={k} role="slider" aria-label={k === 'start' ? 'Trim start' : 'Trim end'} aria-valuenow={trim[k]} title={k === 'start' ? 'Drag to set trim start' : 'Drag to set trim end'}
                  onPointerDown={dragHandle(k)}
                  className="absolute -top-0.5 z-10 grid h-[60px] w-3 -translate-x-1/2 cursor-ew-resize place-items-center rounded-[3px] bg-accent-400 transition-colors hover:bg-accent-300"
                  style={{ left: `${pct(trim[k])}%` }}>
                  <span className="h-5 w-px bg-ink-950/60" />
                </div>
              ))}
              {snapAt !== null && <div className="pointer-events-none absolute -top-6 bottom-0 z-10 w-px bg-accent-300" style={{ left: `${pct(snapAt)}%` }} />}
              <div className="pointer-events-none absolute -top-6 bottom-0 z-20 w-px bg-white" style={{ left: `${pct(time)}%` }}>
                <span className="absolute -left-[5px] -top-0.5 h-2.5 w-2.5 rounded-sm bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
