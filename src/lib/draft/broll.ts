import type { Word } from '../../types'
import type { BriefGoals } from './brief'
import { topTerms } from './plan'

/**
 * B-roll ideas are TEXT ONLY. CutPilot does not generate, search for or insert footage.
 * Ideas come from a small keyword lexicon, matched against the most frequent content words in a clip's transcript.
 */
export interface BrollIdea { id: string; at: number; term: string; text: string; basis: string }

const LEXICON: { id: string; words: string[]; ideas: string[] }[] = [
  { id: 'money', words: ['money', 'price', 'pricing', 'cost', 'costs', 'revenue', 'profit', 'sales', 'budget', 'invest', 'investing', 'dollars', 'salary', 'cash', 'income', 'paid', 'expensive', 'cheap', 'savings', 'afford'],
    ideas: ['Cutaway: close-up of an invoice, receipt or pricing table', 'Animated number callout when the figure is spoken', 'Screen recording of a spreadsheet or dashboard'] },
  { id: 'tech', words: ['app', 'apps', 'software', 'code', 'coding', 'website', 'computer', 'data', 'phone', 'tool', 'tools', 'platform', 'internet', 'online', 'digital', 'automation', 'algorithm', 'device'],
    ideas: ['Screen recording of “{term}” in use', 'Over-the-shoulder shot of typing or scrolling', 'Short UI close-up that shows the feature being described'] },
  { id: 'business', words: ['customer', 'customers', 'client', 'clients', 'team', 'meeting', 'startup', 'company', 'market', 'business', 'founder', 'brand', 'product', 'strategy', 'growth', 'audience'],
    ideas: ['Cutaway of a team meeting or whiteboard session', 'Product or packaging close-up', 'Simple chart or arrow graphic showing the trend'] },
  { id: 'health', words: ['health', 'sleep', 'diet', 'energy', 'stress', 'doctor', 'exercise', 'workout', 'training', 'fitness', 'nutrition', 'body', 'mental', 'habit', 'habits'],
    ideas: ['Cutaway of the activity itself (walking, stretching, preparing food)', 'Text callout with the key habit or number', 'Slow-motion detail shot related to “{term}”'] },
  { id: 'food', words: ['food', 'recipe', 'cooking', 'kitchen', 'coffee', 'dinner', 'breakfast', 'ingredients', 'restaurant', 'meal'],
    ideas: ['Close-up of the dish or ingredient being discussed', 'Overhead shot of preparation', 'Steam, pour or sizzle detail shot'] },
  { id: 'travel', words: ['travel', 'trip', 'flight', 'hotel', 'city', 'beach', 'mountain', 'country', 'airport', 'journey', 'vacation'],
    ideas: ['Establishing shot of the place named', 'Map graphic marking the location', 'Travel details: tickets, luggage, street scenes'] },
  { id: 'learning', words: ['learn', 'learning', 'study', 'school', 'lesson', 'course', 'teach', 'teacher', 'book', 'books', 'skill', 'skills', 'practice', 'mistake', 'mistakes'],
    ideas: ['Cutaway of notes, a book or a whiteboard', 'On-screen text with the lesson in one line', 'Quick before/after comparison graphic'] },
  { id: 'creative', words: ['video', 'videos', 'camera', 'edit', 'editing', 'film', 'design', 'music', 'content', 'creator', 'create', 'photo', 'story', 'script', 'channel'],
    ideas: ['Behind-the-scenes shot of the setup', 'Timeline or editing-software screen recording', 'Example of the finished piece next to the raw take'] },
]

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9$%]+/g, '')

/** Up to three text-only ideas for the words in [start, end). */
export function brollFor(words: readonly Word[], range: { start: number; end: number }, goals: Pick<BriefGoals, 'focusTerms'>, idBase = 'b'): BrollIdea[] {
  const inside = words.filter((w) => (w.s + w.e) / 2 >= range.start && (w.s + w.e) / 2 < range.end)
  const ideas: BrollIdea[] = []
  const usedAt: number[] = []
  const add = (idea: Omit<BrollIdea, 'id'>) => {
    if (ideas.length >= 3 || usedAt.some((t) => Math.abs(t - idea.at) < 2)) return
    usedAt.push(idea.at)
    ideas.push({ ...idea, id: `${idBase}-${ideas.length + 1}` })
  }
  // Only words we can say something concrete about: lexicon matches, terms from the brief, or capitalised names.
  // Everything else would produce vague filler ("a cutaway that shows 'because'"), so it is skipped instead.
  const perCategory = new Map<string, number>()
  for (const term of topTerms(inside, 8, goals.focusTerms)) {
    const hit = inside.find((w) => { const n = norm(w.t); return n === term || n.startsWith(term) })
    if (!hit) continue
    const cat = LEXICON.find((c) => c.words.some((x) => x === term || term.startsWith(x)))
    const focus = goals.focusTerms.some((f) => term.startsWith(f) || f.startsWith(term))
    const proper = /^\p{Lu}\p{Ll}+/u.test(hit.t.replace(/^[^\p{L}]+/u, '')) && inside.indexOf(hit) > 0 && !/[.!?]$/.test(inside[inside.indexOf(hit) - 1].t)
    if (!cat && !focus && !proper) continue
    const k = cat ? (perCategory.get(cat.id) ?? 0) : 0
    if (cat) perCategory.set(cat.id, k + 1)
    const text = cat ? cat.ideas[k % cat.ideas.length].replace('{term}', term) : `A cutaway that shows “${term}”`
    const why = cat ? `matches the ${cat.id} word list` : focus ? 'a word from your brief' : 'looks like a name'
    add({ at: hit.s, term, text, basis: `You say “${hit.t.replace(/[^\w'$%-]+/g, '')}” (${why})` })
  }
  const num = inside.find((w) => /\d/.test(w.t))
  if (num) add({ at: num.s, term: num.t, text: `On-screen text callout for “${num.t.replace(/[,.]$/, '')}”`, basis: 'A number is spoken here' })
  return ideas.sort((a, b) => a.at - b.at)
}
