import { describe, expect, it } from 'vitest'
import { parseBrief } from './brief'
import { SAMPLE_LINES, speak } from './fixtures'
import { buildPlan, buildSentences, findPauses, padRanges, scoreSentence } from './plan'
import type { DraftPlan } from './plan'

const words = speak(SAMPLE_LINES)
const duration = words[words.length - 1].e + 1
const make = (brief = '', over: Partial<Parameters<typeof buildPlan>[0]> = {}): DraftPlan =>
  buildPlan({ words, duration, goals: parseBrief(brief), source: { kind: 'whisper', model: 'test', precise: true }, ...over })

describe('buildSentences / findPauses', () => {
  it('splits on sentence punctuation and on long silences', () => {
    const S = buildSentences(words)
    expect(S.length).toBe(SAMPLE_LINES.length)
    expect(S[2].text).toMatch(/^Here is the biggest mistake/)
    const w = speak([{ text: 'no punctuation here at all' }, { text: 'second part follows', gap: 2 }])
    expect(buildSentences(w).map((s) => s.text)).toEqual(['no punctuation here at all', 'second part follows'])
  })
  it('finds pauses from gaps between word timestamps', () => {
    const p = findPauses(words, 0.8)
    expect(p.length).toBeGreaterThanOrEqual(5)
    expect(p.every((x) => x.end - x.start >= 0.8)).toBe(true)
    expect(findPauses(words, 10)).toEqual([])
  })
})

describe('scoreSentence', () => {
  const sc = (t: string, f: string[] = []) => scoreSentence(buildSentences(speak([{ text: t }]))[0], f)
  it('rewards hooks, questions and numbers and explains why', () => {
    const hook = sc('What if you could double your revenue without raising prices?')
    const dull = sc('Anyway that is a bit of background on my business and the team.')
    expect(hook.score).toBeGreaterThan(dull.score)
    expect(hook.reasons.map((r) => r.id)).toEqual(expect.arrayContaining(['question', 'phrase']))
    expect(sc('It cost me 12000 dollars last year honestly.').reasons.map((r) => r.id)).toContain('number')
  })
  it('penalises filler and fragments', () => {
    expect(sc('Um uh you know it is a lot of um work honestly.').reasons.map((r) => r.id)).toContain('filler')
    expect(sc('Okay then.').reasons.map((r) => r.id)).toContain('short')
  })
  it('boosts sentences that mention a focus term from the brief', () => {
    const a = sc('Pricing is not a number it is a message about who you serve.', ['pricing'])
    const b = sc('Pricing is not a number it is a message about who you serve.', [])
    expect(a.score).toBeGreaterThan(b.score)
    expect(a.reasons.some((r) => r.id === 'focus')).toBe(true)
  })
  it('keeps scores within 0..1', () => {
    for (const l of SAMPLE_LINES) { const s = sc(l.text); expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(1) }
  })
})

describe('buildPlan', () => {
  it('proposes ordered, in-bounds, non-overlapping clips with reasons', () => {
    const plan = make('a 45 second short with a strong hook')
    const s = plan.suggestions
    expect(s.length).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < s.length; i++) {
      expect(s[i].start).toBeGreaterThanOrEqual(0)
      expect(s[i].end).toBeLessThanOrEqual(duration)
      expect(s[i].end).toBeGreaterThan(s[i].start)
      expect(s[i].reasons.length).toBeGreaterThan(0)
      expect(s[i].status).toBe('pending')
      if (i) expect(s[i].start).toBeGreaterThanOrEqual(s[i - 1].end - 1e-6)
    }
  })
  it('opens the strongest clip on a hook line and ranks openings 1..n', () => {
    const plan = make('45 seconds')
    const ranks = plan.suggestions.map((s) => s.openingRank).sort((a, b) => a - b)
    expect(ranks).toEqual(plan.suggestions.map((_, i) => i + 1))
    const top = plan.suggestions.find((s) => s.openingRank === 1)!
    expect(top.opening.hookScore).toBeGreaterThan(0.2)
    expect(top.opening.reasons.length).toBeGreaterThan(0)
  })
  it('marks a set that fits the target length', () => {
    const plan = make('30 seconds')
    const fit = plan.suggestions.filter((s) => s.fitsTarget)
    expect(fit.length).toBeGreaterThanOrEqual(1)
    const len = fit.reduce((a, s) => a + s.end - s.start, 0)
    if (fit.length > 1) expect(len).toBeLessThanOrEqual(30 * 1.1 + 0.001)
  })
  it('reports pauses inside clips', () => {
    const plan = make('')
    expect(plan.suggestions.some((s) => s.pauses.length > 0)).toBe(true)
  })
  it('states its limits honestly', () => {
    const plan = make('', { source: { kind: 'whisper', model: 'm', precise: false } })
    expect(plan.limitations.join(' ')).toMatch(/does not understand/i)
    expect(plan.limitations.join(' ')).toMatch(/segment-level timestamps/i)
    expect(make('').limitations.join(' ')).toMatch(/did not state a length/i)
    expect(make('', { source: { kind: 'captions', model: null, precise: false } }).limitations.join(' ')).toMatch(/captions already in the project/i)
  })
  it('proposes the whole speech as one clip when it is already shorter than the target', () => {
    const short = speak([{ text: 'What if you could double your revenue without raising prices?' }, { text: 'You can and I will show you how.' }])
    const plan = buildPlan({ words: short, duration: 12, goals: parseBrief('45 seconds'), source: { kind: 'whisper', model: 'm', precise: true } })
    expect(plan.suggestions).toHaveLength(1)
    expect(plan.suggestions[0].start).toBeLessThan(short[0].s)
    expect(plan.limitations.join(' ')).toMatch(/shorter than the target/i)
  })
  it('returns no suggestions and says why when there is almost no speech', () => {
    const plan = buildPlan({ words: speak([{ text: 'hi there' }]), duration: 5, goals: parseBrief(''), source: { kind: 'whisper', model: 'm', precise: true } })
    expect(plan.suggestions).toEqual([])
    expect(plan.limitations.join(' ')).toMatch(/not enough speech/i)
  })
  it('ignores words with broken timestamps', () => {
    const bad = [...words, { t: 'ghost', s: NaN, e: 3 }, { t: '', s: 1, e: 2 }]
    expect(() => buildPlan({ words: bad, duration, goals: parseBrief(''), source: { kind: 'whisper', model: 'm', precise: true } })).not.toThrow()
  })
  it('a brief that asks for hook / pause removal sets the plan options', () => {
    const p = make('strong hook, remove pauses')
    expect(p.options).toMatchObject({ order: 'hook-first', removePauses: true, captions: true })
    expect(make('').options).toMatchObject({ order: 'source', removePauses: false })
  })
  it('uses focus terms to prefer relevant clips', () => {
    const plan = make('about discounting')
    const hit = plan.suggestions.find((s) => /discount/i.test(words.filter((w) => w.s >= s.start && w.e <= s.end).map((w) => w.t).join(' ')))
    expect(hit).toBeDefined()
  })
})

describe('padRanges', () => {
  it('pads without crossing neighbours or the video bounds', () => {
    const out = padRanges([{ start: 0.05, end: 5 }, { start: 5.1, end: 9.9 }], 10)
    expect(out[0].start).toBe(0)
    expect(out[0].end).toBeLessThanOrEqual(out[1].start + 1e-9)
    expect(out[1].end).toBeLessThanOrEqual(10)
  })
})
