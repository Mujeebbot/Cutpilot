import type { CaptionStyle } from '../types'
import { DEFAULT_STYLE } from '../types'

export const CATEGORIES = [
  'Featured', 'COVE-inspired', 'FLAIR-inspired', 'Bold & Viral', 'Word-by-Word', 'Karaoke', 'Podcast', 'Minimal & Clean',
  'Cinematic', 'Colorful & Playful', 'Highlighted Keywords', 'Outlined & Shadowed', 'Animated',
] as const
export type Category = (typeof CATEGORIES)[number]

export interface Template {
  id: string
  name: string
  cats: Category[]
  blurb: string
  words: 1 | 2 | 3 // suggested words per caption (the user can always change it)
  sample: string // *asterisks* mark the keyword shown in the thumbnail
  style: CaptionStyle
}

const T = (id: string, name: string, cats: Category[], blurb: string, words: 1 | 2 | 3, sample: string, s: Partial<CaptionStyle>): Template =>
  ({ id, name, cats, blurb, words, sample, style: { ...DEFAULT_STYLE, ...s } })

/** 'Animated' and 'Word-by-Word' are derived from the style/words fields, so they can never go out of sync. */
export const matchesCategory = (t: Template, c: Category) =>
  c === 'Animated' ? t.style.animation !== 'none' : c === 'Word-by-Word' ? t.words === 1 : t.cats.includes(c)

export const TEMPLATES: Template[] = [
  // ---- original presets (kept) ----
  T('heavy-pop', 'Heavy Pop', ['Featured', 'Bold & Viral', 'Outlined & Shadowed'], 'Condensed heavy caps, yellow active word', 2, 'This is *huge*',
    { animation: 'pop' }),
  T('karaoke-box', 'Karaoke Box', ['Featured', 'Karaoke'], 'Active word rides a violet box', 3, 'Follow the *beat* now',
    { font: 'Montserrat', weight: 800, size: 64, highlightColor: '#8b7cf6', highlightBox: true, outlineWidth: 0, shadow: 5, animation: 'pop', animIntensity: 0.35 }),
  T('marquee', 'Marquee', ['Bold & Viral'], 'Tall yellow caps that slide in', 2, 'Big *news* today',
    { font: 'Bebas Neue', size: 104, color: '#ffe14d', highlightColor: '#ffffff', outlineColor: '#14110a', outlineWidth: 10, shadow: 4, animation: 'slide' }),
  T('bubble', 'Bubble', ['Colorful & Playful', 'Outlined & Shadowed'], 'Chunky rounded letters, bounce entrance', 2, 'Pop *pop* pop',
    { font: 'Luckiest Guy', size: 78, highlightColor: '#5eead4', outlineColor: '#2a1458', outlineWidth: 12, shadow: 8, animation: 'bounce' }),
  T('pill', 'Pill', ['Podcast', 'Minimal & Clean'], 'White text on a rounded dark pill', 3, 'Welcome to the *show*',
    { font: 'Poppins', weight: 700, size: 54, uppercase: false, outlineWidth: 0, shadow: 0, bgOpacity: 0.74, bgRadius: 0.5, animation: 'fade' }),
  T('burst', 'Burst', ['Bold & Viral', 'Colorful & Playful'], 'Comic caps with a red outline', 2, 'Boom *crash* wow',
    { font: 'Bangers', size: 94, color: '#ffe14d', highlightColor: '#ffffff', outlineColor: '#c2331b', outlineWidth: 9, shadow: 6, animation: 'pop' }),
  T('editorial', 'Editorial', ['Cinematic'], 'Soft serif with a gentle fade', 3, 'Slow and *quiet* light',
    { font: 'DM Serif Display', size: 66, uppercase: false, highlightColor: '#d9ccff', outlineWidth: 0, shadow: 9, animation: 'fade' }),
  T('clean', 'Clean', ['Minimal & Clean'], 'Plain, readable subtitle', 3, 'Simple and *clear* text',
    { font: 'Inter', weight: 600, size: 46, uppercase: false, wordHighlight: false, outlineWidth: 3, shadow: 3 }),

  // ---- COVE-inspired: tall high-contrast serif, mixed case, tight tracking, soft shadow ----
  T('cove', 'Cove', ['Featured', 'COVE-inspired', 'Cinematic'], 'Tall serif, tight tracking, soft shadow', 3, 'When I close my',
    { font: 'Instrument Serif', size: 118, uppercase: false, letterSpacing: -0.03, wordHighlight: false, outlineWidth: 0, shadow: 11, animation: 'fade' }),
  T('cove-italic', 'Cove Italic', ['COVE-inspired', 'Cinematic', 'Highlighted Keywords'], 'Serif with italic, tinted keywords', 3, 'When I *dream* of home',
    { font: 'Instrument Serif', size: 118, uppercase: false, letterSpacing: -0.03, wordHighlight: false, autoEmphasis: true, kwItalic: true, kwScale: 1.08, highlightColor: '#e9dcff', outlineWidth: 0, shadow: 11, animation: 'slide', animIntensity: 0.4 }),
  T('cove-night', 'Cove Night', ['COVE-inspired', 'Cinematic'], 'Warm off-white serif with glow', 2, 'Quiet *nights*',
    { font: 'Instrument Serif', size: 126, uppercase: false, letterSpacing: -0.025, color: '#f4ead8', wordHighlight: false, outlineWidth: 0, shadow: 6, glow: 14, glowColor: '#f4ead8', animation: 'fade', animSpeed: 0.7 }),

  // ---- FLAIR-inspired: heavy lowercase sans with one oversized italic serif keyword ----
  T('flair', 'Flair', ['Featured', 'FLAIR-inspired', 'Highlighted Keywords'], 'Lowercase sans, big italic serif keyword', 3, "it's *almost* like it used to be.",
    { font: 'Poppins', weight: 600, size: 78, uppercase: false, letterSpacing: -0.04, wordHighlight: false, autoEmphasis: true, highlightColor: '#ffffff', kwFont: 'Instrument Serif', kwWeight: 400, kwItalic: true, kwScale: 1.7, outlineWidth: 0, shadow: 12, animation: 'fade' }),
  T('flair-warm', 'Flair Warm', ['FLAIR-inspired', 'Highlighted Keywords'], 'Same pairing with a warm gold keyword', 3, 'this feels *different* now',
    { font: 'Poppins', weight: 600, size: 78, uppercase: false, letterSpacing: -0.04, wordHighlight: false, autoEmphasis: true, highlightColor: '#ffd9a0', kwFont: 'Instrument Serif', kwWeight: 400, kwItalic: true, kwScale: 1.65, outlineWidth: 0, shadow: 12, animation: 'slide', animIntensity: 0.45 }),
  T('flair-contrast', 'Flair Contrast', ['FLAIR-inspired', 'Highlighted Keywords'], 'Extra-bold sans with a pink serif accent', 3, 'you are *enough* today',
    { font: 'Montserrat', weight: 800, size: 70, uppercase: false, letterSpacing: -0.035, wordHighlight: false, autoEmphasis: true, highlightColor: '#ff9ec2', kwFont: 'Playfair Display', kwWeight: 700, kwItalic: true, kwScale: 1.5, outlineWidth: 0, shadow: 10, animation: 'fade' }),

  // ---- one word at a time ----
  T('slam', 'Slam', ['Bold & Viral'], 'One huge word, bounce in', 1, 'Slam',
    { size: 170, wordHighlight: false, outlineWidth: 8, shadow: 8, animation: 'bounce', animIntensity: 0.9 }),
  T('neon-pop', 'Neon Pop', ['Colorful & Playful', 'Outlined & Shadowed'], 'Glowing cyan word that pops', 1, 'Neon',
    { font: 'Rubik', weight: 800, size: 130, wordHighlight: false, outlineWidth: 0, shadow: 0, glow: 26, glowColor: '#22d3ee', animation: 'pop', animIntensity: 0.8 }),
  T('rise', 'Rise', ['Minimal & Clean'], 'Lowercase word that slides up', 1, 'rise',
    { font: 'Montserrat', weight: 800, size: 112, uppercase: false, letterSpacing: -0.02, wordHighlight: false, outlineWidth: 0, shadow: 9, animation: 'slide', animIntensity: 0.8 }),

  // ---- karaoke ----
  T('karaoke-sweep', 'Karaoke Sweep', ['Karaoke'], 'Words fill pink as they are spoken', 3, 'Sing it *loud* now',
    { font: 'Poppins', weight: 800, size: 72, highlightColor: '#ff4d8d', outlineWidth: 7, shadow: 4, animation: 'karaoke' }),
  T('sing-along', 'Sing-along', ['Karaoke', 'Colorful & Playful'], 'Rounded pill, gold fill sweep', 3, 'Sing along with me',
    { font: 'Fredoka', weight: 600, size: 62, uppercase: false, highlightColor: '#ffe14d', outlineWidth: 0, shadow: 0, bgColor: '#12131a', bgOpacity: 0.78, bgRadius: 0.5, bgPad: 0.34, animation: 'karaoke' }),

  // ---- podcast ----
  T('podcast', 'Podcast', ['Podcast'], 'Dark rounded panel, violet active word', 3, 'Today we talk about *focus*',
    { font: 'Inter', weight: 700, size: 50, uppercase: false, highlightColor: '#a99cff', outlineWidth: 0, shadow: 0, bgColor: '#0a0b0e', bgOpacity: 0.84, bgRadius: 0.16, bgPad: 0.3, animation: 'fade' }),
  T('talk-show', 'Talk Show', ['Podcast', 'Bold & Viral'], 'Solid violet banner', 3, 'Welcome back to the *show*',
    { font: 'Montserrat', weight: 700, size: 56, uppercase: false, wordHighlight: false, outlineWidth: 0, shadow: 6, bgColor: '#6d5ee0', bgOpacity: 1, bgRadius: 0.1, bgPad: 0.26, animation: 'slide', animIntensity: 0.4 }),

  // ---- minimal ----
  T('whisper', 'Whisper', ['Minimal & Clean'], 'Light, airy subtitle', 3, 'a quiet little *moment*',
    { font: 'Inter', weight: 500, size: 40, uppercase: false, letterSpacing: 0.02, wordHighlight: false, outlineWidth: 0, shadow: 5, animation: 'fade' }),
  T('classic-sub', 'Classic Subtitle', ['Minimal & Clean', 'Podcast'], 'Film-style text on a translucent bar', 3, 'Exactly like the *cinema*',
    { font: 'Inter', weight: 500, size: 44, uppercase: false, wordHighlight: false, outlineWidth: 0, shadow: 0, bgOpacity: 0.62, bgRadius: 0.06, bgPad: 0.22 }),

  // ---- cinematic ----
  T('film-title', 'Film Title', ['Cinematic'], 'Wide-tracked caps, cream colour', 3, 'The *long* road home',
    { font: 'Bebas Neue', size: 88, letterSpacing: 0.14, color: '#e9e4d8', wordHighlight: false, outlineWidth: 0, shadow: 10, animation: 'fade', animSpeed: 0.7 }),
  T('noir', 'Noir', ['Cinematic', 'Highlighted Keywords'], 'Bold serif, italic champagne keyword', 3, 'The night is *young*',
    { font: 'Playfair Display', weight: 700, size: 76, uppercase: false, wordHighlight: false, autoEmphasis: true, kwItalic: true, highlightColor: '#e8d9b5', outlineWidth: 0, shadow: 12, animation: 'fade' }),

  // ---- colourful ----
  T('candy', 'Candy', ['Colorful & Playful', 'Outlined & Shadowed'], 'Soft rounded type, pink outline', 2, 'Sweet *treat* time',
    { font: 'Lilita One', size: 86, uppercase: false, highlightColor: '#ffe14d', outlineColor: '#ff4d8d', outlineWidth: 12, shadow: 6, animation: 'pop' }),
  T('baloo-bounce', 'Baloo Bounce', ['Colorful & Playful'], 'Friendly purple-outlined letters', 2, 'Hello *there* friend',
    { font: 'Baloo 2', weight: 800, size: 88, uppercase: false, highlightColor: '#5eead4', outlineColor: '#6d28d9', outlineWidth: 11, shadow: 6, animation: 'bounce' }),

  // ---- highlighted keywords ----
  T('marker', 'Marker', ['Highlighted Keywords', 'Bold & Viral'], 'Auto-picked keyword on a yellow box', 3, 'This changes *everything*',
    { font: 'Montserrat', weight: 800, size: 66, wordHighlight: false, autoEmphasis: true, kwBox: true, outlineWidth: 0, shadow: 6, animation: 'pop', animIntensity: 0.4 }),
  T('spotlight', 'Spotlight', ['Highlighted Keywords'], 'Dim text, one bright oversized keyword', 3, 'Only one *thing* matters',
    { font: 'Archivo Black', size: 70, color: '#8d93a1', highlightColor: '#ffffff', wordHighlight: false, autoEmphasis: true, kwScale: 1.18, outlineWidth: 0, shadow: 8, animation: 'fade' }),

  // ---- outlined & shadowed ----
  T('sticker', 'Sticker', ['Outlined & Shadowed', 'Bold & Viral'], 'Thick black outline, drop shadow', 2, 'Cut it *out*',
    { font: 'Archivo Black', size: 84, outlineColor: '#0a0b0e', outlineWidth: 16, shadow: 12, animation: 'pop' }),
  T('neon-glow', 'Neon Glow', ['Outlined & Shadowed'], 'White tubes with a magenta glow', 3, 'Open all *night*',
    { font: 'Poppins', weight: 800, size: 70, highlightColor: '#ffb3f6', outlineWidth: 0, shadow: 0, glow: 22, glowColor: '#ff4df0', animation: 'fade' }),
]

export const templateById = (id?: string | null) => TEMPLATES.find((t) => t.id === id)
