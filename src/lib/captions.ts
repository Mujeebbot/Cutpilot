import type { Caption, CaptionStyle, Word } from '../types'
import { DEFAULT_STYLE, nearestWeight } from '../types'
import { uid } from './util'

export const styleFor = (c: Caption, global: CaptionStyle) => c.style ?? global
export const hasEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s)

/** Accepts styles from older project files (bold flag, missing fields). */
export function normalizeStyle(raw: unknown): CaptionStyle {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const st = { ...DEFAULT_STYLE, ...r } as CaptionStyle & { bold?: boolean }
  if (typeof r.weight !== 'number') st.weight = r.bold ? 800 : 500
  st.weight = nearestWeight(st.font, st.weight)
  delete st.bold
  return st
}

export function normalizeCaption(c: Partial<Caption>): Caption {
  return {
    id: c.id ?? uid(), start: +(c.start ?? 0) || 0, end: +(c.end ?? 1) || 1, text: String(c.text ?? ''),
    x: c.x ?? 0.5, y: c.y ?? 0.8,
    words: Array.isArray(c.words) ? c.words : undefined, timing: c.timing, presetId: c.presetId, edited: c.edited, origin: c.origin === 'draft' ? 'draft' : undefined,
    style: c.style ? normalizeStyle(c.style) : undefined,
  }
}

// ---------- automatic keyword emphasis ----------
// Heuristic, text-only: numbers, ALL-CAPS words, capitalised mid-sentence words (likely names),
// a short list of strong words, and very long words. It does NOT analyse the audio, so it cannot detect vocal stress.
const STRONG = new Set(['never', 'always', 'free', 'secret', 'best', 'worst', 'million', 'billion', 'thousand', 'huge', 'insane', 'crazy', 'impossible', 'amazing', 'powerful', 'biggest', 'proven', 'nobody', 'everyone', 'everything', 'nothing', 'truth', 'love', 'hate', 'money', 'fire', 'stop'])
const core = (w: string) => w.replace(/^[^\p{L}\p{N}$€£]+/u, '').replace(/[^\p{L}\p{N}%]+$/u, '')

/** Returns the index of at most one emphasis word (restrained on purpose). */
export function autoKeywords(words: string[]): Set<number> {
  let best = -1, bestScore = 1
  words.forEach((raw, i) => {
    const w = core(raw)
    if (!w) return
    let score = 0
    if (/\d/.test(w)) score = 3
    else if (STRONG.has(w.toLowerCase())) score = 2
    else if (w.length >= 2 && w === w.toUpperCase() && /\p{L}/u.test(w)) score = 2
    else if (i > 0 && /^\p{Lu}\p{Ll}/u.test(w) && !/[.!?]$/.test(words[i - 1])) score = 2
    else if (w.length >= 10) score = 2
    if (score > bestScore) { best = i; bestScore = score }
    else if (score === bestScore && score >= 2 && best < 0) best = i
  })
  return best >= 0 ? new Set([best]) : new Set()
}

// ---------- word timing and grouping ----------
type SWord = Word & { src?: number }

/** Words of a caption: measured when available, otherwise spread across the caption by letter count (marked approximate). */
export function captionWords(c: Caption): Word[] {
  const toks = c.text.split(/\s+/).filter(Boolean)
  if (c.words && c.words.length === toks.length) return c.words.map((w, i) => ({ ...w, t: toks[i] }))
  const total = toks.reduce((a, w) => a + w.replace(/\*/g, '').length + 1, 0) || 1
  const dur = Math.max(c.end - c.start, 0.05)
  let acc = 0
  return toks.map((t) => {
    const len = t.replace(/\*/g, '').length + 1
    const w: Word = { t: t.replace(/\*/g, ''), s: c.start + (dur * acc) / total, e: c.start + (dur * (acc + len)) / total, a: true }
    acc += len
    return w
  })
}

/** Groups timed words into captions of `n` words, breaking early on long pauses. */
export function groupWords(words: SWord[], n: number, sources?: Caption[]): Caption[] {
  const out: Caption[] = []
  let cur: SWord[] = []
  const flush = () => {
    if (!cur.length) return
    const src = sources && cur[0].src !== undefined ? sources[cur[0].src] : undefined
    const c: Caption = {
      id: uid(), start: cur[0].s, end: cur[cur.length - 1].e, text: cur.map((w) => w.t).join(' '),
      x: src?.x ?? 0.5, y: src?.y ?? 0.8,
      words: cur.map(({ t, s, e, a }) => ({ t, s, e, ...(a ? { a } : {}) })),
      timing: cur.every((w) => !w.a) ? 'word' : 'segment',
      style: src?.style, presetId: src?.presetId,
    }
    out.push(c)
    cur = []
  }
  for (const w of words) {
    if (cur.length && (cur.length >= n || w.s - cur[cur.length - 1].e > 0.8)) flush()
    cur.push(w)
  }
  flush()
  // hold each caption until just before the next one so there is no flicker between neighbours
  for (let i = 0; i < out.length; i++) {
    const next = out[i + 1]
    out[i].end = Math.max(out[i].end, Math.min(out[i].end + 0.25, next ? next.start : Infinity))
  }
  return out
}

/** Re-chunks existing captions into `n`-word captions, keeping measured word timing where it exists. */
export function regroup(caps: Caption[], n: number): Caption[] {
  const sorted = [...caps].sort((a, b) => a.start - b.start)
  const words: SWord[] = sorted.flatMap((c, i) => captionWords(c).map((w) => ({ ...w, src: i })))
  return groupWords(words, n, sorted)
}

// ---------- optional emoji suggestions ----------
const EMOJI: Record<string, string> = {
  love: '❤️', heart: '❤️', fire: '🔥', hot: '🔥', money: '💰', cash: '💵', rich: '🤑', idea: '💡', think: '🤔',
  laugh: '😂', funny: '😂', happy: '😊', sad: '😢', cry: '😢', win: '🏆', winner: '🏆', success: '🚀', launch: '🚀',
  growth: '📈', grow: '📈', time: '⏰', music: '🎵', song: '🎶', world: '🌍', home: '🏠', car: '🚗', pizza: '🍕',
  coffee: '☕', sleep: '😴', night: '🌙', sun: '☀️', star: '⭐', wow: '😮', amazing: '🤩', crazy: '🤯', secret: '🤫',
  warning: '⚠️', stop: '🛑', phone: '📱', video: '🎬', camera: '📷', gym: '💪', strong: '💪', power: '⚡', fast: '⚡',
  pray: '🙏', party: '🎉', birthday: '🎂', gift: '🎁', question: '❓', dream: '💭', cat: '🐱', dog: '🐶',
}
export interface EmojiSuggestion { id: string; emoji: string; word: string; text: string }

/** At most one suggestion per caption, never for captions that already contain an emoji. Nothing is inserted automatically. */
export function suggestEmojis(caps: Caption[]): EmojiSuggestion[] {
  const out: EmojiSuggestion[] = []
  for (const c of caps) {
    if (hasEmoji(c.text)) continue
    for (const raw of c.text.split(/\s+/)) {
      const w = core(raw).toLowerCase()
      if (EMOJI[w]) { out.push({ id: c.id, emoji: EMOJI[w], word: w, text: c.text.replace(/\*/g, '') }); break }
    }
  }
  return out
}

export function appendEmoji(c: Caption, emoji: string): Caption {
  const words = c.words ? [...c.words] : undefined
  if (words && words.length) { const last = words[words.length - 1]; words.push({ t: emoji, s: last.e - 0.001, e: last.e, ...(last.a ? { a: true as const } : {}) }) }
  return { ...c, text: `${c.text} ${emoji}`, words: words && c.words && c.words.length === c.text.split(/\s+/).filter(Boolean).length ? words : undefined, edited: true }
}
