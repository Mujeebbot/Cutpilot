import { describe, expect, it } from 'vitest'
import {
  groupWords,
  regroup,
  autoKeywords,
  suggestEmojis,
  appendEmoji,
  hasEmoji,
} from './captions'
import type { Caption, Word } from '../types'

describe('captions.ts', () => {
  const words: Word[] = [
    { t: 'Hello', s: 0, e: 0.5 },
    { t: 'world', s: 0.5, e: 1.0 },
    { t: 'this', s: 1.0, e: 1.4 },
    { t: 'is', s: 1.4, e: 1.7 },
    { t: 'CutPilot', s: 1.7, e: 2.2 },
  ]

  it('groupWords groups into 1 word per caption', () => {
    const caps = groupWords(words, 1)
    expect(caps).toHaveLength(5)
    expect(caps[0].text).toBe('Hello')
    expect(caps[4].text).toBe('CutPilot')
  })

  it('groupWords groups into 5 words per caption', () => {
    const caps = groupWords(words, 5)
    expect(caps).toHaveLength(1)
    expect(caps[0].text).toBe('Hello world this is CutPilot')
    expect(caps[0].words).toHaveLength(5)
  })

  it('groupWords breaks at pause > 0.8s even if target count is not reached', () => {
    const wordsWithPause: Word[] = [
      { t: 'First', s: 0, e: 0.5 },
      { t: 'segment', s: 0.5, e: 1.0 },
      // 1.5s gap (> 0.8s)
      { t: 'Second', s: 2.5, e: 3.0 },
      { t: 'segment', s: 3.0, e: 3.5 },
    ]
    const caps = groupWords(wordsWithPause, 4)
    expect(caps).toHaveLength(2)
    expect(caps[0].text).toBe('First segment')
    expect(caps[1].text).toBe('Second segment')
  })

  it('regroup re-chunks captions into n-word captions', () => {
    const original: Caption[] = [
      {
        id: 'c1',
        start: 0,
        end: 2.2,
        text: 'Hello world this is CutPilot',
        x: 0.5,
        y: 0.8,
        words,
        timing: 'word',
      },
    ]
    const reg = regroup(original, 2)
    expect(reg).toHaveLength(3)
    expect(reg[0].text).toBe('Hello world')
    expect(reg[1].text).toBe('this is')
    expect(reg[2].text).toBe('CutPilot')
  })

  it('autoKeywords picks numbers over strong words and returns at most one keyword', () => {
    const kw1 = autoKeywords(['This', 'costs', '$500', 'today'])
    expect(kw1.size).toBe(1)
    expect(kw1.has(2)).toBe(true) // $500 has number -> score 3

    const kw2 = autoKeywords(['This', 'is', 'a', 'secret', 'trick'])
    expect(kw2.size).toBe(1)
    expect(kw2.has(3)).toBe(true) // secret is in STRONG -> score 2

    const kw3 = autoKeywords(['ordinary', 'words', 'here'])
    expect(kw3.size).toBe(0)
  })

  it('suggestEmojis suggests matching emoji and skips captions that already have emoji', () => {
    const caps: Caption[] = [
      { id: '1', start: 0, end: 1, text: 'This is pure fire', x: 0.5, y: 0.8 },
      { id: '2', start: 1, end: 2, text: 'I love it ❤️', x: 0.5, y: 0.8 },
      { id: '3', start: 2, end: 3, text: 'Just plain text', x: 0.5, y: 0.8 },
    ]
    const suggestions = suggestEmojis(caps)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].id).toBe('1')
    expect(suggestions[0].emoji).toBe('🔥')
  })

  it('appendEmoji appends emoji to text and updates word array', () => {
    const cap: Caption = {
      id: 'c1',
      start: 0,
      end: 1,
      text: 'Great video',
      x: 0.5,
      y: 0.8,
      words: [
        { t: 'Great', s: 0, e: 0.5 },
        { t: 'video', s: 0.5, e: 1.0 },
      ],
    }
    const updated = appendEmoji(cap, '🚀')
    expect(updated.text).toBe('Great video 🚀')
    expect(hasEmoji(updated.text)).toBe(true)
    expect(updated.edited).toBe(true)
  })
})
