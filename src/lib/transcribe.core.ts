import type { Word } from '../types'

/**
 * Whisper post-processing shared by the worker and the main-thread fallback. It takes any `asr` function with the
 * Transformers.js call signature, so the same code path is used everywhere (and can be tested with a fake).
 */
export interface Transcript {
  words: Word[]
  /** true = every word has its own timestamp from Whisper; false = only segment timestamps, words approximated. */
  precise: boolean
}

export type AsrFn = (audio: Float32Array, options: Record<string, unknown>) => Promise<unknown>
type Chunk = { text?: string; timestamp?: [number, number | null] }

export const SAMPLE_RATE = 16000
export const CHUNK_S = 30
export const STRIDE_S = 5

/** Number of 30 s windows Transformers.js will run for this many samples (window 30 s, stride 5 s on both sides => 20 s hop). */
export function chunkCount(samples: number): number {
  const window = SAMPLE_RATE * CHUNK_S
  const jump = window - 2 * SAMPLE_RATE * STRIDE_S
  return samples <= window ? 1 : Math.ceil((samples - window) / jump) + 1
}

export const splitWords = (text: string, s: number, e: number): Word[] => {
  const toks = text.trim().split(/\s+/).filter(Boolean)
  const total = toks.reduce((a, w) => a + w.length + 1, 0) || 1
  let acc = 0
  return toks.map((t) => {
    const w: Word = { t, s: s + ((e - s) * acc) / total, e: s + ((e - s) * (acc + t.length + 1)) / total, a: true }
    acc += t.length + 1
    return w
  })
}

const first = (o: unknown): { chunks: Chunk[]; text: string } => {
  const r = (Array.isArray(o) ? o[0] : o) as { chunks?: Chunk[]; text?: string } | undefined
  return { chunks: r?.chunks ?? [], text: r?.text ?? '' }
}

/**
 * Runs the ASR function over `seg` (16 kHz mono audio that begins at `start` seconds in the source video).
 * First asks for word-level timestamps; if the model/runtime cannot provide them, falls back to segment timestamps
 * and marks every word as approximated. `onChunk(done, total)` reports REAL progress: one call per finished 30 s window.
 */
export async function recognise(asr: AsrFn, seg: Float32Array, start: number, end: number, onChunk?: (done: number, total: number) => void): Promise<Transcript> {
  const total = chunkCount(seg.length)
  const opts = (): Record<string, unknown> => {
    let done = 0
    const o: Record<string, unknown> = { chunk_length_s: CHUNK_S, stride_length_s: STRIDE_S }
    if (onChunk) {
      // Transformers.js calls streamer.end() once per generated window; progress must never break generation.
      o.streamer = { put() { /* tokens are not needed */ }, end() { try { onChunk(Math.min(++done, total), total) } catch { /* ignore */ } } }
    }
    return o
  }

  // 1) word-level timestamps
  try {
    const { chunks } = first(await asr(seg, { ...opts(), return_timestamps: 'word' }))
    const words: Word[] = chunks
      .map((c) => ({ t: (c.text ?? '').trim(), s: start + (c.timestamp?.[0] ?? NaN), e: start + (c.timestamp?.[1] ?? (c.timestamp?.[0] ?? NaN) + 0.3) }))
      .filter((w) => w.t && Number.isFinite(w.s) && Number.isFinite(w.e))
    if (words.length) return { words, precise: true }
  } catch {
    /* fall through to segment timestamps */
  }

  // 2) segment-level timestamps, words approximated inside each segment
  const { chunks, text } = first(await asr(seg, { ...opts(), return_timestamps: true }))
  const words: Word[] = []
  for (const c of chunks) {
    const s = start + (c.timestamp?.[0] ?? 0)
    const e = start + (c.timestamp?.[1] ?? (c.timestamp?.[0] ?? 0) + 2)
    words.push(...splitWords(c.text ?? '', s, Math.max(e, s + 0.4)))
  }
  if (!words.length && text.trim()) words.push(...splitWords(text, start, end))
  if (!words.length) throw new Error('No speech was detected in the selected range.')
  return { words, precise: false }
}
