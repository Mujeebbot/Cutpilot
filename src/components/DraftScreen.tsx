import { useEffect, useMemo, useRef, useState } from 'react'
import type { OutputFormat } from '../types'
import { parseBrief } from '../lib/draft/brief'
import { brollFor } from '../lib/draft/broll'
import { acceptedOf, editRange, resetRange, setDecision, setOptions } from '../lib/draft/apply'
import { keptLength } from '../lib/draft/plan'
import type { DraftPlan, Suggestion } from '../lib/draft/plan'
import { MODELS } from '../lib/transcribe'
import { fmt } from '../lib/util'
import { btn, btnPrimary, Field, input, Segmented, Toggle } from './ui'
import { Icon } from './icons'
import { TimeField } from './TimeField'
import { Link } from '../lib/router'

export interface BriefState { text: string; format: OutputFormat }
interface Job { pct: number | null; label: string }

interface Props {
  url: string | null; hasVideo: boolean; loading: boolean; duration: number; fileName: string; largeFile: boolean
  brief: BriefState; onBrief: (b: BriefState) => void
  plan: DraftPlan | null; onPlan: (p: DraftPlan) => void
  job: Job | null; error: string | null; captionCount: number; applied: boolean
  onAnalyze: (model: string) => void; onUseCaptions: () => void; onCancel: () => void
  onRebuild: (targetSeconds: number | null) => void; onDiscardPlan: () => void
  onApply: () => void; onClose: () => void
}

const FORMATS: { value: OutputFormat; label: string }[] = [{ value: '9:16', label: '9:16 vertical' }, { value: '1:1', label: '1:1 square' }, { value: '16:9', label: '16:9 landscape' }]
const dur = (t: number) => (t < 60 ? `${t.toFixed(1)}s` : `${Math.floor(t / 60)}m ${Math.round(t % 60)}s`)

function Badge({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'model' | 'rule' }) {
  const look = tone === 'model' ? 'border-teal-400/30 bg-teal-400/10 text-teal-200' : tone === 'rule' ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-line bg-ink-800 text-mute'
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${look}`}>{children}</span>
}

export function DraftScreen(p: Props) {
  const goals = useMemo(() => parseBrief(p.brief.text), [p.brief.text])
  const [model, setModel] = useState(MODELS[0].id)
  const [target, setTarget] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ id: string; start: number; end: number } | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const head = useRef<HTMLHeadingElement>(null)
  const plan = p.plan
  useEffect(() => { head.current?.focus() }, [])
  useEffect(() => { setTarget(plan?.goals.targetSeconds ? String(plan.goals.targetSeconds) : '') }, [plan?.goals.targetSeconds, plan?.createdAt])

  // preview player: plays a suggestion's range and stops at its end
  useEffect(() => {
    const v = video.current
    if (!v || !preview) return
    const stop = () => { if (v.currentTime >= preview.end) v.pause() }
    v.addEventListener('timeupdate', stop)
    v.currentTime = preview.start
    void v.play().catch(() => undefined)
    return () => v.removeEventListener('timeupdate', stop)
  }, [preview])

  const setErr = (id: string, msg?: string) => setErrors((e) => { const n = { ...e }; if (msg) n[id] = msg; else delete n[id]; return n })
  const run = (id: string, r: { plan: DraftPlan; error?: string }) => { setErr(id, r.error); if (!r.error) p.onPlan(r.plan) }

  const accepted = plan ? acceptedOf(plan) : []
  const keptTotal = plan ? accepted.reduce((a, s) => a + keptLength(s, plan.options.removePauses), 0) : 0
  const wantTarget = plan?.goals.targetSeconds ?? null
  const busy = !!p.job

  // ---------------------------------------------------------------- prepare
  const prepare = (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] md:px-6">
      <section aria-labelledby="brief-h" className="space-y-5">
        <div>
          <h2 id="brief-h" className="font-display text-xl font-semibold">Your brief</h2>
          <p className="mt-1 text-sm text-mute">Say what you want in plain language. CutPilot looks for a few things in it (length, hook, pauses, captions, topic words) and shows exactly what it found.</p>
        </div>
        <Field label="Describe the edit">
          <textarea className={`${input} min-h-28 resize-y`} value={p.brief.text} onChange={(e) => p.onBrief({ ...p.brief, text: e.target.value })} disabled={busy}
            placeholder="Example: A 45-second vertical short about the pricing mistake, strongest hook first, remove long pauses, two-word captions." />
        </Field>
        <Field label="Output format">
          <Segmented label="Output format" value={p.brief.format} options={FORMATS} onChange={(format) => p.onBrief({ ...p.brief, format })} />
        </Field>
        <div className="rounded-lg border border-line bg-ink-850 p-3.5" aria-live="polite">
          <h3 className="font-display text-sm font-semibold">What CutPilot understood</h3>
          {goals.notes.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {goals.notes.map((n) => (
                <li key={n.id} className="flex flex-wrap items-baseline gap-x-2"><Icon name="check" size={14} className="translate-y-0.5 text-accent-400" /><span className="text-fg">{n.label}</span><span className="text-xs text-dim">from “{n.matched}”</span></li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-mute">Nothing specific yet. Defaults will be used: about 45 seconds, original clip order, pauses kept, captions on.</p>}
          {goals.formatMention && goals.formatMention !== p.brief.format && <p className="mt-2 text-xs text-amber-200">Your text mentions {goals.formatMention} but the format above is {p.brief.format}. The format above is used.</p>}
          <p className="mt-2 text-[11px] leading-relaxed text-dim">This is pattern matching on your words, not comprehension. If something is missing, say it more directly (for example “45 seconds”, “remove pauses”).</p>
        </div>
      </section>

      <section aria-labelledby="run-h" className="space-y-4 self-start rounded-xl border border-line bg-ink-900 p-4">
        <h2 id="run-h" className="font-display text-base font-semibold">Transcribe and draft</h2>
        <p className="text-xs leading-relaxed text-mute">Whisper runs inside this browser tab on your computer. Nothing is uploaded. The first run downloads the model (about 40 MB) and caches it.</p>
        <Field label="Model">
          <select className={input} value={model} onChange={(e) => setModel(e.target.value)} disabled={busy}>{MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
        </Field>
        {p.largeFile && <p className="rounded-md border border-amber-300/30 bg-amber-300/10 p-2.5 text-xs leading-relaxed text-amber-100">This file is large. Decoding its audio needs a lot of memory and may fail on some computers. A shorter or smaller export of the video is safer.</p>}
        {p.job ? (
          <div className="space-y-2" role="status">
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div className={`h-full rounded-full bg-accent-500 transition-all ${p.job.pct === null ? 'w-1/3 animate-pulse' : ''}`} style={p.job.pct === null ? undefined : { width: `${p.job.pct}%` }} />
            </div>
            <p className="text-xs text-mute">{p.job.label}</p>
            <div className="flex gap-2">
              <button className={btn} onClick={p.onCancel}>Cancel</button>
              <button className={btn} onClick={p.onClose}>Work in the editor meanwhile</button>
            </div>
            <p className="text-[11px] text-dim">Transcription runs in the background, so the editor stays usable. The draft opens here when it is ready.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <button className={`${btnPrimary} h-9 w-full`} disabled={!p.hasVideo} onClick={() => p.onAnalyze(model)}><Icon name="sparkles" size={15} />{p.loading ? 'Reading video…' : 'Transcribe and build draft'}</button>
            {p.captionCount > 0 && <button className={`${btn} h-9 w-full`} disabled={!p.hasVideo} onClick={p.onUseCaptions}>Use the {p.captionCount} captions already in the project</button>}
            {!p.hasVideo && !p.loading && <p className="text-[11px] text-dim">Open a video in the editor first.</p>}
            {p.error && <p role="alert" className="rounded-md border border-red-400/30 bg-red-950/70 p-2.5 text-xs leading-relaxed text-red-100">{p.error}</p>}
          </div>
        )}
        <button className="text-xs text-mute underline underline-offset-2 hover:text-fg" onClick={p.onClose}>Skip the draft and open the editor</button>
      </section>
    </div>
  )

  // ---------------------------------------------------------------- review
  const card = (s: Suggestion, i: number) => {
    const words = plan!.transcript.words.filter((w) => (w.s + w.e) / 2 >= s.start && (w.s + w.e) / 2 < s.end)
    const excerpt = words.map((w) => w.t).join(' ')
    const ideas = open === s.id ? brollFor(plan!.transcript.words, s, plan!.goals, s.id) : []
    const err = errors[s.id]
    const state = s.status
    return (
      <li key={s.id} className={`rounded-xl border p-4 ${state === 'accepted' ? 'border-accent-500/60 bg-accent-500/[0.07]' : state === 'rejected' ? 'border-line bg-ink-900 opacity-70' : 'border-line bg-ink-900'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tabular-nums">Clip {i + 1} · {fmt(s.start)}–{fmt(s.end)} <span className="font-normal text-mute">({dur(s.end - s.start)})</span></h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {s.openingRank === 1 && <Badge tone="rule">Strongest opening line</Badge>}
              {s.fitsTarget && <Badge>Fits target length</Badge>}
              {s.edited && <Badge>Range edited</Badge>}
              <Badge tone="rule">Heuristic score {Math.round(s.score * 100)}/100</Badge>
            </div>
          </div>
          <div role="group" aria-label={`Decision for clip ${i + 1}`} className="flex gap-1.5">
            <button className={`${btn} ${state === 'accepted' ? '!border-accent-500 !bg-accent-500 !text-white' : ''}`} aria-pressed={state === 'accepted'} onClick={() => run(s.id, setDecision(plan!, s.id, state === 'accepted' ? 'pending' : 'accepted'))}><Icon name="check" size={14} />Accept</button>
            <button className={`${btn} ${state === 'rejected' ? '!border-red-400/50 !bg-red-950/60 !text-red-200' : ''}`} aria-pressed={state === 'rejected'} onClick={() => run(s.id, setDecision(plan!, s.id, state === 'rejected' ? 'pending' : 'rejected'))}><Icon name="x" size={14} />Reject</button>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-fg">“{excerpt.length > 220 ? `${excerpt.slice(0, 220)}…` : excerpt}”</p>
        <p className="mt-1 text-[11px] text-dim">Transcript text from {plan!.transcript.kind === 'whisper' ? 'Whisper (on this device)' : 'your project captions'}.</p>

        <div className="mt-3">
          <h4 className="text-xs font-medium text-mute">Why it was suggested <span className="font-normal text-dim">(rules that matched, not understanding)</span></h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {s.reasons.map((r, k) => <li key={k}><Badge tone={r.effect === 'minus' ? 'plain' : 'rule'}>{r.effect === 'minus' ? '− ' : r.effect === 'plus' ? '+ ' : ''}{r.text}</Badge></li>)}
          </ul>
          <p className="mt-1.5 text-xs text-mute">Opens on: “{s.opening.text.length > 90 ? `${s.opening.text.slice(0, 90)}…` : s.opening.text}”</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
          <TimeField label="Start" value={s.start} onCommit={(t) => run(s.id, editRange(plan!, s.id, t, s.end))} />
          <TimeField label="End" value={s.end} onCommit={(t) => run(s.id, editRange(plan!, s.id, s.start, t))} />
        </div>
        {err && <p role="alert" className="mt-2 text-xs text-red-300">{err}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={btn} onClick={() => setPreview({ id: s.id, start: s.start, end: s.end })} disabled={!p.url}><Icon name="play" size={13} />Preview range</button>
          {s.edited && <button className={btn} onClick={() => run(s.id, resetRange(plan!, s.id))}><Icon name="reset" size={14} />Reset range</button>}
          <button className={btn} aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>B-roll ideas</button>
          {s.pauses.length > 0 && <span className="text-xs text-mute">{s.pauses.length} long pause{s.pauses.length === 1 ? '' : 's'} inside{plan!.options.removePauses ? ' (will be cut)' : ''}</span>}
        </div>

        {open === s.id && (
          <div className="mt-3 rounded-lg border border-line bg-ink-850 p-3">
            <p className="text-xs text-mute">Text suggestions only. CutPilot does not find, generate or insert footage.</p>
            {ideas.length ? (
              <ul className="mt-2 space-y-2">
                {ideas.map((b) => <li key={b.id} className="text-sm"><span className="tabular-nums text-accent-300">{fmt(b.at)}</span> <span className="text-fg">{b.text}</span><span className="block text-[11px] text-dim">{b.basis}</span></li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-mute">No ideas matched. B-roll ideas appear only for words the built-in lists recognise, words from your brief, names and numbers.</p>}
          </div>
        )}
      </li>
    )
  }

  const review = plan && (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-line bg-ink-900 p-4" aria-label="How this draft was made">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="model">Transcript: {plan.transcript.kind === 'whisper' ? 'Whisper, on this device' : 'existing project captions'}{plan.transcript.precise ? ' · word timestamps' : ' · approximate word timing'}</Badge>
            <Badge tone="rule">Selection and ranking: rule-based heuristics</Badge>
            <Badge>{plan.transcript.words.length} words</Badge>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-mute">{plan.limitations.map((l, k) => <li key={k} className="flex gap-2"><Icon name="alert" size={14} className="mt-0.5 shrink-0 text-amber-200" /><span>{l}</span></li>)}</ul>
        </section>

        <section className="rounded-xl border border-line bg-ink-900 p-4" aria-label="Draft settings">
          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <Field label="Target length (seconds)">
              <div className="flex gap-1.5">
                <input className={input} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ''))} placeholder="45" aria-label="Target length in seconds" />
                <button className={btn} disabled={busy} onClick={() => {
                  if (plan.suggestions.some((s) => s.status !== 'pending') && !confirm('Rebuilding the suggestions resets your accept/reject choices and range edits. Continue?')) return
                  p.onRebuild(target ? Math.max(3, Number(target)) : null)
                }}>Rebuild</button>
              </div>
            </Field>
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle label="Cut long pauses" checked={plan.options.removePauses} onChange={(v) => p.onPlan(setOptions(plan, { removePauses: v }))} />
              <Toggle label="Strongest opening first" checked={plan.options.order === 'hook-first'} onChange={(v) => p.onPlan(setOptions(plan, { order: v ? 'hook-first' : 'source' }))} />
              <Toggle label="Add captions" checked={plan.options.captions} onChange={(v) => p.onPlan(setOptions(plan, { captions: v }))} />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-dim">Pauses are found from gaps between word timestamps (≥ {plan.options.pauseThreshold}s), not from audio levels. Rebuild keeps the same transcript; it does not transcribe again.</p>
        </section>

        {plan.suggestions.length ? <ol className="space-y-4" aria-label="Suggested clips">{plan.suggestions.map(card)}</ol> : (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-mute">No clips could be suggested from this transcript. Check the limitations above, or return to the editor and cut manually.</div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-[72px] lg:self-start" aria-label="Preview and apply">
        <div className="overflow-hidden rounded-xl border border-line bg-black">
          <video ref={video} src={p.url ?? undefined} controls playsInline preload="metadata" className="max-h-[320px] w-full" aria-label="Preview of the source video" />
        </div>
        <p className="text-[11px] text-dim">{preview ? `Previewing clip from ${fmt(preview.start)} to ${fmt(preview.end)}.` : 'Use “Preview range” on a clip to watch just that part.'}</p>
        <div className="rounded-xl border border-line bg-ink-900 p-4">
          <h2 className="font-display text-sm font-semibold">Your selection</h2>
          <p className="mt-1 text-sm tabular-nums text-fg">{accepted.length} accepted · {dur(keptTotal)}{wantTarget ? <span className="text-mute"> of ~{wantTarget}s target</span> : null}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} onClick={() => { let n = plan; for (const s of plan.suggestions.filter((x) => x.fitsTarget)) n = setDecision(n, s.id, 'accepted').plan; p.onPlan(n) }}>Accept the best fit</button>
            <button className={btn} onClick={() => p.onPlan({ ...plan, suggestions: plan.suggestions.map((s) => ({ ...s, status: 'pending' })) })}>Clear choices</button>
          </div>
          <button className={`${btnPrimary} mt-3 h-9 w-full`} disabled={!accepted.length} onClick={p.onApply}>{p.applied ? 'Update the project edit' : 'Apply to project'}</button>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            {accepted.length ? 'Applying sets the clip sequence the editor plays and exports, and adds captions for those clips. You can still change everything afterwards, and undo with Ctrl+Z.' : 'Accept at least one clip to apply it.'}
          </p>
        </div>
        <button className="text-xs text-mute underline underline-offset-2 hover:text-fg" onClick={() => { if (confirm('Discard this draft and start over? Your project and any applied clips stay as they are.')) p.onDiscardPlan() }}>Discard this draft</button>
      </aside>
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink-950" role="region" aria-label="First draft">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-ink-900/95 px-4 backdrop-blur">
        <Link to="/" aria-label="CutPilot home" className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight"><span className="grid h-7 w-7 place-items-center rounded-md bg-accent-500 text-white"><Icon name="film" size={16} /></span><span className="hidden sm:inline">CutPilot</span></Link>
        <span className="h-4 w-px bg-line" />
        <h1 ref={head} tabIndex={-1} className="min-w-0 flex-1 truncate font-display text-sm font-semibold focus:outline-none">{plan ? 'Review your first draft' : 'Prepare your first draft'}<span className="ml-2 font-normal text-mute">{p.fileName}</span></h1>
        <button className={btn} onClick={p.onClose}>{plan ? 'Back to editor' : 'Open editor'}</button>
      </header>
      {plan ? review : prepare}
    </div>
  )
}
