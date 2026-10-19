import type { Word } from '../types'

export const MODELS = [
  { id: 'Xenova/whisper-tiny.en', label: 'Whisper tiny (English, ~40 MB)' },
  { id: 'Xenova/whisper-tiny', label: 'Whisper tiny (multilingual, ~40 MB)' },
  { id: 'Xenova/whisper-base.en', label: 'Whisper base (English, ~80 MB, better)' },
]

type Progress = (pct: number | null, label: string) => void
type Chunk = { text: string; timestamp: [number, number | null] }

export interface Transcript {
  words: Word[]
  /** true = every word has its own timestamp from Whisper; false = only segment timestamps, words approximated. */
  precise: boolean
}

const splitWords = (text: string, s: number, e: number): Word[] => {
  const toks = text.trim().split(/\s+/).filter(Boolean)
  const total = toks.reduce((a, w) => a + w.length + 1, 0) || 1
  let acc = 0
  return toks.map((t) => {
    const w: Word = { t, s: s + ((e - s) * acc) / total, e: s + ((e - s) * (acc + t.length + 1)) / total, a: true }
    acc += t.length + 1
    return w
  })
}

/**
 * Local, free speech-to-text via Transformers.js (Whisper in the browser, WASM). No API key; audio stays on the device.
 * First asks Whisper for word-level timestamps (cross-attention alignment). If the model/runtime can't provide them
 * it falls back to segment timestamps and marks every word as approximated.
 */
export async function transcribe(file: File, start: number, end: number, model: string, onProgress: Progress): Promise<Transcript> {
  onProgress(null, 'Decoding audio…')
  const actx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await actx.decodeAudioData(await file.arrayBuffer())
  } catch {
    throw new Error('Could not decode an audio track from this file. Does the video have sound?')
  } finally {
    void actx.close()
  }

  const sr = 16000
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * sr)), sr)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const mono = (await off.startRendering()).getChannelData(0)
  const seg = mono.slice(Math.floor(start * sr), Math.floor(end * sr))
  if (seg.length < sr / 2) throw new Error('The selected range is too short to transcribe.')

  const tf = (await import('@huggingface/transformers')) as unknown as { pipeline: (...a: any[]) => Promise<any> }
  const asr = await tf.pipeline('automatic-speech-recognition', model, {
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      if (p.status === 'progress' && typeof p.progress === 'number') onProgress(p.progress, `Downloading model: ${p.file ?? ''}`)
    },
  })

  onProgress(null, 'Transcribing on this device… this can take a while')
  const opts = { chunk_length_s: 30, stride_length_s: 5 }
  const first = (o: any): { chunks: Chunk[]; text: string } => { const r = Array.isArray(o) ? o[0] : o; return { chunks: r?.chunks ?? [], text: r?.text ?? '' } }

  // 1) word-level timestamps
  try {
    const { chunks } = first(await asr(seg, { ...opts, return_timestamps: 'word' }))
    const words: Word[] = chunks
      .map((c) => ({ t: (c.text ?? '').trim(), s: start + (c.timestamp?.[0] ?? NaN), e: start + (c.timestamp?.[1] ?? (c.timestamp?.[0] ?? NaN) + 0.3) }))
      .filter((w) => w.t && Number.isFinite(w.s) && Number.isFinite(w.e))
    if (words.length) return { words, precise: true }
  } catch {
    /* fall through to segment timestamps */
  }

  // 2) segment-level timestamps, words approximated inside each segment
  const { chunks, text } = first(await asr(seg, { ...opts, return_timestamps: true }))
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
