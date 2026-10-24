import type { Transcript } from './transcribe.core'
import { runTranscription } from './transcribe.engine'

/** Runs Whisper off the main thread so the interface stays responsive, and so a job can be cancelled by terminating the worker. */
export type WorkerIn = { type: 'run'; audio: Float32Array; start: number; end: number; model: string }
export type WorkerOut =
  | { type: 'ready' }
  | { type: 'progress'; pct: number | null; label: string }
  | { type: 'done'; result: Transcript }
  | { type: 'error'; message: string }

const ctx = self as unknown as { postMessage: (m: WorkerOut) => void; onmessage: ((e: MessageEvent<WorkerIn>) => void) | null }

ctx.onmessage = async (e) => {
  if (e.data.type !== 'run') return
  const { audio, start, end, model } = e.data
  try {
    const result = await runTranscription(audio, start, end, model, { onProgress: (pct, label) => ctx.postMessage({ type: 'progress', pct, label }) })
    ctx.postMessage({ type: 'done', result })
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
ctx.postMessage({ type: 'ready' })
