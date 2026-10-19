import type { Caption } from '../types'
import { uid } from './util'

const TS = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/
const toSec = (m: RegExpMatchArray) => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0')) / 1000
const mk = (start: number, end: number, text: string): Caption => ({ id: uid(), start, end, text, x: 0.5, y: 0.8 })

export function looksLikeSrt(s: string) { return /-->/.test(s) && TS.test(s) }

export function parseSrt(src: string): Caption[] {
  const out: Caption[] = []
  for (const block of src.replace(/^\uFEFF/, '').replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue
    const [a, b] = lines[i].split('-->')
    const ma = a.match(TS), mb = b.match(TS)
    if (!ma || !mb) continue
    const text = lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim()
    if (text) out.push(mk(toSec(ma), toSec(mb), text))
  }
  return out
}

function stamp(t: number) {
  const ms = Math.round(t * 1000)
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}

export function toSrt(caps: Caption[], offset = 0): string {
  return [...caps].sort((a, b) => a.start - b.start)
    .map((c, i) => `${i + 1}\n${stamp(Math.max(0, c.start - offset))} --> ${stamp(Math.max(0, c.end - offset))}\n${c.text}\n`)
    .join('\n')
}

/** Split text into short caption-sized chunks (default 6 words). */
export function chunkText(text: string, max = 6): string[] {
  const out: string[] = []
  for (const line of text.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
    const w = line.split(/\s+/)
    for (let i = 0; i < w.length; i += max) out.push(w.slice(i, i + max).join(' '))
  }
  return out
}

/** Spread chunks across [start,end], proportional to character count. */
export function spread(chunks: string[], start: number, end: number): Caption[] {
  const total = chunks.reduce((a, c) => a + c.length, 0) || 1
  let t = start
  return chunks.map((c) => {
    const d = ((end - start) * c.length) / total
    const cap = mk(t, t + d, c)
    t += d
    return cap
  })
}
