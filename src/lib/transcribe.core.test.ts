import { describe, expect, it } from 'vitest'
import { chunkCount, recognise, splitWords } from './transcribe.core'
import type { AsrFn } from './transcribe.core'

const SR = 16000
describe('chunkCount', () => {
  it('matches the 30 s window / 20 s hop Transformers.js uses', () => {
    expect(chunkCount(10 * SR)).toBe(1)
    expect(chunkCount(30 * SR)).toBe(1)
    expect(chunkCount(31 * SR)).toBe(2)
    expect(chunkCount(60 * SR)).toBe(3)
    expect(chunkCount(600 * SR)).toBe(Math.ceil((600 - 30) / 20) + 1)
  })
})

describe('recognise', () => {
  const audio = new Float32Array(SR * 5)
  it('uses word timestamps when available and offsets them into source time', async () => {
    const asr: AsrFn = async (_a, o) => {
      expect(o.return_timestamps).toBe('word')
      return { text: 'hello world', chunks: [{ text: ' hello', timestamp: [0.1, 0.5] }, { text: ' world', timestamp: [0.6, null] }] }
    }
    const r = await recognise(asr, audio, 100, 105)
    expect(r.precise).toBe(true)
    expect(r.words.map((w) => w.t)).toEqual(['hello', 'world'])
    expect(r.words[0]).toMatchObject({ s: 100.1, e: 100.5 })
    expect(r.words[1].e).toBeCloseTo(100.9) // missing end => start + 0.3
    expect(r.words.every((w) => w.a === undefined)).toBe(true)
  })
  it('falls back to segment timestamps with approximated words when word timing throws', async () => {
    const seen: unknown[] = []
    const asr: AsrFn = async (_a, o) => {
      seen.push(o.return_timestamps)
      if (o.return_timestamps === 'word') throw new Error('no alignment heads')
      return [{ text: 'one two three', chunks: [{ text: ' one two three', timestamp: [2, 5] }] }]
    }
    const r = await recognise(asr, audio, 10, 15)
    expect(seen).toEqual(['word', true])
    expect(r.precise).toBe(false)
    expect(r.words).toHaveLength(3)
    expect(r.words.every((w) => w.a === true && w.s >= 12 && w.e <= 15 + 1e-9)).toBe(true)
    expect(r.words[0].s).toBeLessThan(r.words[2].s)
  })
  it('falls back when the word pass returns nothing usable', async () => {
    const asr: AsrFn = async (_a, o) => (o.return_timestamps === 'word' ? { chunks: [{ text: ' ', timestamp: [NaN, NaN] }] } : { text: 'hi there', chunks: [{ text: 'hi there', timestamp: [0, 1] }] })
    expect((await recognise(asr, audio, 0, 5)).precise).toBe(false)
  })
  it('throws a clear error when there is no speech', async () => {
    await expect(recognise(async () => ({ text: '', chunks: [] }), audio, 0, 5)).rejects.toThrow(/No speech/)
  })
  it('reports real per-window progress through the streamer and never lets a failing callback break generation', async () => {
    const calls: [number, number][] = []
    const asr: AsrFn = async (_a, o) => {
      const st = o.streamer as { put: () => void; end: () => void }
      st.put(); st.end(); st.end()
      return { text: 'a b', chunks: [{ text: 'a', timestamp: [0, 1] }, { text: 'b', timestamp: [1, 2] }] }
    }
    await recognise(asr, new Float32Array(SR * 45), 0, 45, (d, t) => calls.push([d, t]))
    expect(calls).toEqual([[1, 2], [2, 2]])
    const throwing: AsrFn = async (_a, o) => { (o.streamer as { end: () => void }).end(); return { text: 'a', chunks: [{ text: 'a', timestamp: [0, 1] }] } }
    await expect(recognise(throwing, audio, 0, 5, () => { throw new Error('ui bug') })).resolves.toBeDefined()
  })
  it('splitWords spreads words across a segment in order', () => {
    const w = splitWords('a longer word', 0, 3)
    expect(w[0].s).toBe(0)
    expect(w[2].e).toBeCloseTo(3)
    expect(w.every((x, i) => i === 0 || x.s >= w[i - 1].s)).toBe(true)
  })
})
