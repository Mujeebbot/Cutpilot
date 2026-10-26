import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Animation, Aspect, CanvasSettings, Caption, CaptionStyle, Tool } from '../types'
import { FONTS, FONT_META, nearestWeight } from '../types'
import { CATEGORIES, TEMPLATES, matchesCategory, templateById } from '../lib/templates'
import type { Category, Template } from '../lib/templates'
import { drawCaption } from '../lib/render'
import { suggestEmojis } from '../lib/captions'
import { MODELS } from '../lib/transcribe'
import { fmt } from '../lib/util'
import { btn, btnDanger, btnPrimary, ColorField, Field, input, Section, Segmented, Slider, Toggle } from './ui'
import { Icon } from './icons'
import type { IconName } from './icons'

function Empty({ icon, title, text, children }: { icon: IconName; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-ink-850/50 px-5 py-7 text-center">
      <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl border border-accent-500/30 bg-accent-500/10 text-accent-300 shadow-[0_0_15px_rgba(139,124,246,0.15)]"><Icon name={icon} size={20} /></span>
      <p className="font-display text-sm font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-relaxed text-mute">{text}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

export interface Recoverable { videoName: string | null; savedAt: number; count: number }

export function RecoverCard({ info, onRestore, onDiscard }: { info: Recoverable; onRestore: () => void; onDiscard: () => void }) {
  return (
    <div className="rounded-lg border border-accent-500/40 bg-accent-500/10 p-3 text-left">
      <p className="font-display text-sm font-semibold text-fg">Recover your last session?</p>
      <p className="mt-1 text-xs leading-relaxed text-mute">
        {info.count} caption{info.count === 1 ? '' : 's'}{info.videoName ? ` for “${info.videoName}”` : ''}, autosaved {new Date(info.savedAt).toLocaleString()}. The video file isn't stored — re-open it after restoring.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button className={btnPrimary} onClick={onRestore}>Restore</button>
        <button className={btn} onClick={onDiscard}>Discard</button>
      </div>
    </div>
  )
}

/* ---------------- Media ---------------- */
const ASPECTS: { value: Aspect; label: string }[] = [
  { value: 'source', label: 'Original' }, { value: '9:16', label: '9:16' }, { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' },
]

export function MediaPanel(p: {
  file: File | null; dims: { w: number; h: number }; duration: number; selection: number; canvas: CanvasSettings; outSize: { w: number; h: number }
  recover: Recoverable | null; onRestore: () => void; onDiscard: () => void
  onCanvas: (c: Partial<CanvasSettings>) => void; onOpen: () => void; onSaveProject: () => void; onLoadProject: () => void
}) {
  return (
    <div className="space-y-5">
      {p.recover && <RecoverCard info={p.recover} onRestore={p.onRestore} onDiscard={p.onDiscard} />}
      <Section title="Video">
        {p.file ? (
          <div className="rounded-lg border border-line bg-ink-850 p-3">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink-700 text-accent-400"><Icon name="film" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm text-fg" title={p.file.name}>{p.file.name}</p>
                <p className="mt-0.5 text-xs tabular-nums text-mute">{p.dims.w}×{p.dims.h} · {fmt(p.duration)} · {(p.file.size / 1e6).toFixed(1)} MB</p>
                <p className="mt-0.5 text-xs tabular-nums text-mute">Selected for export: <span className="text-fg">{fmt(p.selection)}</span></p>
              </div>
            </div>
            <button className={`${btn} mt-3 w-full`} onClick={p.onOpen}><Icon name="upload" size={15} />Replace video</button>
          </div>
        ) : (
          <Empty icon="upload" title="No video yet" text="Open a video from your computer. It stays on this device — nothing is uploaded.">
            <button className={btnPrimary} onClick={p.onOpen}><Icon name="upload" size={15} />Open video</button>
          </Empty>
        )}
      </Section>

      <Section title="Canvas">
        <Segmented label="Canvas aspect ratio" value={p.canvas.aspect} options={ASPECTS} onChange={(aspect) => p.onCanvas({ aspect })} />
        <p className="text-[11px] leading-relaxed text-dim">
          Preview and export both use this canvas: <span className="tabular-nums text-mute">{p.outSize.w}×{p.outSize.h}</span>. Captions are positioned relative to it.
        </p>
        {p.canvas.aspect !== 'source' && (
          <>
            <Segmented label="Background" value={p.canvas.bgMode} options={[{ value: 'blur', label: 'Soft blur' }, { value: 'solid', label: 'Solid' }]} onChange={(bgMode) => p.onCanvas({ bgMode })} />
            {p.canvas.bgMode === 'solid' && <ColorField label="Background colour" value={p.canvas.bgColor} onChange={(bgColor) => p.onCanvas({ bgColor })} />}
          </>
        )}
      </Section>

      <Section title="Project">
        <p className="text-xs leading-relaxed text-mute">Edits are autosaved in this browser (captions, style, trim, canvas — never the video). A project file is a portable backup.</p>
        <div className="grid grid-cols-2 gap-2">
          <button className={btn} onClick={p.onSaveProject}><Icon name="save" size={15} />Save project</button>
          <button className={btn} onClick={p.onLoadProject}><Icon name="folder" size={15} />Load project</button>
        </div>
      </Section>
      <div className="flex gap-2.5 rounded-lg border border-line bg-ink-850 p-3 text-xs leading-relaxed text-mute">
        <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-accent-400" />
        <p>Autosave lives in this browser's storage and can be cleared by the browser. Save a project file for anything important.</p>
      </div>
    </div>
  )
}

/* ---------------- Captions ---------------- */
interface CapProps {
  captions: Caption[]; selId: string | null; time: number; hasVideo: boolean
  density: number; suggestedWords: number | null
  onSelect: (id: string | null) => void; onAdd: () => void
  onUpdate: (id: string, p: Partial<Caption>) => void; onDelete: (id: string) => void; onClear: () => void
  onDensity: (n: number) => void
  onApplyEmojis: (items: { id: string; emoji: string }[]) => void
  onImportText: (t: string) => void; onImportSrt: (f: File) => void; onDownloadSrt: () => void
  onSeek: (t: number) => void; onGoto: (t: Tool) => void
}

export function CaptionsPanel(p: CapProps) {
  const [showImport, setShowImport] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const sel = p.captions.find((c) => c.id === p.selId)
  const sorted = [...p.captions].sort((a, b) => a.start - b.start)
  const emojis = useMemo(() => (showEmoji ? suggestEmojis(p.captions) : []), [showEmoji, p.captions])

  const toggleKeyword = () => {
    const ta = taRef.current
    if (!ta || !sel) return
    let a = ta.selectionStart, b = ta.selectionEnd
    if (a === b) {
      const t = sel.text
      while (a > 0 && !/\s/.test(t[a - 1])) a--
      while (b < t.length && !/\s/.test(t[b])) b++
    }
    const piece = sel.text.slice(a, b)
    if (!piece.trim()) return
    const wrapped = /^\*[^*]+\*$/.test(piece) ? piece.slice(1, -1) : `*${piece.replace(/\*/g, '')}*`
    p.onUpdate(sel.id, { text: sel.text.slice(0, a) + wrapped + sel.text.slice(b) })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} onClick={p.onAdd} disabled={!p.hasVideo} title="Add a caption at the playhead"><Icon name="plus" size={15} />Add caption</button>
        <button className={btn} onClick={() => setShowImport((v) => !v)}><Icon name="upload" size={15} />Import</button>
        <button className={btn} onClick={p.onDownloadSrt} disabled={!p.captions.length} title="Download captions as .srt"><Icon name="download" size={15} />.srt</button>
      </div>

      {showImport && (
        <div className="space-y-2 rounded-lg border border-line bg-ink-850 p-3">
          <textarea className={`${input} min-h-[96px] resize-y font-mono text-xs`} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Paste SRT, or plain text (one caption per line).\nPlain text is spaced evenly across your trim.'} />
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={!text.trim() || !p.hasVideo} onClick={() => { p.onImportText(text); setText(''); setShowImport(false) }}>Import</button>
            <button className={btn} onClick={() => fileRef.current?.click()}>Open .srt file</button>
            <input ref={fileRef} type="file" accept=".srt,text/plain" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onImportSrt(f); e.target.value = '' }} />
          </div>
          {!p.hasVideo && <p className="text-[11px] text-dim">Open a video first so captions can be timed to it.</p>}
        </div>
      )}

      <Section title="Words per caption">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Segmented
                label="Words per caption"
                value={[1, 2, 3].includes(p.density) ? p.density : 0}
                options={[
                  { value: 1, label: '1 word' },
                  { value: 2, label: '2 words' },
                  { value: 3, label: '3 words' },
                  { value: 0, label: 'Custom' },
                ]}
                onChange={(v) => {
                  if (v === 0) p.onDensity(p.density > 3 ? p.density : 4)
                  else p.onDensity(v)
                }}
              />
            </div>
            {(![1, 2, 3].includes(p.density) || p.density > 3) && (
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={p.density}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val)) p.onDensity(Math.max(1, Math.min(10, val)))
                  }}
                  className="w-14 rounded-md border border-line bg-ink-800 px-2 py-1 text-center text-xs tabular-nums text-fg focus:border-accent-400 focus:outline-none"
                  aria-label="Custom words per caption (1 to 10)"
                />
                <span className="text-[11px] text-mute">words</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-dim">
          Applies to new transcriptions and regroups existing captions (you'll be asked first if that would change hand-edited ones; Ctrl+Z undoes it).
        </p>
        {p.suggestedWords && p.suggestedWords !== p.density && (
          <button className={`${btn} w-full`} onClick={() => p.onDensity(p.suggestedWords!)}>
            This template suggests {p.suggestedWords} word{p.suggestedWords > 1 ? 's' : ''} — use it
          </button>
        )}
      </Section>

      {sel && (
        <div className="space-y-3 rounded-lg border border-accent-500/40 bg-ink-850 p-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-[13px] font-semibold">Edit caption</span>
            <button className={`${btn} h-7 px-2`} onClick={toggleKeyword} title="Mark the selected word(s) as keywords"><Icon name="star" size={14} />Keyword</button>
          </div>
          <textarea ref={taRef} aria-label="Caption text" className={`${input} min-h-[64px] resize-y`} value={sel.text} onChange={(e) => p.onUpdate(sel.id, { text: e.target.value })} />
          <p className="text-[11px] leading-relaxed text-dim">Wrap words in *asterisks* to emphasise them. Manual marks override automatic emphasis for this caption.</p>
          <div className="grid grid-cols-2 gap-3">
            {(['start', 'end'] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Field label={k === 'start' ? 'Start (s)' : 'End (s)'}>
                  <input type="number" step={0.1} min={0} className={input} value={Number(sel[k].toFixed(2))}
                    onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) p.onUpdate(sel.id, { [k]: Math.max(0, v) }) }} />
                </Field>
                <button className={`${btn} h-7 w-full`} onClick={() => p.onUpdate(sel.id, { [k]: p.time })}>Use playhead</button>
              </div>
            ))}
          </div>
          <Slider label="Horizontal position" value={sel.x} min={0.05} max={0.95} step={0.01} onChange={(x) => p.onUpdate(sel.id, { x })} />
          <Slider label="Vertical position" value={sel.y} min={0.05} max={0.95} step={0.01} onChange={(y) => p.onUpdate(sel.id, { y })} />
          <button className={`${btnDanger} w-full`} onClick={() => p.onDelete(sel.id)}><Icon name="trash" size={15} />Delete caption</button>
        </div>
      )}

      {sorted.length === 0 ? (
        <Empty icon="captions" title="No captions yet" text="Add one at the playhead, import subtitles, or generate them from speech.">
          <button className={btn} onClick={() => setShowImport(true)} disabled={showImport}>Import SRT or text</button>
          <button className={btn} onClick={() => p.onGoto('ai')}><Icon name="sparkles" size={15} />AI Tools</button>
        </Empty>
      ) : (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-mute">{sorted.length} caption{sorted.length === 1 ? '' : 's'}</span>
            <span className="flex gap-3">
              <button className="text-xs text-mute transition-colors hover:text-fg" onClick={() => { setShowEmoji((v) => !v); setPicked(new Set()) }}>Emoji ideas</button>
              <button className="text-xs text-mute transition-colors hover:text-red-300" onClick={() => { if (confirm('Remove all captions?')) p.onClear() }}>Clear all</button>
            </span>
          </div>
          {showEmoji && (
            <div className="mb-3 space-y-2 rounded-lg border border-line bg-ink-850 p-3">
              {emojis.length === 0 ? <p className="text-xs text-mute">No emoji suggestions for these captions.</p> : (
                <>
                  <p className="text-[11px] text-dim">Suggestions only — nothing is added until you pick and confirm.</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {emojis.map((s) => (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-ink-800">
                          <input type="checkbox" checked={picked.has(s.id)} onChange={() => setPicked((cur) => { const n = new Set(cur); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n })} />
                          <span className="min-w-0 flex-1 truncate text-fg">{s.text}</span>
                          <span className="text-base leading-none">{s.emoji}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button className={btnPrimary} disabled={!picked.size}
                    onClick={() => { p.onApplyEmojis(emojis.filter((s) => picked.has(s.id)).map((s) => ({ id: s.id, emoji: s.emoji }))); setShowEmoji(false) }}>
                    Add {picked.size || ''} selected
                  </button>
                </>
              )}
            </div>
          )}
          <ul className="space-y-0.5">
            {sorted.map((c) => (
              <li key={c.id}>
                <button onClick={() => { p.onSelect(c.id); p.onSeek(c.start) }}
                  className={`flex w-full items-baseline gap-3 rounded-md px-2.5 py-1.5 text-left transition-colors ${c.id === p.selId ? 'bg-accent-500/15 text-white' : 'text-fg hover:bg-ink-800'}`}>
                  <span className="w-12 shrink-0 text-[11px] tabular-nums text-dim">{fmt(c.start)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.text.replace(/\*/g, '') || <em className="text-dim">empty</em>}</span>
                  {c.timing && <span className="shrink-0 text-[10px] text-dim" title={c.timing === 'word' ? 'Word timing measured by Whisper' : 'Word timing approximated within a segment'}>{c.timing === 'word' ? 'word timing' : '≈ approx'}</span>}
                  {c.style && <span className="shrink-0 text-[10px] text-accent-400" title="This caption has its own style">styled</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ---------------- Styles: template gallery + customise ---------------- */
function TemplateThumb({ t, tick, hover }: { t: Template; tick: number; hover: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cap = useMemo<Caption>(() => ({ id: 'sample', start: 0, end: 1.8, text: t.sample, x: 0.5, y: 0.5 }), [t])
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const paint = (time: number) => { ctx.clearRect(0, 0, c.width, c.height); drawCaption(ctx, c.width, c.height, cap, t.style, time) }
    if (!hover) { paint(1.0); return }
    let id = 0
    const t0 = performance.now()
    const loop = (now: number) => { paint(((now - t0) / 1000) % 2.4); id = requestAnimationFrame(loop) }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [t, tick, hover, cap])
  return <canvas ref={ref} width={400} height={225} className="block h-auto w-full" />
}

function TemplateCard({ t, selected, tick, onApply }: { t: Template; selected: boolean; tick: number; onApply: () => void }) {
  const [hover, setHover] = useState(false)
  const [replaying, setReplaying] = useState(false)
  const isHovered = hover || replaying

  const triggerReplay = (e: React.MouseEvent) => {
    e.stopPropagation()
    setReplaying(true)
    setTimeout(() => setReplaying(false), 2400)
  }

  return (
    <div className={`group relative overflow-hidden rounded-lg border text-left transition-colors ${selected ? 'border-accent-500 bg-accent-500/10' : 'border-line bg-ink-850 hover:border-white/20'}`}>
      <button type="button" onClick={onApply} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
        aria-pressed={selected} title={`${t.name} — ${t.blurb}`} className="block w-full text-left">
        <div className="bg-[radial-gradient(ellipse_at_50%_40%,#2a2d38_0%,#14151a_80%)]"><TemplateThumb t={t} tick={tick} hover={isHovered} /></div>
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="min-w-0 truncate text-xs text-fg">{t.name}</span>
          <span className="shrink-0 text-[10px] text-dim">{t.words} word{t.words > 1 ? 's' : ''}</span>
        </div>
      </button>
      {selected && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
          <button type="button" onClick={triggerReplay} title="Replay animation" aria-label="Replay animation"
            className="grid h-5 w-5 place-items-center rounded-full bg-ink-900/90 text-white/80 shadow transition-colors hover:bg-ink-800 hover:text-white">
            <Icon name="play" size={10} />
          </button>
          <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-white shadow"><Icon name="check" size={12} /></span>
        </div>
      )}
    </div>
  )
}

const ANIMS: { value: Animation; label: string }[] = [
  { value: 'none', label: 'None (static)' }, { value: 'pop', label: 'Word pop' }, { value: 'bounce', label: 'Bounce in' },
  { value: 'slide', label: 'Slide up' }, { value: 'fade', label: 'Fade' }, { value: 'karaoke', label: 'Karaoke fill' },
]
const WEIGHT_NAMES: Record<number, string> = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }

export interface StylesProps {
  style: CaptionStyle; presetId: string | null; scope: 'all' | 'selected'; hasSelected: boolean; ownStyle: boolean; hasCaptions: boolean; fontTick: number
  onScope: (s: 'all' | 'selected') => void; onApply: (t: Template) => void; onPatch: (p: Partial<CaptionStyle>) => void
  onReset: () => void; onUseGlobal: () => void; onSetAllY: (y: number) => void
}

export function StylesPanel(p: StylesProps) {
  const [sub, setSub] = useState<'templates' | 'customize'>('templates')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | 'All'>('All')
  const st = p.style
  const tpl = templateById(p.presetId)
  const customized = !!tpl && JSON.stringify(tpl.style) !== JSON.stringify(st)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return TEMPLATES.filter((t) =>
      (cat === 'All' || matchesCategory(t, cat)) &&
      (!needle || `${t.name} ${t.blurb} ${t.style.font} ${t.cats.join(' ')}`.toLowerCase().includes(needle)))
  }, [q, cat])

  const scopeBar = (
    <div className="space-y-1.5">
      <Segmented label="Apply style to" value={p.scope} onChange={p.onScope}
        options={[{ value: 'all', label: 'All captions' }, { value: 'selected', label: 'Selected caption', disabled: !p.hasSelected }]} />
      {!p.hasSelected && <p className="text-[11px] text-dim">Select a caption in the preview or timeline to style it on its own.</p>}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="grid grid-cols-2 rounded-md border border-line bg-ink-950 p-0.5">
        {(['templates', 'customize'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={sub === s} onClick={() => setSub(s)}
            className={`h-8 rounded text-xs font-medium capitalize transition-colors ${sub === s ? 'bg-ink-600 text-white' : 'text-mute hover:text-fg'}`}>{s === 'templates' ? `Templates · ${TEMPLATES.length}` : 'Customize'}</button>
        ))}
      </div>
      {scopeBar}

      {sub === 'templates' ? (
        <>
          <div className="sticky -top-4 z-10 -mx-4 space-y-2 border-b border-line bg-ink-900 px-4 pb-3 pt-1">
            <div className="relative">
              <Icon name="search" size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
              <input className={`${input} pl-8`} placeholder="Search templates, fonts, moods…" aria-label="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]">
              {(['All', ...CATEGORIES] as const).map((c) => (
                <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
                  className={`h-7 shrink-0 rounded-full border px-3 text-xs transition-colors ${cat === c ? 'border-accent-500 bg-accent-500/15 text-white' : 'border-line text-mute hover:border-white/20 hover:text-fg'}`}>{c}</button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <Empty icon="search" title="No templates match" text="Try a different word or clear the category filter.">
              <button className={btn} onClick={() => { setQ(''); setCat('All') }}>Clear filters</button>
            </Empty>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {list.map((t) => <TemplateCard key={t.id} t={t} tick={p.fontTick} selected={p.presetId === t.id} onApply={() => p.onApply(t)} />)}
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-dim">
            Hover a card to preview its animation. COVE- and FLAIR-inspired templates are original interpretations of those looks, not copies, and CutPilot is not affiliated with Captions, Captions Lite or CapCut. Fonts are open-source (SIL OFL) Google Fonts; offline, system fallbacks are used.
          </p>
        </>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-fg">{tpl ? tpl.name : 'Custom style'}{customized && <span className="ml-1.5 rounded bg-accent-500/20 px-1.5 py-0.5 text-[10px] text-accent-300">customized</span>}</p>
              <p className="text-[11px] text-dim">{p.scope === 'selected' && p.hasSelected ? (p.ownStyle ? 'Selected caption (own style)' : 'Selected caption — edits give it its own style') : 'All captions'}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button className={`${btn} h-7 px-2`} disabled={!tpl || !customized} onClick={p.onReset} title="Restore the template's original values">Reset</button>
              {p.scope === 'selected' && p.ownStyle && <button className={`${btn} h-7 px-2`} onClick={p.onUseGlobal} title="Remove this caption's own style">Use global</button>}
            </div>
          </div>

          <Section title="Text">
            <Field label="Font">
              <select className={input} value={st.font} onChange={(e) => p.onPatch({ font: e.target.value, weight: nearestWeight(e.target.value, st.weight), kwWeight: 0 })}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Weight">
              <select className={input} value={st.weight} disabled={FONT_META[st.font].weights.length === 1} onChange={(e) => p.onPatch({ weight: Number(e.target.value) })}>
                {FONT_META[st.font].weights.map((w) => <option key={w} value={w}>{WEIGHT_NAMES[w] ?? w}</option>)}
              </select>
            </Field>
            <Slider label="Size" value={st.size} min={24} max={200} onChange={(size) => p.onPatch({ size })} suffix=" px" />
            <Slider label="Letter spacing" value={st.letterSpacing} min={-0.08} max={0.3} step={0.005} onChange={(letterSpacing) => p.onPatch({ letterSpacing })} suffix=" em" />
            <Toggle label="Uppercase" checked={st.uppercase} onChange={(uppercase) => p.onPatch({ uppercase })} />
            <Segmented label="Alignment" value={st.align} onChange={(align) => p.onPatch({ align })}
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
            <ColorField label="Text colour" value={st.color} onChange={(color) => p.onPatch({ color })} />
          </Section>

          <Section title="Emphasis">
            <Toggle label="Highlight the spoken word" checked={st.wordHighlight} onChange={(wordHighlight) => p.onPatch({ wordHighlight })} />
            {st.wordHighlight && <Toggle label="…on a rounded box" checked={st.highlightBox} onChange={(highlightBox) => p.onPatch({ highlightBox })} />}
            <Toggle label="Auto-emphasise keywords" checked={st.autoEmphasis} onChange={(autoEmphasis) => p.onPatch({ autoEmphasis })} />
            <p className="-mt-1 text-[11px] leading-relaxed text-dim">Picks at most one number, name, ALL-CAPS or strong word per caption from the text. It can't hear vocal stress. Marking words with *asterisks* overrides it.</p>
            <ColorField label="Highlight & keyword colour" value={st.highlightColor} onChange={(highlightColor) => p.onPatch({ highlightColor })} />
            <Field label="Keyword font">
              <select className={input} value={st.kwFont} onChange={(e) => p.onPatch({ kwFont: e.target.value, kwWeight: e.target.value ? nearestWeight(e.target.value, st.kwWeight || st.weight) : 0 })}>
                <option value="">Same as text</option>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Toggle label="Keyword italic" checked={st.kwItalic} onChange={(kwItalic) => p.onPatch({ kwItalic })} />
            <Segmented
              label="Keyword sizing mode"
              value={st.kwSize != null ? 'fixed' : 'relative'}
              options={[
                { value: 'relative', label: 'Relative (×)' },
                { value: 'fixed', label: 'Fixed (px)' },
              ]}
              onChange={(m) => p.onPatch({ kwSize: m === 'fixed' ? (st.kwSize ?? st.size) : null })}
            />
            {st.kwSize != null ? (
              <Slider
                label="Keyword font size"
                value={st.kwSize}
                min={24}
                max={200}
                step={2}
                onChange={(kwSize) => p.onPatch({ kwSize })}
                suffix=" px"
              />
            ) : (
              <Slider
                label="Keyword size"
                value={st.kwScale}
                min={0.7}
                max={2.2}
                step={0.05}
                onChange={(kwScale) => p.onPatch({ kwScale })}
                suffix="×"
              />
            )}
            <Toggle label="Keyword on a filled box" checked={st.kwBox} onChange={(kwBox) => p.onPatch({ kwBox })} />
          </Section>

          <Section title="Outline, shadow & glow">
            <ColorField label="Outline colour" value={st.outlineColor} onChange={(outlineColor) => p.onPatch({ outlineColor })} />
            <Slider label="Outline width" value={st.outlineWidth} min={0} max={24} onChange={(outlineWidth) => p.onPatch({ outlineWidth })} suffix=" px" />
            <Slider label="Shadow" value={st.shadow} min={0} max={24} onChange={(shadow) => p.onPatch({ shadow })} suffix=" px" />
            <Slider label="Glow" value={st.glow} min={0} max={40} onChange={(glow) => p.onPatch({ glow })} suffix=" px" />
            {st.glow > 0 && <ColorField label="Glow colour" value={st.glowColor} onChange={(glowColor) => p.onPatch({ glowColor })} />}
          </Section>

          <Section title="Background">
            <ColorField label="Box colour" value={st.bgColor} onChange={(bgColor) => p.onPatch({ bgColor })} />
            <Slider label="Box opacity" value={st.bgOpacity} min={0} max={1} step={0.05} onChange={(bgOpacity) => p.onPatch({ bgOpacity })} />
            <Slider label="Corner roundness" value={st.bgRadius} min={0} max={0.5} step={0.02} onChange={(bgRadius) => p.onPatch({ bgRadius })} />
            <Slider label="Padding" value={st.bgPad} min={0.05} max={0.8} step={0.01} onChange={(bgPad) => p.onPatch({ bgPad })} />
          </Section>

          <Section title="Animation">
            <Field label="Style">
              <select className={input} value={st.animation} onChange={(e) => p.onPatch({ animation: e.target.value as Animation })}>
                {ANIMS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            {st.animation !== 'none' && (
              <>
                <Slider label="Speed" value={st.animSpeed} min={0.5} max={2} step={0.1} onChange={(animSpeed) => p.onPatch({ animSpeed })} suffix="×" />
                {st.animation !== 'fade' && st.animation !== 'karaoke' && <Slider label="Intensity" value={st.animIntensity} min={0} max={1} step={0.05} onChange={(animIntensity) => p.onPatch({ animIntensity })} />}
              </>
            )}
            <p className="text-[11px] leading-relaxed text-dim">Animations are drawn by the same code for preview and export. Pop and Karaoke follow word timing; the rest animate when each caption appears.</p>
          </Section>

          <Section title="Position">
            <p className="text-xs text-mute">Drag a caption on the preview (it snaps to centre), or place every caption at once:</p>
            <div className="grid grid-cols-3 gap-2">
              {([['Top', 0.16], ['Middle', 0.5], ['Bottom', 0.8]] as const).map(([l, y]) => (
                <button key={l} className={btn} disabled={!p.hasCaptions} onClick={() => p.onSetAllY(y)}>{l}</button>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

/* ---------------- AI Tools ---------------- */
export function AiPanel(p: {
  hasVideo: boolean; ai: { pct: number | null; label: string } | null; selection: number
  density: number; lastRun: { precise: boolean; words: number; captions: number } | null
  onDensity: (n: number) => void; onTranscribe: (model: string) => void
}) {
  const [model, setModel] = useState(MODELS[0].id)
  return (
    <div className="space-y-5">
      <Section title="Transcribe speech">
        <p className="text-xs leading-relaxed text-mute">
          Runs open-source Whisper inside your browser. No account or API key, and the audio never leaves this computer. The first run downloads the model from Hugging Face and caches it.
        </p>
        <Field label="Model">
          <select className={input} value={model} onChange={(e) => setModel(e.target.value)} disabled={!!p.ai}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Words per caption">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Segmented
                  label="Words per caption"
                  value={[1, 2, 3].includes(p.density) ? p.density : 0}
                  options={[
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 0, label: 'Custom' },
                  ]}
                  onChange={(v) => {
                    if (v === 0) p.onDensity(p.density > 3 ? p.density : 4)
                    else p.onDensity(v)
                  }}
                />
              </div>
              {(![1, 2, 3].includes(p.density) || p.density > 3) && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={p.density}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val)) p.onDensity(Math.max(1, Math.min(10, val)))
                    }}
                    className="w-14 rounded-md border border-line bg-ink-800 px-2 py-1 text-center text-xs tabular-nums text-fg focus:border-accent-400 focus:outline-none"
                    aria-label="Custom words per caption (1 to 10)"
                  />
                  <span className="text-[11px] text-mute">words</span>
                </div>
              )}
            </div>
          </div>
        </Field>
        <p className="text-xs text-mute">Range: <span className="tabular-nums text-fg">{fmt(p.selection)}</span> (your current trim)</p>
        <button className={`${btnPrimary} w-full`} disabled={!p.hasVideo || !!p.ai} onClick={() => p.onTranscribe(model)}>
          <Icon name="sparkles" size={15} />{p.ai ? 'Working…' : 'Transcribe selection'}
        </button>
        {!p.hasVideo && <p className="text-[11px] text-dim">Open a video to enable transcription.</p>}
        {p.ai && (
          <div role="status" className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div className={`h-full rounded-full bg-accent-500 transition-all ${p.ai.pct === null ? 'w-1/3 animate-pulse' : ''}`} style={p.ai.pct === null ? undefined : { width: `${p.ai.pct}%` }} />
            </div>
            <p className="text-[11px] text-mute">{p.ai.label}</p>
          </div>
        )}
        {p.lastRun && (
          <div className="rounded-lg border border-line bg-ink-850 p-3 text-xs leading-relaxed text-mute">
            <p className="text-fg">Last run: {p.lastRun.words} words → {p.lastRun.captions} captions</p>
            <p className="mt-1">{p.lastRun.precise
              ? 'Timing: real word-level timestamps from Whisper. The highlighted word follows the speech.'
              : 'Timing: this model returned only segment timestamps, so word timing inside each segment is approximated. Captions are marked “≈ approx”.'}</p>
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-dim">New captions are added alongside existing ones. The tiny models are fast but imperfect, so review the text.</p>
      </Section>
    </div>
  )
}
