import { describe, expect, it } from 'vitest'
import { parseIntent, describeState } from './assistant'

describe('parseIntent', () => {
  it('parses density commands', () => {
    expect(parseIntent('use 2 word captions')).toEqual({ type: 'density', words: 2 })
    expect(parseIntent('one word at a time')).toEqual({ type: 'density', words: 1 })
    expect(parseIntent('5 words per caption')).toEqual({ type: 'density', words: 5 })
    expect(parseIntent('ten words per caption')).toEqual({ type: 'density', words: 10 })
  })

  it('parses template commands', () => {
    const r1 = parseIntent('apply Heavy Pop')
    expect(r1?.type).toBe('template')
    if (r1?.type === 'template') {
      expect(r1.template.name).toBe('Heavy Pop')
    }

    const r2 = parseIntent('switch to Cove')
    expect(r2?.type).toBe('template')

    const r3 = parseIntent('use the Pill template')
    expect(r3?.type).toBe('template')
    if (r3?.type === 'template') {
      expect(r3.template.name).toBe('Pill')
    }
  })

  it('parses position commands', () => {
    expect(parseIntent('move captions to bottom')).toEqual({ type: 'position', y: 0.85, label: 'bottom' })
    expect(parseIntent('put captions at top')).toEqual({ type: 'position', y: 0.15, label: 'top' })
    expect(parseIntent('centre the captions vertically')).toEqual({ type: 'position', y: 0.5, label: 'center' })
  })

  it('parses canvas format commands', () => {
    expect(parseIntent('switch to 9:16')).toEqual({ type: 'canvas', aspect: '9:16' })
    expect(parseIntent('square format')).toEqual({ type: 'canvas', aspect: '1:1' })
    expect(parseIntent('switch to vertical')).toEqual({ type: 'canvas', aspect: '9:16' })
    expect(parseIntent('original aspect')).toEqual({ type: 'canvas', aspect: 'source' })
  })

  it('parses clear captions, undo, and redo', () => {
    expect(parseIntent('clear captions')).toEqual({ type: 'clear_captions' })
    expect(parseIntent('remove all captions')).toEqual({ type: 'clear_captions' })
    expect(parseIntent('undo')).toEqual({ type: 'undo' })
    expect(parseIntent('undo that')).toEqual({ type: 'undo' })
    expect(parseIntent('redo')).toEqual({ type: 'redo' })
  })

  it('parses trim points', () => {
    expect(parseIntent('set trim start to 12s')).toEqual({ type: 'trim', start: 12 })
    expect(parseIntent('trim end at 1:30')).toEqual({ type: 'trim', end: 90 })
  })

  it('parses status and describe queries', () => {
    expect(parseIntent('how many captions?')).toEqual({ type: 'describe', query: 'captions' })
    expect(parseIntent('what template is selected?')).toEqual({ type: 'describe', query: 'template' })
    expect(parseIntent('what is the aspect ratio?')).toEqual({ type: 'describe', query: 'canvas' })
    expect(parseIntent('status')).toEqual({ type: 'describe', query: 'all' })
  })

  it('returns null for unsupported commands', () => {
    expect(parseIntent('generate viral content for me')).toBeNull()
    expect(parseIntent('make me a sandwich')).toBeNull()
    expect(parseIntent('')).toBeNull()
  })
})

describe('describeState', () => {
  const snapshot = {
    captionsCount: 8,
    templateName: 'Heavy Pop',
    canvasAspect: '9:16' as const,
    duration: 60,
    clipsCount: 2,
    trim: { start: 5, end: 45 },
  }

  it('answers query about captions', () => {
    expect(describeState(snapshot, 'captions')).toContain('8 captions')
  })

  it('answers query about template', () => {
    expect(describeState(snapshot, 'template')).toContain('Heavy Pop')
  })

  it('answers query about canvas', () => {
    expect(describeState(snapshot, 'canvas')).toContain('9:16')
  })
})
