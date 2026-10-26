import type { Aspect } from '../types'
import { TEMPLATES, type Template } from './templates'

export type Intent =
  | { type: 'density'; words: number }
  | { type: 'template'; template: Template }
  | { type: 'position'; y: number; label: string }
  | { type: 'canvas'; aspect: Aspect }
  | { type: 'clear_captions' }
  | { type: 'trim'; start?: number; end?: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'describe'; query: 'captions' | 'template' | 'canvas' | 'all' }

export interface AssistantStateSnapshot {
  captionsCount: number
  templateName: string
  canvasAspect: Aspect
  duration: number
  clipsCount: number
  trim: { start: number; end: number }
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

function parseSeconds(raw: string): number | null {
  const clean = raw.trim().replace(/s$/, '')
  if (clean.includes(':')) {
    const parts = clean.split(':').map((p) => parseFloat(p))
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1]
    }
  }
  const val = parseFloat(clean)
  return isNaN(val) ? null : val
}

export function parseIntent(input: string): Intent | null {
  const text = input.trim().toLowerCase()
  if (!text) return null

  // 1. Undo / Redo
  if (/^(undo|revert)(\s+that|\s+last|\s+action)?$/i.test(text)) {
    return { type: 'undo' }
  }
  if (/^(redo)(\s+that|\s+last|\s+action)?$/i.test(text)) {
    return { type: 'redo' }
  }

  // 2. Clear captions
  if (/\b(clear|remove|delete)\s+(all\s+)?captions\b/i.test(text)) {
    return { type: 'clear_captions' }
  }

  // 3. Caption density
  const oneAtATime = /\bone\s+word\s+at\s+a\s+time\b/i.test(text)
  if (oneAtATime) {
    return { type: 'density', words: 1 }
  }
  const densityMatch = text.match(/\b(?:use\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-| )?words?(?:\s+(?:at\s+a\s+time|per\s+caption|captions?))?\b/i)
  if (densityMatch) {
    const raw = densityMatch[1]
    const n = NUMBER_WORDS[raw] ?? parseInt(raw, 10)
    if (!isNaN(n) && n >= 1 && n <= 10) {
      return { type: 'density', words: n }
    }
  }

  // 4. Caption position
  if (/\b(move|put|place|position|set|align)\s+(?:all\s+)?captions?\s+(?:to|at|in|on)?\s*(?:the\s+)?(top|bottom|center|centre|middle)\b/i.test(text) ||
      /\b(?:captions?\s+)?(?:to|at|in|on)?\s*(?:the\s+)?(top|bottom|center|centre|middle)\s*(?:captions?)?\b/i.test(text)) {
    if (/\b(top)\b/i.test(text)) return { type: 'position', y: 0.15, label: 'top' }
    if (/\b(bottom)\b/i.test(text)) return { type: 'position', y: 0.85, label: 'bottom' }
    if (/\b(center|centre|middle)\b/i.test(text)) return { type: 'position', y: 0.5, label: 'center' }
  }

  // 5. Canvas aspect ratio
  if (/\b(switch|change|set)\s+(?:the\s+)?(?:canvas\s+)?(?:format|aspect|ratio)?\s*(?:to\s+)?(9:16|1:1|16:9|vertical|portrait|square|landscape|original|source)\b/i.test(text) ||
      /\b(vertical|portrait|square|landscape|9:16|1:1|16:9|original)\s+(?:canvas|format|aspect|ratio)\b/i.test(text)) {
    if (/\b(9:16|vertical|portrait)\b/i.test(text)) return { type: 'canvas', aspect: '9:16' }
    if (/\b(1:1|square)\b/i.test(text)) return { type: 'canvas', aspect: '1:1' }
    if (/\b(16:9|landscape)\b/i.test(text)) return { type: 'canvas', aspect: '16:9' }
    if (/\b(original|source)\b/i.test(text)) return { type: 'canvas', aspect: 'source' }
  }

  // 6. Template matching (search known templates)
  const sortedTemplates = [...TEMPLATES].sort((a, b) => b.name.length - a.name.length)
  for (const t of sortedTemplates) {
    const nameMatch = new RegExp(`\\b(apply|use|switch to|select|try)?\\s*(?:the\\s+)?${t.name.toLowerCase()}(?:\\s+template|\\s+style)?\\b`, 'i').test(text)
    const idMatch = new RegExp(`\\b${t.id.toLowerCase()}\\b`, 'i').test(text)
    if (nameMatch || idMatch) {
      return { type: 'template', template: t }
    }
  }

  // 7. Trim start / end
  const trimStartMatch = text.match(/\b(?:set\s+)?trim\s+start\s+(?:to|at)?\s*(\d+(?::\d+)?(?:\.\d+)?s?)\b/i)
  if (trimStartMatch) {
    const sec = parseSeconds(trimStartMatch[1])
    if (sec !== null) return { type: 'trim', start: sec }
  }
  const trimEndMatch = text.match(/\b(?:set\s+)?trim\s+end\s+(?:to|at)?\s*(\d+(?::\d+)?(?:\.\d+)?s?)\b/i)
  if (trimEndMatch) {
    const sec = parseSeconds(trimEndMatch[1])
    if (sec !== null) return { type: 'trim', end: sec }
  }

  // 8. Describe / Query
  if (/\b(how many captions|caption count|number of captions)\b/i.test(text)) {
    return { type: 'describe', query: 'captions' }
  }
  if (/\b(what template|which template|current template|template name)\b/i.test(text)) {
    return { type: 'describe', query: 'template' }
  }
  if (/\b(what canvas|what aspect|aspect ratio|canvas format)\b/i.test(text)) {
    return { type: 'describe', query: 'canvas' }
  }
  if (/\b(status|describe state|project status|summary)\b/i.test(text)) {
    return { type: 'describe', query: 'all' }
  }

  return null
}

export function describeState(state: AssistantStateSnapshot, query: 'captions' | 'template' | 'canvas' | 'all'): string {
  switch (query) {
    case 'captions':
      return `There are currently ${state.captionsCount} caption${state.captionsCount === 1 ? '' : 's'} in the project.`
    case 'template':
      return `The active template is "${state.templateName}".`
    case 'canvas':
      return `The current canvas aspect ratio is ${state.canvasAspect === 'source' ? 'Original (source)' : state.canvasAspect}.`
    case 'all':
      return `Project status: ${state.captionsCount} captions, active template "${state.templateName}", canvas ${state.canvasAspect}, edit length ${(state.trim.end - state.trim.start).toFixed(1)}s.`
  }
}
