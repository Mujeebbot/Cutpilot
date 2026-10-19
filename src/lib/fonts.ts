import type { CaptionStyle } from '../types'

export const fontSpec = (font: string, weight: number, italic = false) => `${italic ? 'italic ' : ''}${weight} 40px "${font}"`

/** Loads every font face (including keyword faces) the given styles need, so canvas text never renders with a fallback by accident. */
export function ensureFonts(styles: CaptionStyle[]): Promise<void> {
  const specs = new Set<string>()
  for (const st of styles) {
    specs.add(fontSpec(st.font, st.weight))
    if (st.kwFont || st.kwItalic || st.kwWeight) specs.add(fontSpec(st.kwFont || st.font, st.kwWeight || st.weight, st.kwItalic))
  }
  return Promise.all([...specs].map((s) => document.fonts.load(s).catch(() => []))).then(() => undefined)
}
