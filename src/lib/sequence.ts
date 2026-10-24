import type { Clip, Trim } from '../types'

/**
 * Edit model. The original video is never modified. An edit is an ordered list of source-time ranges:
 *  - with clips: the clips, in array order, are the edit;
 *  - without clips: the single trim range is the edit (the original CutPilot behaviour).
 * Everything that plays, draws or exports the edit goes through `sequenceRanges`, so they cannot disagree.
 */
export interface Range { start: number; end: number }

/** Shortest range the editor will create or accept. */
export const MIN_RANGE = 0.3
const EPS = 1e-6

export const sequenceRanges = (clips: readonly Clip[], trim: Trim): Range[] =>
  clips.length ? clips.map(({ start, end }) => ({ start, end })) : [{ start: trim.start, end: trim.end }]

export const totalLength = (ranges: readonly Range[]) => ranges.reduce((a, r) => a + Math.max(0, r.end - r.start), 0)

/** Index of the range containing source time `t` (start inclusive, end exclusive), or -1. */
export function locate(ranges: readonly Range[], t: number): number {
  return ranges.findIndex((r) => t >= r.start - EPS && t < r.end - EPS)
}

/** Source time -> time on the edited sequence, or null when `t` lies outside every range. */
export function sourceToSequence(ranges: readonly Range[], t: number): number | null {
  const i = locate(ranges, t)
  if (i < 0) return null
  let acc = 0
  for (let k = 0; k < i; k++) acc += ranges[k].end - ranges[k].start
  return acc + (t - ranges[i].start)
}

/** Sequence time -> source time (clamped to the sequence). Returns the range index too. */
export function sequenceToSource(ranges: readonly Range[], s: number): { t: number; index: number } {
  if (!ranges.length) return { t: 0, index: -1 }
  let rest = Math.max(0, s)
  for (let i = 0; i < ranges.length; i++) {
    const len = ranges[i].end - ranges[i].start
    if (rest < len || i === ranges.length - 1) return { t: ranges[i].start + Math.min(rest, len), index: i }
    rest -= len
  }
  return { t: ranges[0].start, index: 0 }
}

export type Advance =
  | { type: 'continue'; index: number }
  | { type: 'seek'; index: number; to: number }
  | { type: 'stop' }

/**
 * Decides what the preview should do on each tick while playing `ranges` in sequence order.
 * `index` is the range being played, `t` the video's source time.
 *  - inside the current range: keep playing;
 *  - just reached its end: go to the NEXT range in sequence order (never "whatever happens to be next in the source"),
 *    seeking unless that range starts exactly where this one ended; stop after the last range;
 *  - the user scrubbed somewhere else: follow them if they landed inside a range, otherwise carry on with the next range.
 */
export function advance(ranges: readonly Range[], index: number, t: number, lead = 0.02): Advance {
  if (!ranges.length) return { type: 'stop' }
  const cur = ranges[index]
  if (cur) {
    if (t >= cur.start - 0.25 && t < cur.end - lead) return { type: 'continue', index }
    const justEnded = t >= cur.end - lead && t < cur.end + 0.5
    if (!justEnded) {
      const here = locate(ranges, t)
      if (here >= 0 && t < ranges[here].end - lead) return { type: 'continue', index: here }
    }
  } else {
    const here = locate(ranges, t)
    if (here >= 0) return { type: 'continue', index: here }
  }
  const next = index + 1
  if (next >= ranges.length) return { type: 'stop' }
  if (cur && Math.abs(ranges[next].start - cur.end) < 0.02 && t < ranges[next].start + 0.5) return { type: 'continue', index: next }
  return { type: 'seek', index: next, to: ranges[next].start }
}

/** Where pressing play should begin: the playhead if it is inside the edit, else the start of the first range. */
export function playStart(ranges: readonly Range[], t: number): { t: number; index: number } {
  const i = locate(ranges, t)
  if (i >= 0 && t < ranges[i].end - 0.05) return { t, index: i }
  return { t: ranges[0]?.start ?? 0, index: 0 }
}

export function clampRange(start: number, end: number, duration: number, minLen = MIN_RANGE): Range {
  let s = Math.min(Math.max(0, start), Math.max(0, duration - minLen))
  let e = Math.min(Math.max(end, s + minLen), duration)
  if (e - s < minLen) s = Math.max(0, e - minLen)
  return { start: s, end: e }
}

/** First clip (other than `ignoreId`) whose range overlaps [start, end). */
export function findOverlap(clips: readonly Clip[], start: number, end: number, ignoreId?: string): Clip | undefined {
  return clips.find((c) => c.id !== ignoreId && start < c.end - EPS && end > c.start + EPS)
}

/**
 * Moves/resizes one clip without letting it overlap another clip in SOURCE time (overlaps would repeat footage).
 * Edges stop at the nearest neighbouring clip. Returns null when the clip does not exist.
 */
export function constrainClip(clips: readonly Clip[], id: string, start: number, end: number, duration: number): Range | null {
  const me = clips.find((c) => c.id === id)
  if (!me) return null
  const others = clips.filter((c) => c.id !== id)
  const lo = Math.max(0, ...others.filter((c) => c.end <= me.start + EPS).map((c) => c.end))
  const hi = Math.min(duration, ...others.filter((c) => c.start >= me.end - EPS).map((c) => c.start))
  let s = Math.max(lo, start)
  let e = Math.min(hi, end)
  if (e - s < MIN_RANGE) {
    // keep the edge the user is NOT dragging, honouring the minimum length where room allows
    if (Math.abs(start - me.start) > Math.abs(end - me.end)) s = Math.max(lo, e - MIN_RANGE)
    else e = Math.min(hi, s + MIN_RANGE)
  }
  return { start: s, end: Math.max(e, s) }
}

export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length) return [...arr]
  const out = [...arr]
  const [x] = out.splice(from, 1)
  out.splice(Math.min(Math.max(0, to), out.length), 0, x)
  return out
}

/** Merges ranges that touch or overlap, sorted by start. */
export function mergeRanges(ranges: readonly Range[], gap = 0): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const out: Range[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && r.start <= last.end + gap) last.end = Math.max(last.end, r.end)
    else out.push({ ...r })
  }
  return out
}

export interface Pause { start: number; end: number }

/**
 * Cuts the long pauses out of a range, keeping `pad` seconds of each side so speech is not clipped.
 * Pauses shorter than `2 * pad + MIN_RANGE` are left alone. Pieces shorter than MIN_RANGE are dropped.
 */
export function splitAtPauses(range: Range, pauses: readonly Pause[], pad = 0.18): Range[] {
  const cuts = mergeRanges(
    pauses
      .filter((p) => p.end > range.start && p.start < range.end)
      .map((p) => ({ start: Math.max(p.start, range.start) + pad, end: Math.min(p.end, range.end) - pad }))
      .filter((p) => p.end - p.start >= MIN_RANGE),
  )
  const out: Range[] = []
  let cursor = range.start
  for (const c of cuts) {
    if (c.start - cursor >= MIN_RANGE) out.push({ start: cursor, end: c.start })
    cursor = c.end
  }
  if (range.end - cursor >= MIN_RANGE) out.push({ start: cursor, end: range.end })
  return out.length ? out : [{ ...range }]
}

// ---------- time text ----------
/** Accepts "83.5", "1:23.5", "0:01:23" (h:mm:ss) and returns seconds, or null if it is not a time. */
export function parseTime(input: string): number | null {
  const s = input.trim().replace(',', '.')
  if (!s) return null
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s)
  const m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/)
  if (!m) return null
  const sec = Number(m[3])
  if (sec >= 60) return null
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + sec
}

/** Rebuilds a trustworthy clip list from untrusted data (a project file, autosave): drops junk, clamps to the video, fixes ids. */
export function sanitizeClips(raw: unknown, duration: number, makeId: () => string): Clip[] {
  if (!Array.isArray(raw)) return []
  const out: Clip[] = []
  for (const c of raw as Partial<Clip>[]) {
    if (!c || typeof c !== 'object') continue
    let s = Number(c.start), e = Number(c.end)
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue
    if (duration > 0) { s = Math.min(Math.max(0, s), duration); e = Math.min(Math.max(0, e), duration) }
    if (e - s < MIN_RANGE) continue
    out.push({ id: typeof c.id === 'string' && c.id ? c.id : makeId(), start: s, end: e, ...(typeof c.label === 'string' ? { label: c.label } : {}), ...(typeof c.suggestionId === 'string' ? { suggestionId: c.suggestionId } : {}) })
  }
  return out
}
