/** One spoken word with timing. `a` marks timing that was approximated rather than measured. */
export interface Word { t: string; s: number; e: number; a?: true }

export interface Caption {
  id: string
  start: number
  end: number
  /** Wrap words in *asterisks* to mark keywords manually (this disables auto-emphasis for the caption). */
  text: string
  /** centre position, 0..1 of canvas width/height */
  x: number
  y: number
  /** Per-word timing (one entry per word in `text`). Dropped when the text is edited. */
  words?: Word[]
  /** 'word' = measured word timestamps, 'segment' = approximated inside a segment. Undefined = manual/imported. */
  timing?: 'word' | 'segment'
  /** Own style (a template applied to this caption only). Falls back to the project style. */
  style?: CaptionStyle
  presetId?: string
  /** True once the user changed text or timing by hand. */
  edited?: boolean
  /** 'draft' = generated from the transcript when a first-draft plan was applied (safe to regenerate while unedited). */
  origin?: 'draft'
}

export type Align = 'left' | 'center' | 'right'
export type Animation = 'none' | 'pop' | 'bounce' | 'slide' | 'fade' | 'karaoke'

export interface CaptionStyle {
  font: string
  weight: number
  size: number // px at 1080p reference height
  uppercase: boolean
  letterSpacing: number // em
  align: Align
  color: string
  wordHighlight: boolean // active word changes colour
  highlightColor: string // active word + keyword colour
  highlightBox: boolean // active word sits on a rounded box
  autoEmphasis: boolean // detect numbers, names, strong words
  kwFont: string // '' = same font as text
  kwWeight: number // 0 = same weight
  kwItalic: boolean
  kwScale: number
  kwSize?: number | null // null = use kwScale multiplier (px at 1080p reference height)
  kwBox: boolean // keywords sit on a filled box
  outlineColor: string
  outlineWidth: number // px at 1080p
  shadow: number // px at 1080p, 0 = off
  glow: number // px at 1080p, 0 = off
  glowColor: string
  bgColor: string
  bgOpacity: number
  bgRadius: number // fraction of font size
  bgPad: number // fraction of font size
  animation: Animation
  animSpeed: number // 0.5..2
  animIntensity: number // 0..1
}

export type Density = number // 1..10 words per caption (validated at runtime)
export interface Trim { start: number; end: number }
export type Tool = 'media' | 'captions' | 'styles' | 'ai' | 'draft'

/**
 * One piece of the edit: a range of the ORIGINAL video, referenced by source time (the media is never cut or copied).
 * The array order IS the playback/export order. When the project has no clips, the single `trim` range is the edit.
 */
export interface Clip { id: string; start: number; end: number; label?: string; suggestionId?: string }

export type OutputFormat = '9:16' | '1:1' | '16:9'
/** What the creator told CutPilot when starting the project. */
export interface ProjectBrief { name: string; text: string; format: OutputFormat }
export type Aspect = 'source' | '9:16' | '1:1' | '16:9'
export interface CanvasSettings { aspect: Aspect; bgMode: 'blur' | 'solid'; bgColor: string }
export const DEFAULT_CANVAS: CanvasSettings = { aspect: 'source', bgMode: 'blur', bgColor: '#0a0b0e' }

/** Open-source (SIL OFL) Google Fonts loaded from index.html. Weights match what index.html requests. */
export const FONT_META: Record<string, { weights: number[]; italic?: boolean; serif?: boolean }> = {
  'Anton': { weights: [400] },
  'Archivo Black': { weights: [400] },
  'Baloo 2': { weights: [800] },
  'Bangers': { weights: [400] },
  'Bebas Neue': { weights: [400] },
  'DM Serif Display': { weights: [400], serif: true },
  'Fredoka': { weights: [600] },
  'Inter': { weights: [400, 500, 600, 700] },
  'Instrument Serif': { weights: [400], italic: true, serif: true },
  'Lilita One': { weights: [400] },
  'Luckiest Guy': { weights: [400] },
  'Montserrat': { weights: [500, 700, 800, 900] },
  'Playfair Display': { weights: [700], italic: true, serif: true },
  'Poppins': { weights: [500, 600, 700, 800] },
  'Rubik': { weights: [500, 800] },
  'Space Grotesk': { weights: [500, 600, 700] },
}
export const FONTS = Object.keys(FONT_META)
export const nearestWeight = (font: string, w: number) =>
  (FONT_META[font]?.weights ?? [400]).reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a))

/** Base style. Also the fallback for projects saved before newer fields existed. */
export const DEFAULT_STYLE: CaptionStyle = {
  font: 'Anton', weight: 400, size: 88, uppercase: true, letterSpacing: 0, align: 'center',
  color: '#ffffff', wordHighlight: true, highlightColor: '#ffe14d', highlightBox: false, autoEmphasis: false,
  kwFont: '', kwWeight: 0, kwItalic: false, kwScale: 1, kwSize: null, kwBox: false,
  outlineColor: '#000000', outlineWidth: 9, shadow: 6, glow: 0, glowColor: '#ffffff',
  bgColor: '#000000', bgOpacity: 0, bgRadius: 0.22, bgPad: 0.28,
  animation: 'none', animSpeed: 1, animIntensity: 0.6,
}
