import { describe, expect, it } from 'vitest'
import { contentTerms, parseBrief } from './brief'

describe('parseBrief', () => {
  it('extracts explicit goals from a typical brief and records what matched', () => {
    const g = parseBrief('Make a 45-second vertical short about the pricing mistake, with a strong hook. Remove long pauses and use bold captions, two words at a time.')
    expect(g.targetSeconds).toBe(45)
    expect(g.formatMention).toBe('9:16')
    expect(g.strongestOpening).toBe(true)
    expect(g.removePauses).toBe(true)
    expect(g.captions).toBe('on')
    expect(g.wordsPerCaption).toBe(2)
    expect(g.focusTerms).toEqual(expect.arrayContaining(['pricing', 'mistake']))
    expect(g.notes.map((n) => n.id)).toEqual(expect.arrayContaining(['duration', 'format', 'opening', 'pauses', 'density', 'focus']))
    expect(g.notes.find((n) => n.id === 'duration')!.matched).toMatch(/45/)
  })
  it('handles ranges, minutes, number words and "60s"', () => {
    expect(parseBrief('between 30-60 seconds').targetSeconds).toBe(45)
    expect(parseBrief('a 1 minute cut').targetSeconds).toBe(60)
    expect(parseBrief('two minutes please').targetSeconds).toBe(120)
    expect(parseBrief('keep it to 60s').targetSeconds).toBe(60)
  })
  it('does not mistake casual phrases for a length', () => {
    expect(parseBrief('wait a second, I want it punchy').targetSeconds).toBeNull()
    expect(parseBrief('I have 5 stories').targetSeconds).toBeNull()
  })
  it('detects "no captions" and then ignores caption styling words', () => {
    const g = parseBrief('no captions, just tighten the pacing')
    expect(g.captions).toBe('off')
    expect(g.wordsPerCaption).toBeNull()
    expect(g.removePauses).toBe(true)
  })
  it('picks up quoted focus phrases and keyword highlighting', () => {
    const g = parseBrief('Highlight the keywords. Focus on "customer retention" and nothing else.')
    expect(g.emphasizeKeywords).toBe(true)
    expect(g.focusTerms).toEqual(expect.arrayContaining(['customer', 'retention']))
  })
  it('returns neutral defaults for empty or unmatched text', () => {
    const g = parseBrief('   ')
    expect(g).toMatchObject({ targetSeconds: null, strongestOpening: false, removePauses: false, captions: 'on', focusTerms: [], notes: [] })
    expect(parseBrief('something nice please').notes).toEqual([])
  })
  it('parses caption density across the 1-10 range', () => {
    expect(parseBrief('five word captions please').wordsPerCaption).toBe(5)
    expect(parseBrief('use 6 words per caption').wordsPerCaption).toBe(6)
    expect(parseBrief('one word at a time').wordsPerCaption).toBe(1)
    expect(parseBrief('ten words per caption').wordsPerCaption).toBe(10)
  })
  it('contentTerms drops stop-words and duplicates', () => expect(contentTerms('the pricing and the Pricing of our product')).toEqual(['pricing', 'product']))
})
