import type { Caption, CaptionStyle, CanvasSettings } from '../types'
import { drawCaption } from './render'
import { canvasSize, drawFrame } from './compose'
import { styleFor } from './captions'
import { ensureFonts } from './fonts'

interface Graph { ctx: AudioContext; src: MediaElementAudioSourceNode; dest: MediaStreamAudioDestinationNode }
const graphs = new WeakMap<HTMLVideoElement, Graph>()

/** createMediaElementSource may only be called once per element, so cache it. */
function getGraph(v: HTMLVideoElement): Graph {
  let g = graphs.get(v)
  if (!g) {
    const ctx = new AudioContext()
    const src = ctx.createMediaElementSource(v)
    const dest = ctx.createMediaStreamDestination()
    src.connect(dest)
    src.connect(ctx.destination)
    g = { ctx, src, dest }
    graphs.set(v, g)
  }
  return g
}

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((res) => {
    if (Math.abs(v.currentTime - t) < 0.001) return res()
    v.addEventListener('seeked', () => res(), { once: true })
    v.currentTime = t
  })
}

export interface ExportOptions {
  video: HTMLVideoElement
  start: number
  end: number
  captions: Caption[]
  style: CaptionStyle
  canvas: CanvasSettings
  onProgress: (pct: number) => void
  signal: AbortSignal
}

const MIMES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

/**
 * Real-time render: plays the trimmed range, draws each frame + captions onto a
 * canvas, and records canvas + audio with MediaRecorder. Takes as long as the clip.
 */
export async function exportVideo(o: ExportOptions): Promise<{ blob: Blob; ext: string }> {
  const { video, start, end, captions, style, canvas: cv, onProgress, signal } = o
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser has no MediaRecorder. Use a current Chrome, Edge or Firefox.')
  const mime = MIMES.find((m) => MediaRecorder.isTypeSupported(m))
  if (!mime) throw new Error('This browser cannot record video in MP4 or WebM.')

  const { w: W, h: H } = canvasSize(cv.aspect, video.videoWidth, video.videoHeight)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  await ensureFonts([style, ...captions.flatMap((c) => (c.style ? [c.style] : []))])

  const g = getGraph(video)
  await g.ctx.resume()
  const stream = canvas.captureStream(30)
  g.dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const stopped = new Promise<void>((r) => { rec.onstop = () => r() })

  const draw = () => {
    drawFrame(ctx, video, W, H, cv)
    const t = video.currentTime
    for (const c of captions) if (t >= c.start && t < c.end) drawCaption(ctx, W, H, c, styleFor(c, style), t)
  }

  const prevTime = video.currentTime
  video.pause()
  g.src.disconnect(g.ctx.destination) // keep recording, silence the speakers
  try {
    await seek(video, start)
    draw()
    rec.start(250)
    await video.play()
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (signal.aborted || video.currentTime >= end || video.ended) return resolve()
        draw()
        onProgress(Math.min(1, (video.currentTime - start) / (end - start)))
        requestAnimationFrame(tick)
      }
      tick()
    })
    video.pause()
    if (signal.aborted) throw new Error('Export cancelled')
    draw()
    await new Promise((r) => setTimeout(r, 200)) // let the last frame flush
    rec.stop()
    await stopped
  } finally {
    if (rec.state !== 'inactive') rec.stop()
    video.pause()
    stream.getVideoTracks().forEach((t) => t.stop())
    g.dest.stream.getAudioTracks().forEach((t) => stream.removeTrack(t))
    g.src.connect(g.ctx.destination)
    await seek(video, prevTime)
  }
  onProgress(1)
  const blob = new Blob(chunks, { type: mime.split(';')[0] })
  return { blob, ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' }
}
