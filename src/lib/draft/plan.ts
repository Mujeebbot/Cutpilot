import type { Word } from '../../types'
import type { BriefGoals } from './brief'
import { contentTerms } from './brief'
import type { Pause, Range } from '../sequence'
import { MIN_RANGE, splitAtPauses } from '../sequence'

/**
 * First-draft planner.
 *
 * What is model output and what is not:
 *  - The WORDS and their timestamps come from Whisper running on this device (or from captions the creator already had).
 *  - Everything in this file is a RULE-BASED HEURISTIC over those words: sentence splitting, pause detection from gaps
 *    between word timestamps, and keyword/pattern scoring. It does not understand meaning, tone, visuals or audio.
 */

export interface Sentence { index: number; start: number; end: number; words: Word[]; text: string }

/** One scoring rule that fired. `weight` is its contribution to the score. */
export interface Reason { id: string; text: string; effect: 'plus' | 'minus' | 'info'; weight: number }

export interface Opening { text: string; start: number; end: number; hookScore: number; reasons: Reason[] }

export type Decision = 'pending' | 'accepted' | 'rejected'

export interface Suggestion {
  id: string
  /** Current range (the creator may have edited it). */
  start: number
  end: number
  /** Range as first proposed, so edits can be reset. */
  originalStart: number
  originalEnd: number
  score: number
  reasons: Reason[]
  /** The line this clip opens on, with its own hook score. */
  opening: Opening
  /** 1 = the strongest opening line among all suggestions. */
  openingRank: number
  /** Part of the best-scoring set that fits the target length. */
  fitsTarget: boolean
  /** Long pauses found inside the range (from gaps between word timestamps). */
  pauses: Pause[]
  keywords: string[]
  status: Decision
  edited: boolean
}

export interface PlanOptions {
  /** Gap between two words that counts as a long pause. */
  pauseThreshold: number
  /** Cut long pauses out of accepted clips when applying. */
  removePauses: boolean
  /** 'hook-first' puts the clip with the strongest opening first; 'source' keeps original order. */
  order: 'source' | 'hook-first'
  /** Generate captions for the accepted clips when applying. */
  captions: boolean
}

export interface TranscriptSource {
  kind: 'whisper' | 'captions'
  model: string | null
  /** true = Whisper gave a timestamp for every word; false = approximated inside segments. */
  precise: boolean
}

export interface DraftPlan {
  version: 1
  createdAt: number
  duration: number
  transcript: TranscriptSource & { words: Word[] }
  goals: BriefGoals
  options: PlanOptions
  suggestions: Suggestion[]
  /** Things the creator should know about the quality of this draft. */
  limitations: string[]
  appliedAt?: number
}

// ---------------------------------------------------------------- sentences & pauses
const SENTENCE_END = /[.?!…]["'”’)\]]*$/

export function buildSentences(words: readonly Word[], maxGap = 0.9, maxWords = 30): Sentence[] {
  const out: Sentence[] = []
  let cur: Word[] = []
  const flush = () => {
    if (!cur.length) return
    out.push({ index: out.length, start: cur[0].s, end: cur[cur.length - 1].e, words: cur, text: cur.map((w) => w.t).join(' ') })
    cur = []
  }
  for (const w of words) {
    const prev = cur[cur.length - 1]
    if (prev && (SENTENCE_END.test(prev.t) || w.s - prev.e > maxGap || cur.length >= maxWords)) flush()
    cur.push(w)
  }
  flush()
  return out
}

/** Silences between consecutive words that last at least `minGap` seconds. Derived from timestamps, not from audio levels. */
export function findPauses(words: readonly Word[], minGap = 0.8): Pause[] {
  const out: Pause[] = []
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].s - words[i - 1].e
    if (gap >= minGap) out.push({ start: words[i - 1].e, end: words[i].s })
  }
  return out
}

// ---------------------------------------------------------------- scoring rules
const HOOK_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bhere'?s (?:the|what|why|how)\b/i, label: 'a setup phrase' },
  { re: /\bthe (?:secret|truth|reason|problem|mistake|one thing|real)\b/i, label: 'a reveal phrase' },
  { re: /\bnobody (?:tells|talks|knows|told|will tell)\b/i, label: 'an insider-knowledge phrase' },
  { re: /\bmost people\b/i, label: 'a claim about most people' },
  { re: /\bwhat if\b/i, label: 'a question opener' },
  { re: /\b(?:stop|never|don'?t) (?:doing|ever|making|using|do|do this)\b/i, label: 'a warning' },
  { re: /\bI (?:learned|discovered|realized|realised|found out|wish I|made a)\b/i, label: 'a personal-discovery phrase' },
  { re: /\b(?:let me|I'?ll|I will) (?:show|tell|explain|break)\b/i, label: 'a promise to show or explain' },
  { re: /\b(?:biggest|worst|best|first|only|number one) (?:thing|mistake|reason|way|lesson|tip|problem)\b/i, label: 'a superlative' },
  { re: /\bwhy (?:you|I|we|most|does|do|is|are)\b/i, label: 'a question opener' },
]
const STRONG_WORDS = new Set(['never', 'always', 'free', 'secret', 'best', 'worst', 'million', 'billion', 'thousand', 'huge', 'insane', 'crazy', 'impossible', 'amazing', 'powerful', 'biggest', 'proven', 'nobody', 'everyone', 'everything', 'nothing', 'truth', 'hate', 'money', 'stop', 'mistake', 'wrong', 'failed', 'dangerous', 'shocking'])
const NUMBER_WORDS = /\b(?:hundred|thousand|million|billion|percent|dollars?|bucks|times|x)\b/i
const QUESTION_START = /^(?:what|why|how|when|who|where|which|did|do|does|have|has|are|is|can|could|would|should|will)\b/i
const FILLER_TOKENS = new Set(['um', 'umm', 'uh', 'uhh', 'erm', 'hmm', 'mm', 'ah'])
const BOILERPLATE = /\b(?:thanks for (?:watching|listening)|see you (?:next|in the)|(?:like|hit) (?:and|the) (?:subscribe|like|bell)|subscribe|welcome back|hi everyone|hey guys|hello everyone|in today'?s (?:video|episode)|before we (?:get|dive))\b/i
const CONNECTIVE_START = /^(?:so|and|but|because|that'?s why|which means|then|now)\b/i

const norm = (t: string) => t.toLowerCase().replace(/^[^a-z0-9$%]+|[^a-z0-9%]+$/g, '')
const R = (id: string, text: string, weight: number): Reason => ({ id, text, effect: weight >= 0 ? 'plus' : 'minus', weight })

export interface Scored { sentence: Sentence; hook: number; score: number; reasons: Reason[]; hookReasons: Reason[] }

/**
 * Scores one sentence. `hook` uses only the "attention-grabbing" rules; `score` adds topic-match and quality rules.
 * Both are clamped to 0..1. Each rule that fired is returned with a plain-language reason.
 */
export function scoreSentence(s: Sentence, focusTerms: readonly string[] = []): Scored {
  const text = s.text
  const toks = s.words.map((w) => norm(w.t)).filter(Boolean)
  const hookReasons: Reason[] = []
  const quality: Reason[] = []

  if (/\?["'”’)]*$/.test(text) || (QUESTION_START.test(text) && toks.length >= 4 && /\?/.test(text))) hookReasons.push(R('question', 'Asks a direct question', 0.25))
  for (const p of HOOK_PATTERNS) {
    const m = text.match(p.re)
    if (m) { hookReasons.push(R('phrase', `Hook-style phrase (${p.label.replace(/^an? /, '')}): “${m[0]}”`, 0.3)); break }
  }
  const nums = text.match(/\$?\d[\d,.]*%?/g)
  if (nums || NUMBER_WORDS.test(text)) hookReasons.push(R('number', `Contains a number or figure${nums ? ` (${nums[0]})` : ''}`, 0.2))
  const strong = [...new Set(toks.filter((t) => STRONG_WORDS.has(t)))]
  if (strong.length) hookReasons.push(R('strong', `Strong wording: ${strong.slice(0, 3).join(', ')}`, Math.min(0.2, 0.1 * strong.length)))
  if (/\b(?:but|however|actually|instead|except|yet)\b/i.test(text)) hookReasons.push(R('contrast', 'Turns on a contrast (“but”, “actually”)', 0.08))
  if (/\byou(?:'re|r|'ll|'ve)?\b/i.test(text)) hookReasons.push(R('address', 'Speaks directly to the viewer', 0.08))
  if (/!["'”’)]*$/.test(text)) hookReasons.push(R('exclaim', 'Ends on an exclamation', 0.05))

  const matched = focusTerms.filter((f) => toks.some((t) => t === f || t.startsWith(f) || (t.length >= 5 && f.startsWith(t))))
  if (matched.length) quality.push(R('focus', `Mentions ${matched.slice(0, 3).map((m) => `“${m}”`).join(', ')} from your brief`, Math.min(0.3, 0.15 * matched.length)))

  if (BOILERPLATE.test(text)) quality.push(R('boilerplate', 'Reads like a greeting or sign-off', -0.25))
  if (toks.length < 4) quality.push(R('short', 'Very short fragment', -0.25))
  else if (toks.length > 32) quality.push(R('long', 'Very long sentence', -0.1))
  const fillers = toks.filter((t) => FILLER_TOKENS.has(t)).length + (text.match(/\byou know\b/gi)?.length ?? 0)
  if (toks.length && fillers / toks.length > 0.15) quality.push(R('filler', 'Mostly filler words (um, uh, you know)', -0.2))
  if (/^(?:um|uh|erm|hmm)\b/i.test(text)) quality.push(R('filler-start', 'Starts with a filler word', -0.08))

  const sum = (rs: Reason[]) => rs.reduce((a, r) => a + r.weight, 0)
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
  const hook = clamp01(sum(hookReasons))
  const reasons = [...hookReasons, ...quality].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
  return { sentence: s, hook, score: clamp01(0.15 + sum(hookReasons) + sum(quality)), reasons, hookReasons }
}

// ---------------------------------------------------------------- windows
interface Window { from: number; to: number; anchor: number }

/** Grows a clip forward from an anchor sentence until it is about `clipTarget` long, never across a long break in speech. */
function growWindow(S: Sentence[], anchor: number, clipTarget: number, maxBreak = 1.6): Window {
  let from = anchor
  if (anchor > 0 && CONNECTIVE_START.test(S[anchor].text) && S[anchor].start - S[anchor - 1].end < 0.9) from = anchor - 1
  let to = anchor
  while (to + 1 < S.length) {
    const next = S[to + 1]
    if (S[to].end - S[from].start >= clipTarget) break
    if (next.start - S[to].end > maxBreak) break
    if (next.end - S[from].start > clipTarget * 1.35) break
    to++
  }
  return { from, to, anchor }
}

/** Gives each range a little breathing room (lead-in before the first word, tail after the last) without crossing neighbours. */
export function padRanges(ranges: Range[], duration: number, lead = 0.12, tail = 0.3): Range[] {
  const sorted = ranges.map((r, i) => ({ ...r, i })).sort((a, b) => a.start - b.start)
  const out: (Range & { i: number })[] = sorted.map((r) => ({ i: r.i, start: Math.max(0, r.start - lead), end: Math.min(duration, r.end + tail) }))
  for (let k = 1; k < out.length; k++) {
    const prev = out[k - 1], cur = out[k]
    if (cur.start < prev.end) {
      const mid = (sorted[k - 1].end + sorted[k].start) / 2
      prev.end = Math.min(prev.end, Math.max(sorted[k - 1].end, mid))
      cur.start = Math.max(cur.start, Math.min(sorted[k].start, mid))
    }
  }
  return out.sort((a, b) => a.i - b.i).map(({ start, end }) => ({ start, end }))
}

export const defaultOptions = (goals: BriefGoals): PlanOptions => ({
  pauseThreshold: 0.8, removePauses: goals.removePauses, order: goals.strongestOpening ? 'hook-first' : 'source', captions: goals.captions === 'on',
})

export const DEFAULT_TARGET_SECONDS = 45
/** Windows shorter than this are not proposed as stand-alone clips (seconds of speech). */
const MIN_SUGGESTION = 4

export function keptLength(s: { start: number; end: number; pauses: Pause[] }, removePauses: boolean): number {
  const r = { start: s.start, end: s.end }
  return removePauses ? splitAtPauses(r, s.pauses).reduce((a, p) => a + p.end - p.start, 0) : r.end - r.start
}

export interface BuildInput {
  words: readonly Word[]
  duration: number
  goals: BriefGoals
  source: TranscriptSource
  options?: Partial<PlanOptions>
  now?: number
  makeId?: () => string
}

export function buildPlan(input: BuildInput): DraftPlan {
  const { duration, goals, source } = input
  const words = input.words.filter((w) => w.t && Number.isFinite(w.s) && Number.isFinite(w.e) && w.e >= w.s && w.s < duration + 0.5)
  let n = 0
  const makeId = input.makeId ?? (() => `s${++n}`)
  const options: PlanOptions = { ...defaultOptions(goals), ...input.options }
  const limitations: string[] = [
    'Suggestions come from keyword and sentence-structure rules applied to the transcript. CutPilot does not understand the video’s meaning, visuals, tone or audio, so treat every pick as a starting point.',
  ]
  if (!source.precise) limitations.push('This transcript only has segment-level timestamps; word timing inside each segment is estimated, so cut points can be off by a fraction of a second.')
  if (source.kind === 'captions') limitations.push('The transcript was taken from captions already in the project, so its accuracy is whatever those captions had.')

  const base: DraftPlan = {
    version: 1, createdAt: input.now ?? Date.now(), duration, transcript: { ...source, words }, goals, options, suggestions: [], limitations,
  }
  if (words.length < 5) {
    limitations.push('Not enough speech was found to propose clips.')
    return base
  }

  const S = buildSentences(words)
  const pauses = findPauses(words, options.pauseThreshold)
  const scored = S.map((s) => scoreSentence(s, goals.focusTerms))
  const speechSpan = words[words.length - 1].e - words[0].s
  const target = Math.min(Math.max(goals.targetSeconds ?? DEFAULT_TARGET_SECONDS, 3), duration)
  if (goals.targetSeconds === null) limitations.push(`Your brief did not state a length, so ${DEFAULT_TARGET_SECONDS}s was assumed. You can change the target below.`)

  const wanted = Math.max(1, Math.min(6, Math.round(target / 20)))
  const clipTarget = Math.min(Math.max(target / wanted, 6), 40)

  // Short footage: the whole speech is already within the target, so propose it as one clip.
  let windows: Window[]
  if (speechSpan <= target * 1.1) {
    const anchor = scored.reduce((b, s) => (s.hook > scored[b].hook ? s.sentence.index : b), 0)
    windows = [{ from: 0, to: S.length - 1, anchor }]
    limitations.push('The speech is already shorter than the target length, so the whole thing is proposed as one clip.')
  } else {
    // anchors: best sentences first; each grows into a window; windows may not share sentences
    const taken = new Set<number>()
    windows = []
    const order = [...scored].sort((a, b) => b.score - a.score || a.sentence.index - b.sentence.index)
    const maxWindows = Math.min(8, wanted + 3)
    for (const a of order) {
      if (windows.length >= maxWindows) break
      if (a.score <= 0.18 || taken.has(a.sentence.index)) continue
      const w = growWindow(S, a.sentence.index, clipTarget)
      if (S[w.to].end - S[w.from].start < MIN_SUGGESTION) continue // too short to stand alone as a clip
      let clash = false
      for (let i = w.from; i <= w.to; i++) if (taken.has(i)) { clash = true; break }
      if (clash) continue
      for (let i = w.from; i <= w.to; i++) taken.add(i)
      windows.push(w)
    }
  }
  windows.sort((a, b) => a.from - b.from)

  const raw: Range[] = windows.map((w) => ({ start: S[w.from].start, end: S[w.to].end }))
  const padded = padRanges(raw, duration)

  const suggestions: Suggestion[] = windows.map((w, i) => {
    const slice = scored.slice(w.from, w.to + 1)
    const anchor = scored[w.anchor]
    const span = Math.max(0.5, raw[i].end - raw[i].start)
    const speechWords = S.slice(w.from, w.to + 1).reduce((a, s) => a + s.words.length, 0)
    const density = Math.min(1, speechWords / span / 3)
    const max = Math.max(...slice.map((s) => s.score))
    const mean = slice.reduce((a, s) => a + s.score, 0) / slice.length
    const score = Math.min(1, 0.5 * max + 0.35 * mean + 0.15 * density)

    // reasons: anchor's rules first, then the strongest from the rest, no repeats of the same rule
    const seen = new Set<string>()
    const reasons: Reason[] = []
    for (const r of [...anchor.reasons, ...slice.flatMap((s) => s.reasons).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))]) {
      const key = `${r.id}:${r.effect}`
      if (seen.has(key)) continue
      seen.add(key)
      reasons.push(r)
      if (reasons.length >= 4) break
    }
    if (density >= 0.8) reasons.push({ id: 'dense', text: `Dense speech (about ${(speechWords / span).toFixed(1)} words per second)`, effect: 'info', weight: 0 })
    const inside = pauses.filter((p) => p.start >= padded[i].start && p.end <= padded[i].end)
    if (inside.length) reasons.push({ id: 'pauses', text: `${inside.length} long pause${inside.length === 1 ? '' : 's'} inside (${inside.reduce((a, p) => a + p.end - p.start, 0).toFixed(1)}s total)`, effect: 'info', weight: 0 })

    const first = S[w.from]
    return {
      id: makeId(), start: padded[i].start, end: padded[i].end, originalStart: padded[i].start, originalEnd: padded[i].end,
      score, reasons, pauses: inside, status: 'pending' as Decision, edited: false, fitsTarget: false, openingRank: 0,
      opening: { text: first.text, start: first.start, end: first.end, hookScore: scored[first.index].hook, reasons: scored[first.index].hookReasons },
      keywords: topTerms(S.slice(w.from, w.to + 1).flatMap((s) => s.words), 3, goals.focusTerms),
    }
  })

  // opening rank: by the hook score of the line each clip opens on
  ;[...suggestions].sort((a, b) => b.opening.hookScore - a.opening.hookScore || b.score - a.score).forEach((s, i) => { s.openingRank = i + 1 })

  // best set that fits the target length (by score, then kept in source order for display)
  let used = 0
  for (const s of [...suggestions].sort((a, b) => b.score - a.score)) {
    const len = keptLength(s, options.removePauses)
    if (used === 0 || used + len <= target * 1.1) { s.fitsTarget = true; used += len }
  }
  if (suggestions.length && used > target * 1.1) limitations.push('Even the single best clip is longer than the target length; trim it in the review before accepting.')

  return { ...base, suggestions }
}

/** Most frequent content words in `words`, focus terms first. Lower-case. */
export function topTerms(words: readonly Word[], limit: number, focusTerms: readonly string[] = []): string[] {
  const count = new Map<string, number>()
  for (const w of words) for (const t of contentTerms(w.t)) if (t.length >= 4) count.set(t, (count.get(t) ?? 0) + 1)
  return [...count.entries()]
    .map(([t, c]) => ({ t, v: c + (focusTerms.some((f) => t.startsWith(f) || f.startsWith(t)) ? 2 : 0) + Math.min(t.length, 10) / 40 }))
    .sort((a, b) => b.v - a.v)
    .slice(0, limit)
    .map((x) => x.t)
}
