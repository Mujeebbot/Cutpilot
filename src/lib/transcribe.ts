import type { Transcript } from './transcribe.core'
import { SAMPLE_RATE } from './transcribe.core'
import type { WorkerOut } from './transcribe.worker'

export type { Transcript } from './transcribe.core'

export const MODELS = [
  { id: 'Xenova/whisper-tiny.en', label: 'Whisper tiny (English, ~40 MB)' },
  { id: 'Xenova/whisper-tiny', label: 'Whisper tiny (multilingual, ~40 MB)' },
  { id: 'Xenova/whisper-base.en', label: 'Whisper base (English, ~80 MB, better)' },
]

type Progress = (pct: number | null, label: string) => void

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
const abortError = () => new DOMException('Transcription cancelled', 'AbortError')
class WorkerUnavailable extends Error {}

/** Runs the shared Whisper engine in a module Web Worker. Rejects with AbortError when `signal` aborts (the worker is terminated). */
function inWorker(seg: Float32Array, start: number, end: number, model: string, onProgress: Progress, signal?: AbortSignal): Promise<Transcript> {
  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(new URL('./transcribe.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      reject(new WorkerUnavailable('Web Workers are not available'))
      return
    }
    let ready = false, finished = false
    const finish = (settle: () => void) => {
      if (finished) return
      finished = true
      signal?.removeEventListener('abort', onAbort)
      worker.terminate()
      settle()
    }
    const onAbort = () => finish(() => reject(abortError()))
    signal?.addEventListener('abort', onAbort)
    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data
      if (m.type === 'ready') ready = true
      else if (m.type === 'progress') onProgress(m.pct, m.label)
      else if (m.type === 'done') finish(() => resolve(m.result))
      else if (m.type === 'error') finish(() => reject(new Error(m.message)))
    }
    worker.onerror = (e) => finish(() => reject(ready ? new Error(e.message || 'The transcription worker stopped unexpectedly.') : new WorkerUnavailable(e.message)))
    worker.postMessage({ type: 'run', audio: seg, start, end, model })
  })
}

/**
 * Local, free speech-to-text via Transformers.js (Whisper in the browser, WASM). No API key; audio stays on the device.
 * Audio is decoded here (AudioContext only exists on the main thread); the model runs in a Web Worker so the interface never freezes.
 * First asks Whisper for word-level timestamps (cross-attention alignment). If the model/runtime can't provide them
 * it falls back to segment timestamps and marks every word as approximated.
 */
export async function transcribe(file: File, start: number, end: number, model: string, onProgress: Progress, signal?: AbortSignal): Promise<Transcript> {
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
  if (signal?.aborted) throw abortError()

  const sr = SAMPLE_RATE
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * sr)), sr)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  const mono = (await off.startRendering()).getChannelData(0)
  const seg = mono.slice(Math.floor(start * sr), Math.floor(end * sr))
  if (seg.length < sr / 2) throw new Error('The selected range is too short to transcribe.')
  if (signal?.aborted) throw abortError()

  try {
    return await inWorker(seg, start, end, model, onProgress, signal)
  } catch (e) {
    if (!(e instanceof WorkerUnavailable)) throw e
  }
  // Fallback: same engine on the main thread (the page will be sluggish while it runs and it cannot be interrupted mid-run).
  const { runTranscription } = await import('./transcribe.engine')
  const result = await runTranscription(seg, start, end, model, { onProgress })
  if (signal?.aborted) throw abortError()
  return result
}
