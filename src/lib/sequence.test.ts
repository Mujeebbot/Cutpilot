import { describe, expect, it } from 'vitest'
import type { Clip } from '../types'
import { advance, clampRange, constrainClip, findOverlap, locate, mergeRanges, moveItem, parseTime, playStart, sanitizeClips, sequenceRanges, sequenceToSource, sourceToSequence, splitAtPauses, totalLength } from './sequence'

const clip = (id: string, start: number, end: number): Clip => ({ id, start, end })

describe('sequenceRanges', () => {
  it('uses the trim when there are no clips, and the clips (in order) when there are', () => {
    expect(sequenceRanges([], { start: 2, end: 9 })).toEqual([{ start: 2, end: 9 }])
    expect(sequenceRanges([clip('b', 20, 30), clip('a', 0, 10)], { start: 2, end: 9 })).toEqual([{ start: 20, end: 30 }, { start: 0, end: 10 }])
  })
  it('totals length', () => expect(totalLength([{ start: 0, end: 10 }, { start: 20, end: 25 }])).toBe(15))
})

describe('time mapping', () => {
  const r = [{ start: 20, end: 30 }, { start: 0, end: 10 }] // reordered on purpose
  it('maps source time to sequence time in sequence order', () => {
    expect(sourceToSequence(r, 22)).toBe(2)
    expect(sourceToSequence(r, 3)).toBe(13)
    expect(sourceToSequence(r, 15)).toBeNull() // cut out
    expect(sourceToSequence(r, 30)).toBeNull() // end is exclusive
  })
  it('maps sequence time back to source time and round-trips', () => {
    expect(sequenceToSource(r, 2)).toEqual({ t: 22, index: 0 })
    expect(sequenceToSource(r, 13)).toEqual({ t: 3, index: 1 })
    expect(sequenceToSource(r, 999).t).toBe(10) // clamps to the end of the last range
    for (const t of [0.5, 9.9, 10, 14, 19.9]) {
      const { t: src } = sequenceToSource(r, t)
      expect(sourceToSequence(r, src)).toBeCloseTo(t, 6)
    }
  })
  it('locate treats the end as exclusive', () => {
    expect(locate(r, 29.99)).toBe(0)
    expect(locate(r, 30)).toBe(-1)
  })
})

describe('advance (preview playback)', () => {
  const r = [{ start: 0, end: 10 }, { start: 20, end: 30 }, { start: 10, end: 20 }] // third range is source-adjacent to the first
  it('keeps playing inside the current range', () => expect(advance(r, 0, 5)).toEqual({ type: 'continue', index: 0 }))
  it('goes to the NEXT range in sequence order, not the next in the source', () => {
    // at t=10 the source continues into range 2 (10-20), but the sequence says range 1 (20-30) comes next
    expect(advance(r, 0, 10)).toEqual({ type: 'seek', index: 1, to: 20 })
  })
  it('stops after the last range', () => expect(advance(r, 2, 20)).toEqual({ type: 'stop' }))
  it('continues without seeking when the next range starts exactly where this one ends', () => {
    expect(advance([{ start: 0, end: 10 }, { start: 10, end: 20 }], 0, 10.01)).toEqual({ type: 'continue', index: 1 })
  })
  it('follows the user when they scrub into another range', () => expect(advance(r, 0, 25)).toEqual({ type: 'continue', index: 1 }))
  it('moves on when the user scrubs into a cut-out gap', () => {
    expect(advance([{ start: 0, end: 5 }, { start: 20, end: 30 }], 0, 12)).toEqual({ type: 'seek', index: 1, to: 20 })
  })
  it('handles an empty edit', () => expect(advance([], 0, 1)).toEqual({ type: 'stop' }))
  it('playStart resumes inside the edit or restarts at the first range', () => {
    expect(playStart(r, 5)).toEqual({ t: 5, index: 0 })
    expect(playStart([{ start: 4, end: 8 }], 50)).toEqual({ t: 4, index: 0 })
    expect(playStart([{ start: 4, end: 8 }], 7.98)).toEqual({ t: 4, index: 0 })
  })
})

describe('clip constraints', () => {
  const clips = [clip('a', 0, 10), clip('b', 20, 30), clip('c', 40, 50)]
  it('stops a clip at its neighbours', () => {
    expect(constrainClip(clips, 'b', 5, 45, 60)).toEqual({ start: 10, end: 40 })
    expect(constrainClip(clips, 'a', -5, 100, 60)).toEqual({ start: 0, end: 20 })
  })
  it('keeps a minimum length', () => {
    const r = constrainClip(clips, 'b', 25, 25.01, 60)!
    expect(r.end - r.start).toBeGreaterThanOrEqual(0.3 - 1e-9)
  })
  it('returns null for an unknown clip', () => expect(constrainClip(clips, 'zzz', 0, 1, 60)).toBeNull())
  it('finds overlaps but not touching ranges', () => {
    expect(findOverlap(clips, 5, 12)?.id).toBe('a')
    expect(findOverlap(clips, 10, 20)).toBeUndefined()
    expect(findOverlap(clips, 5, 12, 'a')).toBeUndefined()
  })
  it('clamps ranges into the video', () => {
    expect(clampRange(-3, 2, 10)).toEqual({ start: 0, end: 2 })
    expect(clampRange(9.9, 20, 10)).toEqual({ start: 9.7, end: 10 })
  })
})

describe('list helpers', () => {
  it('moves items', () => expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']))
  it('ignores invalid moves', () => expect(moveItem(['a', 'b'], 5, 0)).toEqual(['a', 'b']))
  it('merges overlapping ranges', () => expect(mergeRanges([{ start: 5, end: 8 }, { start: 0, end: 6 }, { start: 10, end: 12 }])).toEqual([{ start: 0, end: 8 }, { start: 10, end: 12 }]))
})

describe('splitAtPauses', () => {
  it('cuts a long pause but keeps padding on both sides', () => {
    const out = splitAtPauses({ start: 0, end: 10 }, [{ start: 4, end: 7 }], 0.2)
    expect(out).toEqual([{ start: 0, end: 4.2 }, { start: 6.8, end: 10 }])
  })
  it('leaves a pause alone when it is too short to cut cleanly', () => {
    expect(splitAtPauses({ start: 0, end: 10 }, [{ start: 4, end: 4.6 }], 0.2)).toEqual([{ start: 0, end: 10 }])
  })
  it('ignores pauses outside the range and clips pauses that straddle an edge', () => {
    expect(splitAtPauses({ start: 5, end: 10 }, [{ start: 0, end: 2 }], 0.2)).toEqual([{ start: 5, end: 10 }])
    const out = splitAtPauses({ start: 5, end: 10 }, [{ start: 3, end: 7 }], 0.2)
    expect(out[0].start).toBeCloseTo(6.8)
  })
  it('never returns an empty list', () => expect(splitAtPauses({ start: 0, end: 1 }, [{ start: -5, end: 9 }], 0)).toHaveLength(1))
})

describe('parseTime', () => {
  it.each([['12.5', 12.5], ['0:12.5', 12.5], ['1:23', 83], ['1:02:03', 3723], ['12,5', 12.5]])('%s -> %s', (i, o) => expect(parseTime(i)).toBe(o))
  it.each(['', 'abc', '1:75', '-3', '1:2:3:4'])('rejects %j', (i) => expect(parseTime(i)).toBeNull())
})

describe('sanitizeClips', () => {
  const id = () => 'gen'
  it('keeps valid clips, clamps to the video, drops junk, fills missing ids', () => {
    const out = sanitizeClips([
      { id: 'a', start: 1, end: 5, label: 'x' }, { start: -4, end: 3 }, { id: 'b', start: 8, end: 99 },
      { id: 'c', start: 5, end: 5.1 }, { start: 'q', end: 3 }, null, 7, { id: 'd', start: NaN, end: 4 },
    ], 10, id)
    expect(out).toEqual([{ id: 'a', start: 1, end: 5, label: 'x' }, { id: 'gen', start: 0, end: 3 }, { id: 'b', start: 8, end: 10 }])
  })
  it('returns [] for non-arrays', () => { expect(sanitizeClips(undefined, 10, id)).toEqual([]); expect(sanitizeClips({}, 10, id)).toEqual([]) })
})
