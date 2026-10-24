import { useEffect, useRef, useState } from 'react'
import type { OutputFormat } from '../types'
import { startProject } from '../lib/session'
import { navigate } from '../lib/router'
import { fmt } from '../lib/util'
import { parseBrief } from '../lib/draft/brief'

interface Probed { file: File; duration: number; w: number; h: number }
const FORMATS: { value: OutputFormat; label: string; sub: string; box: string }[] = [
  { value: '9:16', label: 'Vertical 9:16', sub: 'Shorts, Reels, TikTok', box: 'h-7 w-4' },
  { value: '1:1', label: 'Square 1:1', sub: 'Feed posts', box: 'h-5 w-5' },
  { value: '16:9', label: 'Landscape 16:9', sub: 'YouTube, web', box: 'h-4 w-7' },
]

/** Reads the video's metadata in a throwaway element so unsupported files are reported before leaving the page. */
function probe(file: File): Promise<Probed> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) return reject(new Error(`“${file.name}” is not a video file (${file.type || 'unknown type'}). Choose an MP4, WebM or MOV.`))
    const v = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = () => { v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url) }
    const timer = setTimeout(() => { done(); reject(new Error('Reading this video took too long. Try a smaller or different file.')) }, 15000)
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      clearTimeout(timer)
      const r = { file, duration: v.duration, w: v.videoWidth, h: v.videoHeight }
      done()
      if (!isFinite(r.duration) || !r.w) reject(new Error('This file loaded but has no usable video track or duration.'))
      else resolve(r)
    }
    v.onerror = () => { clearTimeout(timer); done(); reject(new Error('Your browser cannot decode this video. The codec may be unsupported (for example HEVC/H.265 or ProRes). Re-encode it as H.264 MP4 and try again.')) }
    v.src = url
  })
}

export function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const [media, setMedia] = useState<Probed | null>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [format, setFormat] = useState<OutputFormat>('9:16')
  const [starting, setStarting] = useState(false)
  const [drag, setDrag] = useState(false)
  const pick = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(document.activeElement)
  const goals = parseBrief(text)

  const choose = async (f: File) => {
    setError(null); setReading(true); setMedia(null)
    try {
      const m = await probe(f)
      setMedia(m)
      setName((n) => n || f.name.replace(/\.[^.]+$/, ''))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setReading(false) }
  }

  // modal behaviour: focus in, Esc closes, Tab stays inside, focus returns to the opener
  useEffect(() => {
    const prev = opener.current as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !starting) { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const f = [...panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea,select')].filter((x) => x.offsetParent !== null)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.() }
  }, [onClose, starting])

  const go = async () => {
    if (!media || starting) return
    setStarting(true)
    await startProject(media.file, { name: name.trim() || media.file.name.replace(/\.[^.]+$/, ''), text: text.trim(), format })
    navigate('/editor')
  }

  const field = 'w-full rounded-md border border-white/10 bg-graphite px-3 py-2 text-[15px] text-bone placeholder:text-bone-dim/60 hover:border-white/20 focus:border-accent-400 focus:outline-none'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget && !starting) onClose() }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="np-title" className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl border border-white/10 bg-charcoal shadow-2xl sm:max-h-[92dvh] sm:rounded-xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <div>
            <h2 id="np-title" className="font-title text-xl font-bold text-bone">Start a new project</h2>
            <p className="mt-1 text-sm text-bone-dim">Your video stays in this browser. Nothing is uploaded.</p>
          </div>
          <button onClick={onClose} disabled={starting} aria-label="Close" className="rounded-md px-2 py-1 text-bone-dim hover:bg-white/5 hover:text-bone disabled:opacity-40">✕</button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-bone">1. Footage</span>
            <input ref={pick} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void choose(f); e.target.value = '' }} />
            <button type="button" data-autofocus onClick={() => pick.current?.click()} disabled={starting}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void choose(f) }}
              className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${drag ? 'border-accent-400 bg-accent-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/[0.03]'}`}>
              {reading ? <span className="text-sm text-bone-dim" role="status">Reading video…</span>
                : media ? (<>
                  <span className="max-w-full truncate text-[15px] font-medium text-bone">{media.file.name}</span>
                  <span className="mt-1 text-sm tabular-nums text-bone-dim">{fmt(media.duration)} · {media.w}×{media.h} · {(media.file.size / 1e6).toFixed(1)} MB</span>
                  <span className="mt-2 text-xs text-accent-300">Choose a different video</span>
                </>) : (<>
                  <span className="text-[15px] font-medium text-bone">Choose a video or drop it here</span>
                  <span className="mt-1 text-sm text-bone-dim">MP4, WebM or MOV your browser can play</span>
                </>)}
            </button>
            {error && <p role="alert" className="mt-2 rounded-md border border-red-400/30 bg-red-950/70 px-3 py-2 text-sm text-red-100">{error}</p>}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bone">2. Project name</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled project" disabled={starting} />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bone">3. Describe the edit you want</span>
            <textarea className={`${field} min-h-24 resize-y`} value={text} onChange={(e) => setText(e.target.value)} disabled={starting}
              placeholder="Example: A 45-second short about the pricing mistake, strongest hook first, remove long pauses." />
            <span className="mt-1.5 block text-xs leading-relaxed text-bone-dim" aria-live="polite">
              {goals.notes.length ? `CutPilot picked up: ${goals.notes.map((n) => n.label.toLowerCase()).join('; ')}.` : 'Optional. Mention a length, a hook, removing pauses or captions and CutPilot will use them. You can refine this later.'}
            </span>
          </label>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-bone">4. Output format</legend>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Output format">
              {FORMATS.map((f) => (
                <label key={f.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-400 ${format === f.value ? 'border-accent-400 bg-accent-500/10' : 'border-white/10 hover:border-white/25'}`}>
                  <input type="radio" name="format" className="sr-only" checked={format === f.value} onChange={() => setFormat(f.value)} disabled={starting} />
                  <span className="grid h-8 w-8 shrink-0 place-items-center"><span className={`${f.box} rounded-[3px] border-2 ${format === f.value ? 'border-accent-300' : 'border-bone-dim'}`} /></span>
                  <span><span className="block text-sm text-bone">{f.label}</span><span className="block text-xs text-bone-dim">{f.sub}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-white/[0.07] bg-graphite px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-bone-dim sm:max-w-[34ch]">Starting a project replaces the one kept in this browser.</p>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={starting} className="h-10 rounded-md border border-white/15 px-4 text-sm text-bone hover:bg-white/5 disabled:opacity-40">Cancel</button>
            <button onClick={() => void go()} disabled={!media || starting} className="h-10 flex-1 rounded-md bg-accent-500 px-5 text-sm font-semibold text-white hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none">
              {starting ? 'Opening the editor…' : 'Continue to the editor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
