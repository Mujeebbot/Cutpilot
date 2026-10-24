import type { OutputFormat } from '../../types'

/**
 * Turns the creator's plain-language description into explicit goals.
 * This is pattern matching on the text (numbers with units, a few keywords). It does not "understand" the sentence,
 * so every goal records what it matched and the creator can see and correct all of them in the review screen.
 */
export interface BriefGoals {
  /** Total length wanted for the finished edit, in seconds. null = not stated. */
  targetSeconds: number | null
  /** The brief mentioned a hook / strong opening. */
  strongestOpening: boolean
  /** The brief asked to cut pauses / dead air / tighten. */
  removePauses: boolean
  /** Captions wanted. Default on; only 'off' when the brief explicitly rejects them. */
  captions: 'on' | 'off'
  /** 1–3 words per caption when the brief named one. */
  wordsPerCaption: 1 | 2 | 3 | null
  /** The brief asked for highlighted/emphasised keywords. */
  emphasizeKeywords: boolean
  /** Topic words the brief says to focus on (lower-case, stop-words removed). Used only for keyword matching. */
  focusTerms: string[]
  /** A format named inside the text (the format picker always wins; this only produces a hint when they differ). */
  formatMention: OutputFormat | null
  /** What was recognised, with the exact text that matched. */
  notes: GoalNote[]
}

export interface GoalNote { id: string; label: string; matched: string }

export const EMPTY_GOALS: BriefGoals = {
  targetSeconds: null, strongestOpening: false, removePauses: false, captions: 'on', wordsPerCaption: null,
  emphasizeKeywords: false, focusTerms: [], formatMention: null, notes: [],
}

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20,
  thirty: 30, forty: 40, 'forty-five': 45, fifty: 50, sixty: 60, ninety: 90, 'a': 1,
}
const NUM = '(\\d+(?:\\.\\d+)?|a|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty-five|forty|fifty|sixty|ninety)'
const UNIT = '(seconds?|secs?|minutes?|mins?)'
const toNum = (s: string) => (/^\d/.test(s) ? Number(s) : NUM_WORDS[s.toLowerCase()] ?? NaN)
const toSec = (n: number, unit: string) => (/^min/i.test(unit) ? n * 60 : n)

export const STOPWORDS = new Set((
  'a an and are as at be been but by can could did do does for from get got had has have he her his how i if in into is it its just like ' +
  'make me more most my no not of on one or our out over so some than that the their them then there these they this those to up us ' +
  'very was we were what when where which who why will with would you your about around focus topic video clip short edit want need ' +
  'really also still even much many any all each every other another into onto your yours them also should'
).split(/\s+/))

/** Words that look like content, in order of appearance. Lower-cased, ≥3 letters, no stop-words. */
export function contentTerms(text: string): string[] {
  const out: string[] = []
  for (const w of text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []) {
    const t = w.replace(/^['-]+|['-]+$/g, '')
    if (t.length >= 3 && !STOPWORDS.has(t) && !out.includes(t)) out.push(t)
  }
  return out
}

export function parseBrief(raw: string): BriefGoals {
  const text = raw.replace(/\s+/g, ' ').trim()
  const lower = text.toLowerCase()
  const g: BriefGoals = { ...EMPTY_GOALS, focusTerms: [], notes: [] }
  const note = (id: string, label: string, matched: string) => g.notes.push({ id, label, matched })
  if (!text) return g

  // --- target duration: "30-60 seconds", "under 45 sec", "a 90 second cut", "1 minute", "60s"
  const range = lower.match(new RegExp(`${NUM}\\s*(?:-|–|to)\\s*${NUM}\\s*[- ]?${UNIT}\\b`))
  const single = lower.match(new RegExp(`\\b${NUM}[\\s-]*${UNIT}\\b`)) ?? lower.match(/\b(\d+)s\b/)
  if (range && Number.isFinite(toNum(range[1])) && Number.isFinite(toNum(range[2]))) {
    const lo = toSec(toNum(range[1]), range[3]), hi = toSec(toNum(range[2]), range[3])
    if (lo > 0 && hi >= lo) { g.targetSeconds = Math.round((lo + hi) / 2); note('duration', `Target length ≈ ${g.targetSeconds}s (midpoint of a range)`, range[0]) }
  }
  if (g.targetSeconds === null && single) {
    const n = toNum(single[1])
    const sec = single[2] ? toSec(n, single[2]) : n
    if (Number.isFinite(sec) && sec >= 3 && sec <= 3600) { g.targetSeconds = Math.round(sec); note('duration', `Target length ${g.targetSeconds}s`, single[0]) }
  }

  // --- format named in the text
  if (/\b(9\s*:\s*16|vertical|portrait|reels?|tiktok|shorts)\b/.test(lower)) { g.formatMention = '9:16'; note('format', 'Mentions a vertical format', lower.match(/9\s*:\s*16|vertical|portrait|reels?|tiktok|shorts/)![0]) }
  else if (/\b(1\s*:\s*1|square)\b/.test(lower)) { g.formatMention = '1:1'; note('format', 'Mentions a square format', lower.match(/1\s*:\s*1|square/)![0]) }
  else if (/\b(16\s*:\s*9|landscape|horizontal|widescreen)\b/.test(lower)) { g.formatMention = '16:9'; note('format', 'Mentions a landscape format', lower.match(/16\s*:\s*9|landscape|horizontal|widescreen/)![0]) }

  // --- strongest opening
  const hook = lower.match(/\b(strong|best|punchy|great|killer|attention[- ]grabbing|catchy|powerful)\s+(opening|hook|open|intro|start)\b|\bhook\b|\bstart (?:with|on) the (?:best|strongest|most)\b|\bopen(?:ing)? with (?:the )?(?:best|strongest)\b/)
  if (hook) { g.strongestOpening = true; note('opening', 'Wants the strongest opening first', hook[0]) }

  // --- pauses
  const pause = lower.match(/\b(?:remove|cut|trim|get rid of|delete|skip|drop|lose|tighten)\b[^.;,]{0,40}\b(?:pauses?|silences?|silence|dead air|gaps?|fillers?|ums?)\b|\bno (?:dead air|pauses?|silence)\b|\btighten(?:ed)?\b|\bjump[- ]?cuts?\b|\bfast[- ]paced\b|\btight(?:er)? pacing\b/)
  if (pause) { g.removePauses = true; note('pauses', 'Wants long pauses removed', pause[0]) }

  // --- captions
  const noCaps = lower.match(/\b(?:no|without|skip|don'?t (?:want|need|add|use)|turn off)\s+(?:any\s+)?(?:captions?|subtitles?)\b/)
  if (noCaps) { g.captions = 'off'; note('captions', 'No captions', noCaps[0]) }
  else if (/\b(captions?|subtitles?)\b/.test(lower)) note('captions', 'Captions wanted', lower.match(/captions?|subtitles?/)![0])
  const wpc = lower.match(/\b(one|1|two|2|three|3)[\s-]*words?(?: at a time| per caption| captions?)?\b/)
  if (wpc && g.captions === 'on') { g.wordsPerCaption = ({ one: 1, 1: 1, two: 2, 2: 2, three: 3, 3: 3 } as const)[wpc[1] as 'one'] ?? null; if (g.wordsPerCaption) note('density', `${g.wordsPerCaption} word${g.wordsPerCaption > 1 ? 's' : ''} per caption`, wpc[0]) }
  const emph = lower.match(/\b(?:highlight|emphasi[sz]e|pop)\b[^.;]{0,30}\b(?:keywords?|words?|numbers?)\b|\bkeyword highlight(?:s|ing)?\b|\bword[- ]by[- ]word\b|\bkaraoke\b/)
  if (emph && g.captions === 'on') { g.emphasizeKeywords = true; note('emphasis', 'Highlight keywords in captions', emph[0]) }

  // --- focus terms: "about X", "focus on X", "around X", quoted phrases
  const terms: string[] = []
  const add = (phrase: string) => { for (const t of contentTerms(phrase)) if (!terms.includes(t)) terms.push(t) }
  const quoted = [...text.matchAll(/["“”']([^"“”']{3,60})["“”']/g)].map((m) => m[1])
  quoted.forEach(add)
  for (const m of lower.matchAll(/\b(?:about|focus(?:ing)? on|centered on|around|regarding|on the topic of|covering)\s+(?:the\s+|my\s+|our\s+)?([^.;,!?]{3,60}?)(?=\s+(?:and|with|but|that|so|using|including|under|in\s+a|for|then)\b|[.;,!?]|$)/g)) add(m[1])
  g.focusTerms = terms.slice(0, 6)
  if (g.focusTerms.length) note('focus', 'Prefers moments that mention these words', g.focusTerms.join(', '))

  return g
}
