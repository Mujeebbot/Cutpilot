import type { Aspect, CanvasSettings } from '../types'

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

/** Output size. 'source' keeps the video's own shape (long edge capped at 1920); presets use standard sizes. */
export function canvasSize(aspect: Aspect, vw: number, vh: number): { w: number; h: number } {
  if (aspect === '9:16') return { w: 1080, h: 1920 }
  if (aspect === '1:1') return { w: 1080, h: 1080 }
  if (aspect === '16:9') return { w: 1920, h: 1080 }
  const k = Math.min(1, 1920 / Math.max(vw || 1, vh || 1))
  return { w: even((vw || 16) * k), h: even((vh || 9) * k) }
}

let small: HTMLCanvasElement | null = null

/**
 * Paints the video into the canvas. Used by BOTH the preview and the exporter, so the framing
 * and background you see are what gets exported. For non-source canvases the video is letter-boxed
 * onto a soft-blurred copy of itself (cheap downscale/upscale blur, works in every browser) or a solid colour.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, W: number, H: number, cv: CanvasSettings) {
  const vw = video.videoWidth, vh = video.videoHeight
  if (!vw || !vh) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return }
  if (cv.aspect === 'source') { ctx.drawImage(video, 0, 0, W, H); return }
  const k = Math.min(W / vw, H / vh)
  const w = vw * k, h = vh * k
  if (cv.bgMode === 'blur') {
    small ??= document.createElement('canvas')
    small.width = 48
    small.height = Math.max(2, Math.round((48 * H) / W))
    const sctx = small.getContext('2d')!
    const kc = Math.max(small.width / vw, small.height / vh)
    sctx.drawImage(video, (small.width - vw * kc) / 2, (small.height - vh * kc) / 2, vw * kc, vh * kc)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(small, 0, 0, W, H)
    ctx.fillStyle = 'rgba(0,0,0,0.38)'
    ctx.fillRect(0, 0, W, H)
  } else {
    ctx.fillStyle = cv.bgColor
    ctx.fillRect(0, 0, W, H)
  }
  ctx.drawImage(video, (W - w) / 2, (H - h) / 2, w, h)
}
