import type { Word } from '../../types'

/** Builds a timed transcript from sentences: each word lasts 0.35 s with 0.05 s between words; `gap` seconds of silence precede a sentence. */
export function speak(lines: { text: string; gap?: number }[], t0 = 0.5): Word[] {
  const out: Word[] = []
  let t = t0
  for (const l of lines) {
    t += l.gap ?? 0.3
    for (const tok of l.text.split(/\s+/)) {
      out.push({ t: tok, s: +t.toFixed(3), e: +(t + 0.35).toFixed(3) })
      t += 0.4
    }
  }
  return out
}

/** ~2 minutes of talking-head style speech with clear hooks, filler, numbers and long pauses. */
export const SAMPLE_LINES: { text: string; gap?: number }[] = [
  { text: 'Um so hi everyone welcome back to the channel.' },
  { text: 'Today we are going to talk about a few things in general.' },
  { text: 'Here is the biggest mistake I made with pricing and it cost me 12000 dollars.', gap: 1.4 },
  { text: 'Nobody tells you that most customers never complain they just leave.' },
  { text: 'So I changed one thing about my pricing page.' },
  { text: 'Pricing is not a number it is a message about who you serve.', gap: 0.5 },
  { text: 'Anyway that is a bit of background on my business and the team.', gap: 2.5 },
  { text: 'We have a small team and we work from home most days.' },
  { text: 'Um uh you know it is a lot of um work honestly.' },
  { text: 'What if you could double your revenue without raising prices?', gap: 3 },
  { text: 'You can and I will show you exactly how in three steps.' },
  { text: 'First stop discounting because discounts train customers to wait.' },
  { text: 'Second never hide the price because people hate guessing.', gap: 1.2 },
  { text: 'Third test one new price every month and write down the result.' },
  { text: 'Thanks for watching and see you next time.', gap: 4 },
]
