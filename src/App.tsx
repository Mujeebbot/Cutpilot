import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Aspect, CanvasSettings, Caption, CaptionStyle, Clip, OutputFormat, Tool, Trim, Density } from './types'
import { DEFAULT_CANVAS } from './types'
import { Stage } from './components/Stage'
import { Timeline } from './components/Timeline'
import { SequenceBar } from './components/SequenceBar'
import { DraftPanel } from './components/DraftPanel'
import { DraftScreen } from './components/DraftScreen'
import type { BriefState } from './components/DraftScreen'
import { AiPanel, CaptionsPanel, MediaPanel, RecoverCard, StylesPanel } from './components/Panels'
import { AssistantPanel } from './components/AssistantPanel'
import type { Recoverable } from './components/Panels'
import { Icon } from './components/icons'
import type { IconName } from './components/icons'
import { LogoMark } from './components/Logo'
import { btn, btnPrimary, IconButton } from './components/ui'
import { appendEmoji, captionWords, normalizeCaption, normalizeStyle, regroup, groupWords } from './lib/captions'
import { chunkText, looksLikeSrt, parseSrt, spread, toSrt } from './lib/srt'
import { TEMPLATES, templateById } from './lib/templates'
import type { Template } from './lib/templates'
import { canvasSize } from './lib/compose'
import { ensureFonts } from './lib/fonts'
import { clamp, download, fmt, uid } from './lib/util'
import { exportVideo } from './lib/exporter'
import { isAbort, transcribe } from './lib/transcribe'
import { advance, constrainClip, moveItem, playStart, sanitizeClips, sequenceRanges, sequenceToSource, totalLength } from './lib/sequence'
import { buildPlan } from './lib/draft/plan'
import type { DraftPlan } from './lib/draft/plan'
import { parseBrief } from './lib/draft/brief'
import { buildClips, captionsForRanges, mergeDraftCaptions } from './lib/draft/apply'
import { AUTOSAVE_KEY, clearAutosave, clearSession, loadSession, saveDraft, saveProject as storeProject, takeHandoff } from './lib/session'
import { Link, navigate } from './lib/router'

type Note = { kind: 'error' | 'info'; text: string } | null
type Snap = { captions: Caption[]; style: CaptionStyle; trim: Trim; canvas: CanvasSettings; presetId: string | null; clips: Clip[] }
type Scope = 'all' | 'selected'

interface Saved {
  version: 1; savedAt: number; projectName: string; videoName: string | null; trim: Trim
  captions: Caption[]; style: CaptionStyle; presetId: string | null; canvas: CanvasSettings; density: Density
  /** Added with the draft workflow; absent in older saves. */
  clips?: Clip[]; brief?: BriefState
}
const readAutosave = (): Saved | null => {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    return d?.version === 1 && Array.isArray(d.captions) && (d.captions.length || (Array.isArray(d.clips) && d.clips.length)) ? d : null
  } catch { return null }
}
const sameSnap = (a: Snap, b: Snap) => a.captions === b.captions && a.style === b.style && a.trim === b.trim && a.canvas === b.canvas && a.presetId === b.presetId && a.clips === b.clips

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'], ['← / →', 'Step one frame (assumes 30 fps)'], ['Shift + ← / →', 'Step one second'],
  ['J', 'Jump back 5 s'], ['K', 'Pause'], ['L', 'Play (press again to speed up to 3×)'],
  ['I / O', 'Set trim in / out at the playhead'], ['Delete / Backspace', 'Delete selected caption'],
  ['Ctrl + Z', 'Undo'], ['Ctrl + Shift + Z  or  Ctrl + Y', 'Redo'], ['Ctrl + scroll (timeline)', 'Zoom timeline'],
  ['Alt (while dragging)', 'Turn snapping off'], ['?', 'Show this panel'],
]

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const projInput = useRef<HTMLInputElement>(null)
  const pendingTrim = useRef<Trim | null>(null)
  const abort = useRef<AbortController | null>(null)
  const fileRef = useRef<File | null>(null)
  const hist = useRef<{ past: Snap[]; future: Snap[]; last: Snap | null }>({ past: [], future: [], last: null })
  const initial = templateById('heavy-pop')!

  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dims, setDims] = useState({ w: 16, h: 9 })
  const [duration, setDuration] = useState(0)
  const [time, setTime] = useState(0)
  const [frameTick, setFrameTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [trim, setTrim] = useState<Trim>({ start: 0, end: 0 })
  const [captions, setCaptions] = useState<Caption[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [style, setStyle] = useState<CaptionStyle>(initial.style)
  const [presetId, setPresetId] = useState<string | null>(initial.id)
  const [scope, setScope] = useState<Scope>('all')
  const [canvas, setCanvas] = useState<CanvasSettings>(DEFAULT_CANVAS)
  const [density, setDensity] = useState<Density>(2)
  const [note, setNote] = useState<Note>(null)
  const [exportPct, setExportPct] = useState<number | null>(null)
  const [ai, setAi] = useState<{ pct: number | null; label: string } | null>(null)
  const [lastRun, setLastRun] = useState<{ precise: boolean; words: number; captions: number } | null>(null)
  const [fontTick, setFontTick] = useState(0)
  const [tool, setTool] = useState<Tool>('media')
  const [projectName, setProjectName] = useState('Untitled project')
  const [dragOver, setDragOver] = useState(false)
  const [clips, setClips] = useState<Clip[]>([])
  const [selClipId, setSelClipId] = useState<string | null>(null)
  const [brief, setBrief] = useState<BriefState>({ text: '', format: '9:16' })
  const [plan, setPlan] = useState<DraftPlan | null>(null)
  const [view, setView] = useState<'editor' | 'draft'>('editor')
  const [draftError, setDraftError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)
  const playIdx = useRef(0)
  const jobAbort = useRef<AbortController | null>(null)
  const boot = useRef(false)
  const viewRef = useRef<'editor' | 'draft'>('editor')
  viewRef.current = view
  const [showKeys, setShowKeys] = useState(false)
  const [, bumpHist] = useState(0)
  const [recover, setRecover] = useState<Saved | null>(() => readAutosave())
  const [asave, setAsave] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; at?: number; msg?: string }>({ state: 'idle' })
  const [narrowWarn, setNarrowWarn] = useState(false)

  useEffect(() => {
    const checkWidth = () => { if (window.innerWidth < 920) setNarrowWarn(true) }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  useEffect(() => { document.documentElement.classList.add('app-lock'); return () => document.documentElement.classList.remove('app-lock') }, [])
  const err = (text: string) => setNote({ kind: 'error', text })
  const info = (text: string) => setNote({ kind: 'info', text })
  const hasVideo = !!url && duration > 0
  const exporting = exportPct !== null
  const outSize = canvasSize(canvas.aspect, dims.w, dims.h)

  // ---------- file loading ----------
  const loadFile = useCallback((f: File) => {
    const probe = document.createElement('video')
    if (!f.type.startsWith('video/') || (f.type && probe.canPlayType(f.type) === '')) {
      err(`"${f.name}" can't be played by this browser (${f.type || 'unknown type'}). Try MP4 (H.264), WebM or MOV from a recent Chrome, Edge or Safari.`)
      return
    }
    setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f) })
    setFile(f)
    fileRef.current = f
    setLoading(true)
    setNote(null)
    setDuration(0)
    setTime(0)
    setPlaying(false)
  }, [])

  const videoProps = {
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget
      setLoading(false)
      if (!isFinite(v.duration) || !v.videoWidth) { err('This file loaded but has no usable video track or duration.'); return }
      setDuration(v.duration)
      setDims({ w: v.videoWidth, h: v.videoHeight })
      const pt = pendingTrim.current
      pendingTrim.current = null
      setTrim(pt ? { start: clamp(pt.start, 0, v.duration), end: clamp(pt.end, 0, v.duration) } : { start: 0, end: v.duration })
      setTime(0)
      setClips((cs) => sanitizeClips(cs, v.duration, uid))
      hist.current = { past: [], future: [], last: null } // fresh undo history per video
      bumpHist((n) => n + 1)
      setProjectName((n) => (n === 'Untitled project' ? (fileRef.current?.name ?? n).replace(/\.[^.]+$/, '') : n))
    },
    onError: () => {
      setLoading(false)
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return null })
      setFile(null)
      setDuration(0)
      err('The browser could not decode this video. The container may be fine but the codec unsupported (e.g. HEVC/H.265 or ProRes). Re-encode to H.264 MP4 and try again.')
    },
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => { setTime(e.currentTarget.currentTime); setFrameTick((n) => n + 1) },
    onSeeked: () => setFrameTick((n) => n + 1),
    onLoadedData: () => setFrameTick((n) => n + 1),
  }

  // ---------- playback ----------
  const seek = useCallback((t: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = clamp(t, 0, v.duration || 0)
    setTime(v.currentTime)
  }, [])

  const ranges = useMemo(() => sequenceRanges(clips, trim), [clips, trim])
  const seqLen = totalLength(ranges)
  const clipMode = clips.length > 0

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v || !hasVideo || exporting) return
    if (v.paused) {
      if (clipMode) { const ps = playStart(ranges, v.currentTime); v.currentTime = ps.t; playIdx.current = ps.index }
      else if (v.currentTime < trim.start || v.currentTime >= trim.end - 0.05) v.currentTime = trim.start
      void v.play()
    } else v.pause()
  }, [hasVideo, exporting, trim, clipMode, ranges])

  const playSelection = () => { const v = videoRef.current; if (v) { v.playbackRate = 1; playIdx.current = 0; v.currentTime = ranges[0].start; void v.play() } }

  useEffect(() => {
    if (!playing || exporting) return
    let id = 0
    const tick = () => {
      const v = videoRef.current
      if (v) {
        setTime(v.currentTime)
        setFrameTick((n) => n + 1)
        if (!clipMode) {
          if (v.currentTime >= trim.end - 0.02) { v.pause(); v.currentTime = trim.start; setTime(trim.start) }
        } else if (!v.seeking) {
          // follow the approved sequence: at the end of a clip jump to the next one in sequence order
          const a = advance(ranges, playIdx.current, v.currentTime)
          if (a.type === 'continue') playIdx.current = a.index
          else if (a.type === 'seek') { playIdx.current = a.index; v.currentTime = a.to; setTime(a.to) }
          else { v.pause(); playIdx.current = 0; v.currentTime = ranges[0].start; setTime(ranges[0].start) }
        }
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, exporting, trim, clipMode, ranges])

  // ---------- clips ----------
  const updateClipRange = (id: string, start: number, end: number) => {
    const r = constrainClip(clips, id, start, end, duration)
    if (r) setClips((cs) => cs.map((c) => (c.id === id ? { ...c, ...r } : c)))
  }
  const selClip = clips.find((c) => c.id === selClipId)
  const setIn = () => { if (clipMode) { if (selClip) updateClipRange(selClip.id, Math.min(time, selClip.end - 0.3), selClip.end) } else setTrim((t) => ({ start: Math.min(time, t.end - 0.1), end: t.end })) }
  const setOut = () => { if (clipMode) { if (selClip) updateClipRange(selClip.id, selClip.start, Math.max(time, selClip.start + 0.3)) } else setTrim((t) => ({ start: t.start, end: Math.max(time, t.start + 0.1) })) }
  const moveClip = (id: string, dir: -1 | 1) => setClips((cs) => { const i = cs.findIndex((c) => c.id === id); return moveItem(cs, i, i + dir) })
  const removeClip = (id: string) => { setClips((cs) => cs.filter((c) => c.id !== id)); if (selClipId === id) setSelClipId(null) }
  const clearClips = () => {
    if (!confirm('Go back to a single trimmed range? The clips are removed from the edit (captions stay). You can undo with Ctrl+Z.')) return
    setClips([]); setSelClipId(null)
    if (clips.length) setTrim({ start: Math.min(...clips.map((c) => c.start)), end: Math.max(...clips.map((c) => c.end)) })
  }
  const selectClip = (id: string) => setSelClipId(id)
  const seekSource = (t: number) => { videoRef.current?.pause(); seek(t) }

  // ---------- captions ----------
  const updateCaption = (id: string, p: Partial<Caption>) =>
    setCaptions((cs) => cs.map((c) => {
      if (c.id !== id) return c
      const n = { ...c, ...p }
      if ('text' in p && p.text !== c.text) { n.words = undefined; n.timing = undefined; n.edited = true }
      if (('start' in p || 'end' in p) && (n.start !== c.start || n.end !== c.end)) {
        n.edited = true
        const moved = Math.abs(n.end - n.start - (c.end - c.start)) < 1e-6 // pure move keeps word timing, shifted
        if (c.words && moved) n.words = c.words.map((w) => ({ ...w, s: w.s + (n.start - c.start), e: w.e + (n.start - c.start) }))
        else if (c.words) { n.words = undefined; n.timing = undefined }
      }
      return n
    }))
  const addCaption = () => {
    const start = time
    const c: Caption = { id: uid(), start, end: Math.max(Math.min(start + 2.5, duration), start + 0.5), text: 'New caption', x: 0.5, y: 0.8, edited: true }
    setCaptions((cs) => [...cs, c])
    setSelId(c.id)
  }
  const deleteCaption = (id: string) => { setCaptions((cs) => cs.filter((c) => c.id !== id)); setSelId(null) }

  const importText = (text: string) => {
    const caps = looksLikeSrt(text) ? parseSrt(text) : spread(chunkText(text, 3), trim.start, trim.end)
    if (!caps.length) { err('Nothing could be imported. Check that the SRT has timestamps like 00:00:01,000 --> 00:00:03,000.'); return }
    setCaptions((cs) => [...cs, ...caps])
    info(`Imported ${caps.length} caption${caps.length === 1 ? '' : 's'}${looksLikeSrt(text) ? '' : ' (spaced evenly across your trim range — adjust timing as needed)'}.`)
  }
  const importSrt = async (f: File) => {
    const caps = parseSrt(await f.text())
    if (!caps.length) { err(`No valid subtitles found in "${f.name}".`); return }
    setCaptions((cs) => [...cs, ...caps])
    info(`Imported ${caps.length} captions from ${f.name}.`)
  }

  const changeDensity = (n: Density) => {
    if (n === density) return
    setDensity(n)
    if (!captions.length) return
    const risky = captions.filter((c) => c.edited || !c.timing).length
    if (risky && !confirm(`Regroup ${captions.length} captions into ${n}-word captions?\n\n${risky} of them were typed, imported or edited by hand. Their text is kept, but timing is re-spread across the words and their own styles/positions may be lost. You can undo with Ctrl+Z.`)) return
    setCaptions(regroup(captions, n))
    setSelId(null)
    info(`Regrouped into ${n}-word captions.`)
  }

  const applyEmojis = (items: { id: string; emoji: string }[]) => {
    const m = new Map(items.map((i) => [i.id, i.emoji]))
    setCaptions((cs) => cs.map((c) => (m.has(c.id) ? appendEmoji(c, m.get(c.id)!) : c)))
    info(`Added ${items.length} emoji.`)
  }

  const runTranscribe = async (model: string) => {
    if (!file || !hasVideo) return
    setNote(null)
    setAi({ pct: null, label: 'Starting…' })
    try {
      const tr = await transcribe(file, trim.start, trim.end, model, (pct, label) => setAi({ pct, label }))
      const caps = groupWords(tr.words, density)
      setCaptions((cs) => [...cs, ...caps])
      setLastRun({ precise: tr.precise, words: tr.words.length, captions: caps.length })
      info(tr.precise
        ? `Transcribed ${caps.length} captions with real word timestamps. Review the text before exporting.`
        : `Transcribed ${caps.length} captions. This model gave only segment timestamps, so word timing is approximated.`)
    } catch (e) {
      err(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAi(null)
    }
  }

  // ---------- templates & style (global style, or one caption's own style) ----------
  const selCap = captions.find((c) => c.id === selId)
  const effScope: Scope = scope === 'selected' && selCap ? 'selected' : 'all'
  const targetStyle = effScope === 'selected' ? (selCap!.style ?? style) : style
  const targetPreset = effScope === 'selected' ? (selCap!.presetId ?? presetId) : presetId

  const applyTemplate = (t: Template) => {
    if (effScope === 'selected') updateCaption(selCap!.id, { style: { ...t.style }, presetId: t.id })
    else {
      setStyle({ ...t.style })
      setPresetId(t.id)
      setCaptions((cs) => (cs.some((c) => c.style || c.presetId) ? cs.map((c) => (c.style || c.presetId ? { ...c, style: undefined, presetId: undefined } : c)) : cs))
    }
  }
  const patchStyle = (p: Partial<CaptionStyle>) => {
    if (effScope === 'selected') {
      const pid = selCap!.presetId ?? presetId ?? undefined
      setCaptions((cs) => cs.map((c) => (c.id === selCap!.id ? { ...c, style: { ...(c.style ?? style), ...p }, presetId: pid } : c)))
    } else setStyle((s) => ({ ...s, ...p }))
  }
  const resetStyle = () => {
    if (effScope === 'selected') {
      const t = templateById(selCap!.presetId ?? presetId)
      if (t) updateCaption(selCap!.id, { style: { ...t.style }, presetId: t.id })
    } else {
      const t = templateById(presetId)
      if (t) setStyle({ ...t.style })
      setCaptions((cs) => cs.map((c) => { const ct = c.style ? templateById(c.presetId) : undefined; return ct ? { ...c, style: { ...ct.style } } : c }))
      info('Reset all captions to their templates\' original values.')
    }
  }
  const useGlobalStyle = () => selCap && updateCaption(selCap.id, { style: undefined, presetId: undefined })
  const setAllY = (y: number) => setCaptions((cs) => cs.map((c) => ({ ...c, y })))
  const suggestedWords = templateById(targetPreset)?.words ?? null

  // ---------- undo / redo (structural sharing keeps snapshots tiny: they are references, not copies) ----------
  const cur = (): Snap => ({ captions, style, trim, canvas, presetId, clips })
  const applySnap = (s: Snap) => { setCaptions(s.captions); setStyle(s.style); setTrim(s.trim); setCanvas(s.canvas); setPresetId(s.presetId); setClips(s.clips); setSelClipId((id) => (s.clips.some((c) => c.id === id) ? id : null)) }
  useEffect(() => {
    const h = hist.current
    const now = { captions, style, trim, canvas, presetId, clips }
    if (!h.last) { h.last = now; return }
    if (sameSnap(h.last, now)) return
    const id = setTimeout(() => {
      h.past.push(h.last!)
      if (h.past.length > 100) h.past.shift()
      h.future = []
      h.last = now
      bumpHist((n) => n + 1)
    }, 450)
    return () => clearTimeout(id)
  }, [captions, style, trim, canvas, presetId, clips])

  const undo = () => {
    const h = hist.current
    if (!h.last) return
    const now = cur()
    if (!sameSnap(h.last, now)) { h.past.push(h.last); h.last = now } // flush pending edit
    const prev = h.past.pop()
    if (!prev) return
    h.future.push(h.last)
    h.last = prev
    applySnap(prev)
    bumpHist((n) => n + 1)
  }
  const redo = () => {
    const h = hist.current
    const next = h.future.pop()
    if (!next || !h.last) return
    h.past.push(h.last)
    h.last = next
    applySnap(next)
    bumpHist((n) => n + 1)
  }
  const canUndo = hist.current.past.length > 0 || (!!hist.current.last && !sameSnap(hist.current.last, cur()))
  const canRedo = hist.current.future.length > 0

  // ---------- first draft ----------
  const fullBrief = (): { name: string; text: string; format: OutputFormat } => ({ name: projectName, ...brief })
  const changePlan = (next: DraftPlan | null) => setPlan(next)
  useEffect(() => {
    if (!booted || !file) return
    const id = setTimeout(() => { void saveDraft(fullBrief(), plan).catch(() => undefined) }, 500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, brief, projectName, booted, file])
  const makePlan = (words: DraftPlan['transcript']['words'], source: { kind: 'whisper' | 'captions'; model: string | null; precise: boolean }, targetOverride?: number | null) => {
    const goals = parseBrief(brief.text)
    if (targetOverride !== undefined) goals.targetSeconds = targetOverride
    return buildPlan({ words, duration, goals, source, options: plan ? { pauseThreshold: plan.options.pauseThreshold } : undefined })
  }
  const cancelDraft = () => jobAbort.current?.abort()
  const analyze = async (model: string) => {
    if (!file || !hasVideo || ai) return
    const ac = new AbortController()
    jobAbort.current = ac
    setDraftError(null)
    setAi({ pct: null, label: 'Starting…' })
    try {
      const tr = await transcribe(file, 0, duration, model, (pct, label) => setAi({ pct, label }), ac.signal)
      const next = makePlan(tr.words, { kind: 'whisper', model, precise: tr.precise })
      changePlan(next)
      setView('draft')
      if (viewRef.current !== 'draft') info('Your first draft is ready. Open the Draft tab to review it.')
    } catch (e) {
      if (isAbort(e)) info('Transcription cancelled. Nothing was changed.')
      else setDraftError(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setAi(null); jobAbort.current = null }
  }
  const draftFromCaptions = () => {
    const words = [...captions].sort((a, b) => a.start - b.start).flatMap((c) => captionWords(c))
    if (words.length < 5) { setDraftError('The captions in this project have too few words to build a draft from.'); return }
    setDraftError(null)
    changePlan(makePlan(words, { kind: 'captions', model: null, precise: captions.every((c) => c.timing === 'word') }))
  }
  const rebuildPlan = (target: number | null) => { if (plan) changePlan(makePlan(plan.transcript.words, { kind: plan.transcript.kind, model: plan.transcript.model, precise: plan.transcript.precise }, target)) }

  const applyPlan = () => {
    if (!plan) return
    const edit = buildClips(plan)
    if (!edit.clips.length) { err('Accept at least one suggestion first.'); return }
    const rs = edit.clips.map((c) => ({ start: c.start, end: c.end }))
    setClips(edit.clips)
    setSelClipId(edit.clips[0].id)
    setTrim({ start: Math.min(...rs.map((r) => r.start)), end: Math.max(...rs.map((r) => r.end)) })
    setCanvas((c) => ({ ...c, aspect: brief.format }))
    let added = 0
    if (plan.options.captions) {
      const fresh = captionsForRanges(plan.transcript.words, rs, plan.goals.wordsPerCaption ?? density)
      added = fresh.length
      setCaptions((cs) => mergeDraftCaptions(cs, fresh))
      if (plan.goals.emphasizeKeywords) setStyle((st) => ({ ...st, autoEmphasis: true }))
    }
    changePlan({ ...plan, appliedAt: Date.now() })
    seek(rs[0].start)
    setView('editor')
    setTool('draft')
    info(`Applied ${edit.clips.length} clip${edit.clips.length === 1 ? '' : 's'} (${fmt(edit.length)})${plan.options.captions ? ` and ${added} captions` : ''}.${edit.skippedPauses ? ` Cut ${edit.skippedPauses} long pause${edit.skippedPauses === 1 ? '' : 's'}.` : ''} Press play to preview; undo with Ctrl+Z.`)
  }
  const regenCaptions = () => {
    if (!plan || !clipMode) return
    const fresh = captionsForRanges(plan.transcript.words, ranges, plan.goals.wordsPerCaption ?? density)
    setCaptions((cs) => mergeDraftCaptions(cs, fresh))
    info(`Rebuilt ${fresh.length} draft captions for the current clips. Captions you edited or typed were kept.`)
  }

  // ---------- project start / restore (landing page hand-off, or a refresh at /editor) ----------
  const openVideo = (f: File) => {
    loadFile(f)
    setClips([]); setSelClipId(null); changePlan(null); setView('editor'); setDraftError(null)
    clearAutosave()
    void storeProject(f, { name: f.name.replace(/\.[^.]+$/, ''), ...brief }).catch(() => info('Could not keep a copy of this video in browser storage, so a refresh will need you to open it again.'))
  }
  useEffect(() => {
    if (boot.current) return
    boot.current = true
    void (async () => {
      const h = takeHandoff()
      if (h) {
        loadFile(h.file)
        setProjectName(h.brief.name || h.file.name.replace(/\.[^.]+$/, ''))
        setBrief({ text: h.brief.text, format: h.brief.format })
        setCanvas((c) => ({ ...c, aspect: h.brief.format }))
        setRecover(null)
        setView('draft')
        if (h.persistError) info(`Your video could not be kept in browser storage (${h.persistError}). Editing works, but a refresh will need you to open it again.`)
      } else {
        const ses = await loadSession()
        if (ses) {
          loadFile(ses.file)
          setProjectName(ses.brief.name)
          setBrief({ text: ses.brief.text, format: ses.brief.format })
          setPlan(ses.plan)
          const saved = readAutosave()
          if (saved && saved.videoName === ses.file.name) { applyProject(saved); setRecover(null) }
          if (ses.plan && !ses.plan.appliedAt) setView('draft')
        }
      }
      setBooted(true)
    })()
  }, [])

  // ---------- keyboard ----------
  const rate = useRef(1)
  const actions = useRef({ togglePlay, setIn, setOut, undo, redo, seek, del: () => { if (selId) deleteCaption(selId) }, time })
  actions.current = { togglePlay, setIn, setOut, undo, redo, seek, del: () => { if (selId) deleteCaption(selId) }, time }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return // never while typing
      if (viewRef.current === 'draft') return
      const a = actions.current
      const v = videoRef.current
      if (e.metaKey || e.ctrlKey) {
        const k = e.key.toLowerCase()
        if (k === 'z') { e.preventDefault(); if (e.shiftKey) a.redo(); else a.undo() }
        else if (k === 'y') { e.preventDefault(); a.redo() }
        return
      }
      if (e.code === 'Space') { e.preventDefault(); a.togglePlay() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); v?.pause(); a.seek(a.time - (e.shiftKey ? 1 : 1 / 30)) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); v?.pause(); a.seek(a.time + (e.shiftKey ? 1 : 1 / 30)) }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); a.del() }
      else if (e.key === '?') setShowKeys((s) => !s)
      else if (e.key === 'Escape') setShowKeys(false)
      else if (e.key === 'i') a.setIn()
      else if (e.key === 'o') a.setOut()
      else if (e.key === 'j') a.seek(a.time - 5)
      else if (e.key === 'k') { if (v) { v.pause(); v.playbackRate = 1; rate.current = 1 } }
      else if (e.key === 'l' && v) {
        if (v.paused) { rate.current = 1; v.playbackRate = 1; a.togglePlay() } else { rate.current = Math.min(3, rate.current + 1); v.playbackRate = rate.current }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // fonts: make sure every face used by the project (and all templates, for thumbnails) is loaded, then redraw
  useEffect(() => { void ensureFonts(TEMPLATES.map((t) => t.style)).finally(() => setFontTick((n) => n + 1)) }, [])
  useEffect(() => {
    void ensureFonts([style, ...captions.flatMap((c) => (c.style ? [c.style] : []))]).then(() => setFontTick((n) => n + 1))
  }, [style, captions])

  useEffect(() => {
    if (!file && !captions.length) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [file, captions.length])

  // ---------- autosave (debounced; never stores the video itself; reports failures honestly) ----------
  const pendingRecover = !!recover && captions.length === 0 && clips.length === 0
  const snapshot = (): Saved => ({ version: 1, savedAt: Date.now(), projectName, videoName: file?.name ?? null, trim, captions, style, presetId, canvas, density, clips, brief })
  const latest = useRef({ snapshot, active: false })
  latest.current = { snapshot, active: !pendingRecover && !!booted && (!!file || captions.length > 0 || clips.length > 0) }
  const writeSave = () => {
    try {
      const data = latest.current.snapshot()
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
      setAsave({ state: 'saved', at: data.savedAt })
    } catch (e) {
      const full = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
      setAsave({ state: 'error', msg: full ? 'browser storage is full' : 'browser storage is unavailable' })
    }
  }
  useEffect(() => {
    if (!latest.current.active) return
    setAsave((a) => ({ ...a, state: 'saving' }))
    const id = setTimeout(writeSave, 1500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captions, style, presetId, trim, canvas, density, projectName, file, pendingRecover, clips, brief, booted])
  // leaving the page or the route must not lose the last 1.5 s of edits
  useEffect(() => {
    const flush = () => { if (latest.current.active) { try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(latest.current.snapshot())) } catch { /* reported by the normal path */ } } }
    window.addEventListener('pagehide', flush)
    return () => { window.removeEventListener('pagehide', flush); flush(); abort.current?.abort(); jobAbort.current?.abort() }
  }, [])

  const applyProject = (d: Partial<Saved>) => {
    setCaptions((d.captions ?? []).map(normalizeCaption))
    setStyle(normalizeStyle(d.style))
    setPresetId(d.presetId ?? null)
    if (d.canvas) setCanvas({ ...DEFAULT_CANVAS, ...d.canvas })
    if (typeof d.density === 'number' && d.density >= 1 && d.density <= 10) setDensity(Math.round(d.density))
    if (typeof d.projectName === 'string') setProjectName(d.projectName)
    setClips(sanitizeClips(d.clips, duration, uid))
    if (d.brief && typeof d.brief.text === 'string') setBrief({ text: d.brief.text, format: (['9:16', '1:1', '16:9'] as const).includes(d.brief.format as OutputFormat) ? d.brief.format : '9:16' })
    if (d.trim && duration > 0) setTrim({ start: clamp(d.trim.start, 0, duration), end: clamp(d.trim.end, 0, duration) })
    else if (d.trim) pendingTrim.current = d.trim
    setSelId(null)
    setSelClipId(null)
  }
  const recoverInfo: Recoverable | null = recover ? { videoName: recover.videoName, savedAt: recover.savedAt, count: recover.captions.length || (recover.clips?.length ?? 0) } : null
  const restore = () => { if (recover) { applyProject(recover); info(`Restored ${recover.captions.length} captions.${hasVideo ? '' : ' Now open the video.'}`); setRecover(null) } }
  const discard = () => { clearAutosave(); setRecover(null) }

  // ---------- export ----------
  const baseName = projectName.trim().replace(/[^\w.-]+/g, '_') || 'cutpilot'
  const doExport = async () => {
    const v = videoRef.current
    if (!v || !hasVideo) return
    if (seqLen < 0.2) { err('The edit is too short to export.'); return }
    const ac = new AbortController()
    abort.current = ac
    setNote(null)
    setExportPct(0)
    v.playbackRate = 1
    rate.current = 1
    try {
      const { blob, ext } = await exportVideo({
        video: v, ranges, captions, style, canvas, signal: ac.signal, onProgress: (p) => setExportPct(p),
      })
      download(blob, `${baseName}-cutpilot.${ext}`)
      info(`Exported ${(blob.size / 1e6).toFixed(1)} MB ${ext.toUpperCase()} at ${outSize.w}×${outSize.h}. Check your downloads folder.`)
    } catch (e) {
      if (!ac.signal.aborted) err(`Export failed: ${e instanceof Error ? e.message : String(e)}`)
      else info('Export cancelled.')
    } finally {
      setExportPct(null)
      setTime(v.currentTime)
    }
  }

  // ---------- project file save/load ----------
  const saveProject = () => {
    const data = { app: 'cutpilot', version: 3, videoName: file?.name ?? null, projectName, trim, captions, style, presetId, canvas, density, clips, brief }
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${baseName}.cutpilot.json`)
    info('Project file saved. It contains captions, style, trim, clips and canvas — not the video, so re-open the same video when you load it.')
  }
  const loadProject = async (f: File) => {
    try {
      const d = JSON.parse(await f.text())
      if (d?.app !== 'cutpilot' || !Array.isArray(d.captions)) throw new Error('not a CutPilot project')
      applyProject(d)
      info(`Loaded project${d.videoName ? ` for "${d.videoName}"` : ''}.${hasVideo ? '' : ' Now open the video.'}`)
    } catch {
      err('That file is not a valid CutPilot project.')
    }
  }

  const selDur = seqLen
  const selectFromTimeline = (id: string) => { setSelId(id); setTool('captions') }
  const status = asave.state === 'error' ? `Autosave failed — ${asave.msg}` : asave.state === 'saving' ? 'Saving…'
    : asave.state === 'saved' ? `Autosaved ${new Date(asave.at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Temporary workspace'
  const dot = asave.state === 'error' ? 'bg-red-400' : asave.state === 'saved' ? 'bg-emerald-400' : 'bg-amber-200'

  const TOOLS: { id: Tool; label: string; icon: IconName; title: string; sub: string }[] = [
    { id: 'media', label: 'Media', icon: 'media', title: 'Media', sub: 'Video, canvas and project' },
    { id: 'captions', label: 'Captions', icon: 'captions', title: 'Captions', sub: 'Write, time and position captions' },
    { id: 'styles', label: 'Styles', icon: 'type', title: 'Styles', sub: 'Caption templates and customisation' },
    { id: 'draft', label: 'Draft', icon: 'clips', title: 'Draft & clips', sub: 'First draft and the clip sequence' },
    { id: 'ai', label: 'AI Tools', icon: 'sparkles', title: 'AI Tools', sub: 'Free, on-device speech to captions' },
    { id: 'assistant', label: 'Assistant', icon: 'chat', title: 'Assistant', sub: 'Control the editor with typed commands' },
  ]
  const curTool = TOOLS.find((t) => t.id === tool)!
  const keysBtn = useMemo(() => <IconButton icon="keyboard" label="Keyboard shortcuts (?)" onClick={() => setShowKeys(true)} />, [])

  return (
    <div className="grid h-dvh min-w-[920px] grid-rows-[48px_minmax(0,1fr)] overflow-hidden bg-ink-950"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) openVideo(f) }}>
      <header className="flex items-center gap-2 border-b border-line bg-ink-900 px-3">
        <Link to="/" aria-label="CutPilot home (your project is kept)" title="Back to the CutPilot home page. Your project is kept." className="flex items-center gap-0 rounded-md focus-visible:outline-2">
          <span className="flex w-[56px] items-center justify-center"><LogoMark size={28} /></span>
          <span className="font-display text-[15px] font-semibold tracking-tight">CutPilot</span>
        </Link>
        <span className="mx-1 h-4 w-px bg-line" />
        <input aria-label="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} spellCheck={false}
          className="h-8 w-44 rounded-md bg-transparent px-2 text-sm text-fg transition-colors hover:bg-ink-800 focus:bg-ink-800 focus:outline-none" />
        {ai && view === 'editor' && <button onClick={() => setView('draft')} className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent-500/50 bg-accent-500/10 px-2.5 py-1 text-[11px] text-fg" title={ai.label}><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400" />Drafting… open</button>}
        <span title="Captions, style, trim and canvas are autosaved in this browser's storage. The video is kept in this browser (IndexedDB) so a refresh does not lose it, and is never uploaded. Use Save project for a portable backup."
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2.5 py-1 text-[11px] text-mute">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{status}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <select aria-label="Canvas aspect ratio" title="Canvas — used by preview and export" value={canvas.aspect} onChange={(e) => setCanvas((c) => ({ ...c, aspect: e.target.value as Aspect }))} disabled={exporting}
            className="mr-1 h-8 rounded-md border border-line bg-ink-950 px-2.5 text-xs text-fg hover:border-white/20 focus:border-accent-500 focus:outline-none transition-colors cursor-pointer">
            <option value="source">Canvas: Original</option><option value="9:16">Canvas: 9:16 vertical</option><option value="1:1">Canvas: 1:1 square</option><option value="16:9">Canvas: 16:9 landscape</option>
          </select>
          <IconButton icon="undo" label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo || exporting} />
          <IconButton icon="redo" label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo || exporting} />
          <span className="mx-1.5 h-4 w-px bg-line" />
          {keysBtn}
          <IconButton icon="folder" label="Load project" onClick={() => projInput.current?.click()} disabled={exporting} />
          <IconButton icon="save" label="Save project file" onClick={saveProject} disabled={exporting} />
          <button className={`${btnPrimary} ml-2 h-8`} onClick={doExport} disabled={!hasVideo || exporting} title="Render the selected range with captions to a video file">
            <Icon name="download" size={15} />Export
          </button>
        </div>
        <input ref={fileInput} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openVideo(f); e.target.value = '' }} />
        <input ref={projInput} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadProject(f); e.target.value = '' }} />
      </header>

      <div className="grid min-h-0 grid-cols-[68px_minmax(0,1fr)_340px] xl:grid-cols-[68px_minmax(0,1fr)_372px]">
        <nav aria-label="Tools" className="flex flex-col items-stretch gap-1 border-r border-line bg-ink-900 px-1.5 py-2">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)} aria-current={tool === t.id} title={t.sub}
              className={`relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-lg text-[11px] transition-colors ${tool === t.id ? 'bg-accent-500/15 text-white' : 'text-mute hover:bg-ink-800 hover:text-fg'}`}>
              {tool === t.id && <span className="absolute -left-1.5 bottom-3 top-3 w-0.5 rounded-full bg-accent-400" />}
              <Icon name={t.icon} size={20} className={tool === t.id ? 'text-accent-300' : ''} />
              {t.label}
            </button>
          ))}
        </nav>

        <main className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto_auto_auto]">
          <div className="relative min-h-0 p-4" style={{ background: 'radial-gradient(ellipse at 50% 30%, #14151b 0%, #0a0b0e 75%)' }}>
            <Stage
              videoRef={videoRef} url={url} dims={outSize} canvas={canvas} time={time} frameTick={frameTick} captions={captions} style={style}
              selId={selId} fontTick={fontTick} onSelect={setSelId} onTogglePlay={togglePlay}
              onMove={(id, x, y) => updateCaption(id, { x, y })} videoProps={videoProps}
            />
            {!url && (
              <div
                className={`absolute inset-4 grid place-items-center rounded-2xl border transition-all duration-200 ${
                  dragOver
                    ? 'border-accent-400 bg-accent-500/15 ring-4 ring-accent-400/20'
                    : 'border-white/10 bg-gradient-to-b from-ink-900/40 via-ink-950/70 to-ink-950/90'
                }`}
              >
                <div className="relative flex w-full max-w-md flex-col items-center p-6 text-center">
                  {recoverInfo && pendingRecover && (
                    <div className="mb-4 w-full">
                      <RecoverCard info={recoverInfo} onRestore={restore} onDiscard={discard} />
                    </div>
                  )}

                  <div className="relative mb-5">
                    <div className="absolute -inset-2 rounded-full bg-accent-500/20 blur-xl" />
                    <button
                      onClick={() => fileInput.current?.click()}
                      className="group relative grid h-16 w-16 place-items-center rounded-2xl border border-accent-500/40 bg-gradient-to-b from-accent-500/20 to-accent-600/10 text-accent-300 shadow-[0_0_30px_rgba(139,124,246,0.3)] transition-all duration-200 hover:scale-105 hover:border-accent-400 hover:text-white"
                      title="Choose video file"
                    >
                      <Icon name="upload" size={28} />
                    </button>
                  </div>

                  <h3 className="font-display text-xl font-bold tracking-tight text-white">
                    Drop your footage to start
                  </h3>
                  <p className="mt-2 max-w-xs text-xs leading-relaxed text-mute">
                    Drag and drop any raw clip or click below. CutPilot creates AI drafts and burns kinetic captions on your device.
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() => fileInput.current?.click()}
                      className={`${btnPrimary} h-9 px-5 shadow-[0_0_20px_rgba(139,124,246,0.35)]`}
                    >
                      <Icon name="folder" size={15} />
                      <span>Choose video file</span>
                    </button>
                    <Link
                      to="/"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-ink-800 px-3 text-xs text-mute transition-colors hover:border-white/20 hover:text-fg"
                    >
                      <Icon name="left" size={13} />
                      <span>Landing page</span>
                    </Link>
                  </div>

                  {/* Compatibility Badges */}
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-2 border-t border-white/[0.08] pt-5 text-[11px] text-mute">
                    <span className="rounded-md border border-white/5 bg-ink-850 px-2 py-0.5">MP4 / H.264</span>
                    <span className="rounded-md border border-white/5 bg-ink-850 px-2 py-0.5">WebM</span>
                    <span className="rounded-md border border-white/5 bg-ink-850 px-2 py-0.5">MOV</span>
                    <span className="rounded-md border border-white/5 bg-ink-850 px-2 py-0.5">Up to 4K</span>
                    <span className="flex items-center gap-1 rounded-md border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-teal-300">
                      <Icon name="check" size={11} /> 100% On-Device
                    </span>
                  </div>
                </div>
              </div>
            )}
            {loading && <div className="absolute inset-4 grid place-items-center rounded-xl bg-black/60 text-sm text-fg" role="status">Reading video…</div>}
            {note && (
              <div role={note.kind === 'error' ? 'alert' : 'status'}
                className={`absolute inset-x-4 bottom-4 mx-auto flex max-w-xl items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm shadow-xl backdrop-blur ${note.kind === 'error' ? 'border-red-400/30 bg-red-950/90 text-red-100' : 'border-line bg-ink-800/95 text-fg'}`}>
                <Icon name={note.kind === 'error' ? 'alert' : 'check'} size={16} className={`mt-0.5 shrink-0 ${note.kind === 'error' ? 'text-red-300' : 'text-accent-400'}`} />
                <span className="flex-1 leading-snug">{note.text}</span>
                <button className="text-mute transition-colors hover:text-white" onClick={() => setNote(null)} aria-label="Dismiss message"><Icon name="x" size={15} /></button>
              </div>
            )}
          </div>

          <div className="flex h-12 items-center gap-2 border-t border-line bg-ink-900 px-4">
            <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause (Space)' : 'Play (Space)'} onClick={togglePlay} disabled={!hasVideo || exporting} size="lg" tone="accent" />
            <IconButton icon="loop" label={clipMode ? 'Play the edit from the start' : 'Play selected range only'} onClick={playSelection} disabled={!hasVideo || exporting} />
            <span className="ml-2 text-sm tabular-nums text-fg">{fmt(time)}<span className="text-dim"> / {fmt(duration)}</span></span>
            <span className="ml-auto flex items-center gap-1.5">
              <button className={btn} onClick={setIn} disabled={!hasVideo || exporting || (clipMode && !selClip)} title={clipMode ? 'Set the selected clip\'s start to the playhead (I)' : 'Set trim start to playhead (I)'}><Icon name="markIn" size={15} />In</button>
              <button className={btn} onClick={setOut} disabled={!hasVideo || exporting || (clipMode && !selClip)} title={clipMode ? 'Set the selected clip\'s end to the playhead (O)' : 'Set trim end to playhead (O)'}><Icon name="markOut" size={15} />Out</button>
              <IconButton icon="reset" label={clipMode ? 'Reset trim (clips are active — manage them in the Draft tab)' : 'Reset trim to full video'} onClick={() => setTrim({ start: 0, end: duration })} disabled={!hasVideo || exporting || clipMode} />
              <span className="ml-2 min-w-[132px] text-right text-xs tabular-nums text-mute" title={clipMode ? `Length of all ${clips.length} clips together` : 'Length that will be exported'}>Export length <span className="text-fg">{fmt(selDur)}</span></span>
            </span>
          </div>

          <SequenceBar clips={clips} ranges={ranges} time={time} selId={selClipId} disabled={!hasVideo || exporting} onSelect={selectClip} onSeek={seekSource} />

          <Timeline
            duration={duration} time={time} trim={trim} captions={captions} selId={selId} disabled={!hasVideo || exporting} label={file?.name ?? ''} url={url}
            onSeek={seek} onTrim={setTrim} onSelect={selectFromTimeline} onUpdate={updateCaption}
            clips={clips} selClipId={selClipId} onSelectClip={selectClip} onClipRange={updateClipRange}
          />
        </main>

        <aside className="flex min-h-0 flex-col border-l border-line bg-ink-900">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-base font-semibold">{curTool.title}</h2>
            <p className="text-xs text-mute">{curTool.sub}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            {tool === 'media' && (
              <MediaPanel file={file} dims={dims} duration={duration} selection={selDur} canvas={canvas} outSize={outSize}
                recover={pendingRecover ? recoverInfo : null} onRestore={restore} onDiscard={discard}
                onCanvas={(c) => setCanvas((cv) => ({ ...cv, ...c }))}
                onOpen={() => fileInput.current?.click()} onSaveProject={saveProject} onLoadProject={() => projInput.current?.click()} />
            )}
            {tool === 'captions' && (
              <CaptionsPanel
                captions={captions} selId={selId} time={time} hasVideo={hasVideo} density={density} suggestedWords={suggestedWords}
                onSelect={setSelId} onAdd={addCaption} onUpdate={updateCaption} onDelete={deleteCaption}
                onClear={() => { setCaptions([]); setSelId(null) }} onDensity={changeDensity} onApplyEmojis={applyEmojis}
                onImportText={importText} onImportSrt={(f) => void importSrt(f)}
                onDownloadSrt={() => download(new Blob([toSrt(captions)], { type: 'text/plain' }), `${baseName}.srt`)}
                onSeek={seek} onGoto={setTool}
              />
            )}
            {tool === 'styles' && (
              <StylesPanel
                style={targetStyle} presetId={targetPreset} scope={effScope} hasSelected={!!selCap} ownStyle={effScope === 'selected' && !!selCap?.style}
                hasCaptions={captions.length > 0} fontTick={fontTick}
                onScope={setScope} onApply={applyTemplate} onPatch={patchStyle} onReset={resetStyle} onUseGlobal={useGlobalStyle} onSetAllY={setAllY}
              />
            )}
            {tool === 'draft' && (
              <DraftPanel clips={clips} ranges={ranges} selId={selClipId} hasPlan={!!plan} hasVideo={hasVideo} busy={exporting} planApplied={!!plan?.appliedAt}
                onOpenDraft={() => setView('draft')} onSelect={(id) => { selectClip(id); const c = clips.find((k) => k.id === id); if (c) seekSource(c.start) }}
                onMove={moveClip} onRemove={removeClip} onRange={updateClipRange} onClear={clearClips} onRegenCaptions={regenCaptions} />
            )}
            {tool === 'ai' && <AiPanel hasVideo={hasVideo} ai={ai} selection={Math.max(0, trim.end - trim.start)} density={density} lastRun={lastRun} onDensity={changeDensity} onTranscribe={(m) => void runTranscribe(m)} />}
            {tool === 'assistant' && (
              <AssistantPanel
                snapshot={{
                  captionsCount: captions.length,
                  templateName: templateById(presetId)?.name ?? 'Custom',
                  canvasAspect: canvas.aspect,
                  duration,
                  clipsCount: clips.length,
                  trim,
                }}
                onDensity={(n) => changeDensity(n)}
                onApplyTemplate={(t) => applyTemplate(t)}
                onSetAllY={(y) => setAllY(y)}
                onSetCanvas={(aspect) => setCanvas((cv) => ({ ...cv, aspect }))}
                onClearCaptions={() => setCaptions([])}
                onTrim={(tr) => setTrim((cur) => ({ start: tr.start ?? cur.start, end: tr.end ?? cur.end }))}
                onUndo={undo}
                onRedo={redo}
              />
            )}
          </div>
        </aside>
      </div>

      {view === 'draft' && (
        <DraftScreen
          url={url} hasVideo={hasVideo} loading={loading || (!hasVideo && !!file)} duration={duration} fileName={file?.name ?? ''} largeFile={(file?.size ?? 0) > 500e6}
          brief={brief} onBrief={setBrief} plan={plan} onPlan={changePlan} job={ai} error={draftError} captionCount={captions.length} applied={!!plan?.appliedAt}
          onAnalyze={(m) => void analyze(m)} onUseCaptions={draftFromCaptions} onCancel={cancelDraft} onRebuild={rebuildPlan}
          onDiscardPlan={() => { changePlan(null); setDraftError(null) }} onApply={applyPlan} onClose={() => setView('editor')}
        />
      )}

      {showKeys && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={() => setShowKeys(false)}>
          <div className="w-full max-w-md rounded-xl border border-line bg-ink-850 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Keyboard shortcuts</h2>
              <button className="text-mute hover:text-white" onClick={() => setShowKeys(false)} aria-label="Close"><Icon name="x" size={16} /></button>
            </div>
            <dl className="space-y-1.5">
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-mute">{d}</dt>
                  <dd className="shrink-0 rounded border border-line bg-ink-800 px-2 py-0.5 text-xs text-fg">{k}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-dim">Shortcuts are ignored while you type in a text field. There is no clip-splitting shortcut yet: clips come from an applied first draft. With clips, I / O move the selected clip's edges.</p>
          </div>
        </div>
      )}

      {exporting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Exporting">
          <div className="w-full max-w-md rounded-xl border border-line bg-ink-850 p-6 shadow-2xl">
            <h2 className="font-display text-lg font-semibold">Rendering your cut</h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">{outSize.w}×{outSize.h}. The clip plays in real time while it's recorded with captions burned in. Keep this tab visible until it finishes.</p>
            {ranges.length > 1 && (
              <p className="mt-2 text-xs leading-relaxed text-dim">
                A brief audio fade occurs at each cut between clips — this is inherent to browser-based real-time recording. For seamless cuts, keep clips long or minimise the number of cuts.
              </p>
            )}
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-ink-700"><div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${Math.round((exportPct ?? 0) * 100)}%` }} /></div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm tabular-nums text-fg">{Math.round((exportPct ?? 0) * 100)}%</span>
              <button className={btn} onClick={() => abort.current?.abort()}>Cancel export</button>
            </div>
          </div>
        </div>
      )}

      {narrowWarn && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-3 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-lg border border-amber-500/40 bg-ink-900/95 px-4 py-2 text-xs text-amber-200 shadow-2xl backdrop-blur"
        >
          <span>CutPilot is optimised for desktop (920 px or more). The editor may scroll horizontally on this display.</span>
          <button
            onClick={() => setNarrowWarn(false)}
            className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-amber-300 hover:bg-white/10 focus:outline-none"
            aria-label="Dismiss narrow viewport warning"
          >
            Dismiss
          </button>
        </aside>
      )}
    </div>
  )
}
