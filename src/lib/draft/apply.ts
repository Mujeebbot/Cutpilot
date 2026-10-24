import type { Caption, Clip, Word } from '../../types'
import type { DraftPlan, Decision, PlanOptions, Suggestion } from './plan'
import { buildSentences, findPauses, scoreSentence, topTerms } from './plan'
import type { Range } from '../sequence'
import { MIN_RANGE, splitAtPauses } from '../sequence'
import { groupWords } from '../captions'
import { uid } from '../util'

export interface PlanResult { plan: DraftPlan; error?: string }

const mmss = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`
const overlaps = (a: Range, b: Range) => a.start < b.end - 1e-6 && a.end > b.start + 1e-6
const patch = (plan: DraftPlan, id: string, f: (s: Suggestion) => Suggestion): DraftPlan => ({ ...plan, suggestions: plan.suggestions.map((s) => (s.id === id ? f(s) : s)) })

/** The accepted suggestion that `range` would collide with, if any. Overlaps would put the same footage in the edit twice. */
export function acceptedConflict(plan: DraftPlan, id: string, range: Range): Suggestion | undefined {
  return plan.suggestions.find((o) => o.id !== id && o.status === 'accepted' && overlaps(range, o))
}

export function setDecision(plan: DraftPlan, id: string, status: Decision): PlanResult {
  const s = plan.suggestions.find((x) => x.id === id)
  if (!s) return { plan, error: 'That suggestion no longer exists.' }
  if (status === 'accepted') {
    const c = acceptedConflict(plan, id, s)
    if (c) return { plan, error: `This overlaps an accepted clip (${mmss(c.start)}–${mmss(c.end)}). Adjust one of the ranges or reject that clip first.` }
  }
  return { plan: patch(plan, id, (x) => ({ ...x, status })) }
}

/** Pauses inside [start, end), recomputed from the transcript so they stay correct after the range is edited. */
export function pausesIn(plan: DraftPlan, start: number, end: number) {
  return findPauses(plan.transcript.words, plan.options.pauseThreshold).filter((p) => p.start >= start && p.end <= end)
}

/** Changes a suggestion's start/end. Validates, refreshes the opening line, pauses and keywords. */
export function editRange(plan: DraftPlan, id: string, start: number, end: number): PlanResult {
  const s = plan.suggestions.find((x) => x.id === id)
  if (!s) return { plan, error: 'That suggestion no longer exists.' }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { plan, error: 'Enter times like 12.5 or 0:12.5.' }
  if (start < 0 || end > plan.duration + 1e-6) return { plan, error: `Times must be between 0:00 and ${mmss(plan.duration)}.` }
  if (end - start < MIN_RANGE) return { plan, error: `A clip must be at least ${MIN_RANGE} seconds long.` }
  if (s.status === 'accepted') {
    const c = acceptedConflict(plan, id, { start, end })
    if (c) return { plan, error: `That range overlaps an accepted clip (${mmss(c.start)}–${mmss(c.end)}).` }
  }
  const words = plan.transcript.words.filter((w) => (w.s + w.e) / 2 >= start && (w.s + w.e) / 2 < end)
  const S = buildSentences(words)
  const first = S[0]
  const sc = first ? scoreSentence(first, plan.goals.focusTerms) : null
  return {
    plan: patch(plan, id, (x) => ({
      ...x, start, end, edited: start !== x.originalStart || end !== x.originalEnd,
      pauses: pausesIn(plan, start, end),
      opening: first && sc ? { text: first.text, start: first.start, end: first.end, hookScore: sc.hook, reasons: sc.hookReasons } : x.opening,
      keywords: topTerms(words, 3, plan.goals.focusTerms),
    })),
  }
}

export const resetRange = (plan: DraftPlan, id: string): PlanResult => {
  const s = plan.suggestions.find((x) => x.id === id)
  if (!s) return { plan, error: 'That suggestion no longer exists.' }
  // reset is allowed even if it would overlap: report it instead of silently accepting a conflict
  return editRange(plan, id, s.originalStart, s.originalEnd)
}

export const setOptions = (plan: DraftPlan, o: Partial<PlanOptions>): DraftPlan => {
  const options = { ...plan.options, ...o }
  const next = { ...plan, options }
  // changing the pause threshold changes which pauses sit inside each clip
  return o.pauseThreshold !== undefined ? { ...next, suggestions: next.suggestions.map((s) => ({ ...s, pauses: pausesIn(next, s.start, s.end) })) } : next
}

export const acceptedOf = (plan: DraftPlan) => plan.suggestions.filter((s) => s.status === 'accepted')

export interface DraftEdit { clips: Clip[]; skippedPauses: number; length: number }

/**
 * Turns approved suggestions into the clip list that the editor plays and exports.
 * Order: source order, or (when options.order is 'hook-first') the clip with the strongest opening line first.
 * With options.removePauses, each clip is split at its long pauses so those gaps are not in the edit.
 */
export function buildClips(plan: DraftPlan, makeId: () => string = uid): DraftEdit {
  const accepted = [...acceptedOf(plan)].sort((a, b) => a.start - b.start)
  let ordered = accepted
  if (plan.options.order === 'hook-first' && accepted.length > 1) {
    const best = accepted.reduce((b, s) => (s.openingRank < b.openingRank ? s : b))
    ordered = [best, ...accepted.filter((s) => s !== best)]
  }
  const clips: Clip[] = []
  let skipped = 0
  ordered.forEach((s, i) => {
    const pieces = plan.options.removePauses ? splitAtPauses({ start: s.start, end: s.end }, pausesIn(plan, s.start, s.end)) : [{ start: s.start, end: s.end }]
    skipped += plan.options.removePauses ? Math.max(0, pausesIn(plan, s.start, s.end).length) : 0
    const label = s.opening.text.length > 34 ? `${s.opening.text.slice(0, 33)}…` : s.opening.text
    pieces.forEach((p, k) => clips.push({ id: makeId(), start: p.start, end: p.end, label: pieces.length > 1 ? `${label} (${k + 1}/${pieces.length})` : label || `Clip ${i + 1}`, suggestionId: s.id }))
  })
  return { clips, skippedPauses: skipped, length: clips.reduce((a, c) => a + c.end - c.start, 0) }
}

/** Captions for the words inside each range, in SOURCE time (so they stay aligned with the footage). */
export function captionsForRanges(words: readonly Word[], ranges: readonly Range[], perCaption: 1 | 2 | 3): Caption[] {
  const out: Caption[] = []
  for (const r of ranges) {
    const inside = words.filter((w) => (w.s + w.e) / 2 >= r.start && (w.s + w.e) / 2 < r.end)
    for (const c of groupWords([...inside], perCaption)) {
      // a word that straddles a clip edge keeps its measured timing, but the caption itself never leaves the clip
      const start = Math.max(c.start, r.start), end = Math.min(c.end, r.end)
      if (end - start < 0.05) continue
      out.push({ ...c, start, end, origin: 'draft' })
    }
  }
  return out
}

/**
 * Replaces earlier unedited draft captions with fresh ones. Captions the creator typed, imported or edited are kept,
 * and a fresh caption is dropped when it would sit on top of one of those.
 */
export function mergeDraftCaptions(existing: readonly Caption[], fresh: readonly Caption[]): Caption[] {
  const kept = existing.filter((c) => !(c.origin === 'draft' && !c.edited))
  const clear = fresh.filter((f) => !kept.some((k) => Math.min(k.end, f.end) - Math.max(k.start, f.start) > 0.5 * (f.end - f.start)))
  return [...kept, ...clear]
}
