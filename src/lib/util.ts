export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const uid = () => Math.random().toString(36).slice(2, 9)

export function fmt(t: number) {
  if (!isFinite(t) || t < 0) t = 0
  const m = Math.floor(t / 60)
  return `${m}:${(t - m * 60).toFixed(2).padStart(5, '0')}`
}

export function download(data: Blob | string, name: string) {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (typeof data !== 'string') setTimeout(() => URL.revokeObjectURL(url), 10000)
}
