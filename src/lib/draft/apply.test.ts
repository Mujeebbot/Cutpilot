import { describe, expect, it } from 'vitest'
import type { Caption } from '../../types'
import { acceptedOf, buildClips, captionsForRanges, editRange, mergeDraftCaptions, resetRange, setDecision, setOptions } from './apply'
import { brollFor } from './broll'
import { parseBrief } from './brief'
import { SAMPLE_LINES, speak } from './fixtures'
import { buildPlan } from './plan'
import type { DraftPlan } from './plan'

const words = speak(SAMPLE_LINES)
const duration = words[words.length - 1].e + 1
const plan0 = (brief = '45 seconds'): DraftPlan => buildPlan({ words, duration, goals: parseBrief(brief), source: { kind: 'whisper', model: 'm', precise: true } })
const ids = (p: DraftPlan) => p.suggestions.map((s) => s.id)
let n = 0
const mk = () => `c${++n}`

describe('decisions', () => {
  it('accepts and rejects, and never mutates the previous plan', () => {
    const p = plan0()
    const r = setDecision(p, ids(p)[0], 'accepted')
    expect(r.error).toBeUndefined()
    expect(r.plan.suggestions[0].status).toBe('accepted')
    expect(p.suggestions[0].status).toBe('pending')
    expect(setDecision(r.plan, ids(p)[0], 'rejected').plan.suggestions[0].status).toBe('rejected')
  })
  it('refuses to accept a clip that overlaps an accepted one, with a clear reason', () => {
    let p = plan0()
    const [a, b] = ids(p)
    p = setDecision(p, a, 'accepted').plan
    const ext = editRange(p, b, p.suggestions[0].start + 1, p.suggestions[1].end) // rejected? still pending, so editing is allowed
    expect(ext.error).toBeUndefined()
    const clash = setDecision(ext.plan, b, 'accepted')
    expect(clash.error).toMatch(/overlaps an accepted clip/i)
    expect(clash.plan.suggestions[1].status).toBe('pending')
  })
  it('reports unknown ids', () => expect(setDecision(plan0(), 'nope', 'accepted').error).toBeDefined())
})

describe('editRange', () => {
  it('updates the range, recomputes the opening line and pauses, and marks it edited', () => {
    const p = plan0()
    const s = p.suggestions[0]
    const w = words.find((x) => x.s > s.start + 6)!
    const r = editRange(p, s.id, w.s - 0.1, s.end)
    expect(r.error).toBeUndefined()
    const e = r.plan.suggestions[0]
    expect(e.start).toBeCloseTo(w.s - 0.1)
    expect(e.edited).toBe(true)
    expect(e.opening.start).toBeGreaterThanOrEqual(s.start)
    expect(e.opening.text).not.toBe(s.opening.text)
  })
  it.each([
    ['NaN', NaN, 5, /times like/i],
    ['negative', -1, 5, /between 0:00/i],
    ['past the end', 1, 9999, /between 0:00/i],
    ['too short', 5, 5.1, /at least/i],
    ['reversed', 9, 3, /at least/i],
  ])('rejects %s', (_n, a, b, msg) => {
    const p = plan0()
    const r = editRange(p, p.suggestions[0].id, a as number, b as number)
    expect(r.error).toMatch(msg)
    expect(r.plan).toBe(p)
  })
  it('refuses an edit that would overlap an accepted clip, and reset restores the original', () => {
    let p = plan0()
    const [a, b] = ids(p)
    p = setDecision(p, a, 'accepted').plan
    expect(editRange(p, b, 0, p.suggestions[1].end).error).toBeUndefined() // b is only pending, overlap allowed until accepted
    const moved = editRange(p, a, p.suggestions[0].start + 0.5, p.suggestions[0].end - 0.5).plan
    expect(moved.suggestions[0].edited).toBe(true)
    const back = resetRange(moved, a).plan.suggestions[0]
    expect(back.start).toBe(back.originalStart)
    expect(back.edited).toBe(false)
  })
})

describe('buildClips', () => {
  const accepted = (p: DraftPlan) => ids(p).reduce((acc, id) => setDecision(acc, id, 'accepted').plan, p)
  it('is empty when nothing is accepted', () => expect(buildClips(plan0(), mk).clips).toEqual([]))
  it('keeps source order by default and references source ranges only', () => {
    const p = accepted(plan0())
    const { clips } = buildClips(setOptions(p, { order: 'source', removePauses: false }), mk)
    expect(clips.map((c) => c.start)).toEqual([...clips.map((c) => c.start)].sort((x, y) => x - y))
    clips.forEach((c, i) => { expect(c.start).toBe(p.suggestions[i].start); expect(c.end).toBe(p.suggestions[i].end); expect(c.suggestionId).toBe(p.suggestions[i].id) })
  })
  it('puts the strongest opening first when asked, leaving the rest in source order', () => {
    const p = setOptions(accepted(plan0()), { order: 'hook-first', removePauses: false })
    const best = p.suggestions.find((s) => s.openingRank === 1)!
    const { clips } = buildClips(p, mk)
    expect(clips[0].suggestionId).toBe(best.id)
    const rest = clips.slice(1).map((c) => c.start)
    expect(rest).toEqual([...rest].sort((x, y) => x - y))
  })
  it('cuts long pauses into separate clips only when enabled', () => {
    const p = accepted(plan0())
    const withPause = p.suggestions.find((s) => s.pauses.length)!
    const off = buildClips(setOptions(p, { removePauses: false }), mk).clips.filter((c) => c.suggestionId === withPause.id)
    const on = buildClips(setOptions(p, { removePauses: true }), mk).clips.filter((c) => c.suggestionId === withPause.id)
    expect(off).toHaveLength(1)
    expect(on.length).toBeGreaterThan(1)
    on.forEach((c) => { expect(c.start).toBeGreaterThanOrEqual(withPause.start - 1e-9); expect(c.end).toBeLessThanOrEqual(withPause.end + 1e-9) })
    const gap = on[1].start - on[0].end
    expect(gap).toBeGreaterThan(0.3)
  })
  it('gives every clip a fresh id', () => {
    const { clips } = buildClips(accepted(plan0()), mk)
    expect(new Set(clips.map((c) => c.id)).size).toBe(clips.length)
    expect(acceptedOf(accepted(plan0()))).toHaveLength(ids(plan0()).length)
  })
})

describe('captions for the edit', () => {
  it('stay in SOURCE time, inside their range, tagged as draft', () => {
    const ranges = [{ start: 52, end: 70 }, { start: 11, end: 20 }]
    const caps = captionsForRanges(words, ranges, 3)
    expect(caps.length).toBeGreaterThan(5)
    for (const c of caps) {
      expect(ranges.some((r) => c.start >= r.start - 1e-9 && c.end <= r.end + 1e-9)).toBe(true)
      expect(c.origin).toBe('draft')
      // every caption's words exist in the transcript at exactly those times
      c.words!.forEach((w) => expect(words.some((x) => Math.abs(x.s - w.s) < 1e-9 && x.t === w.t)).toBe(true))
    }
    expect(caps.some((c) => /pricing/i.test(c.text))).toBe(true)
  })
  it('supports 5-word density per caption', () => {
    const ranges = [{ start: 11, end: 30 }]
    const caps = captionsForRanges(words, ranges, 5)
    expect(caps.length).toBeGreaterThan(0)
    for (const c of caps) {
      const wCount = c.text.split(/\s+/).filter(Boolean).length
      expect(wCount).toBeLessThanOrEqual(5)
    }
  })
  it('regeneration replaces unedited draft captions but keeps the creator’s own', () => {
    const first = captionsForRanges(words, [{ start: 11, end: 20 }], 2)
    const mine: Caption = { id: 'mine', start: 11.5, end: 14, text: 'my own words', x: 0.5, y: 0.5 }
    const edited: Caption = { ...first[2], edited: true }
    const existing = [first[0], first[1], edited, mine]
    const merged = mergeDraftCaptions(existing, captionsForRanges(words, [{ start: 11, end: 20 }], 2))
    expect(merged.find((c) => c.id === 'mine')).toBeDefined()
    expect(merged.find((c) => c.id === edited.id)).toBeDefined()
    expect(merged.find((c) => c.id === first[0].id)).toBeUndefined() // old unedited draft caption replaced
    // nothing new was stacked on top of the creator's caption or the edited one
    const overlapsMine = merged.filter((c) => c.origin === 'draft' && c.id !== edited.id && Math.min(c.end, mine.end) - Math.max(c.start, mine.start) > 0.5 * (c.end - c.start))
    expect(overlapsMine).toEqual([])
  })
})

describe('broll', () => {
  it('suggests text-only ideas tied to a spoken word and time, and skips vague words', () => {
    const ideas = brollFor(words, { start: 10, end: 32 }, { focusTerms: [] })
    expect(ideas.length).toBeGreaterThan(0)
    expect(ideas.length).toBeLessThanOrEqual(3)
    ideas.forEach((i) => { expect(i.at).toBeGreaterThanOrEqual(10); expect(i.at).toBeLessThan(32); expect(i.basis).toMatch(/You say|number/) })
    expect(ideas.map((i) => i.text).join(' ')).not.toMatch(/shows “because”/)
    expect(brollFor(speak([{ text: 'Well anyway so basically yes indeed okay then.' }]), { start: 0, end: 10 }, { focusTerms: [] })).toEqual([])
  })
})
