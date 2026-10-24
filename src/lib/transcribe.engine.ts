import type { AsrFn, Transcript } from './transcribe.core'
import { recognise } from './transcribe.core'

export interface EngineHooks {
  /** pct = null when the amount of work is unknown. */
  onProgress: (pct: number | null, label: string) => void
}

interface TfModule {
  pipeline: (task: 'automatic-speech-recognition', model: string, opts: { progress_callback: (p: { status: string; progress?: number; file?: string }) => void }) => Promise<AsrFn>
}

/** Loads the Whisper pipeline (downloads and caches the model on first use) and transcribes the audio. Runs in the worker, or on the main thread as a fallback. */
export async function runTranscription(seg: Float32Array, start: number, end: number, model: string, hooks: EngineHooks): Promise<Transcript> {
  const tf = (await import('@huggingface/transformers')) as unknown as TfModule
  const asr = await tf.pipeline('automatic-speech-recognition', model, {
    progress_callback: (p) => {
      if (p.status === 'progress' && typeof p.progress === 'number') hooks.onProgress(p.progress, `Downloading model: ${p.file ?? ''}`)
    },
  })
  hooks.onProgress(null, 'Transcribing on this device… this can take a while')
  return recognise(asr, seg, start, end, (done, total) => hooks.onProgress(null, `Transcribing on this device… ${done} of ${total} section${total === 1 ? '' : 's'} done`))
}
