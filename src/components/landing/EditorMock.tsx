import { CaptionFrame } from './CaptionFrame'

/** An illustration of the draft-review screen, built from CutPilot's own caption renderer. Not a screenshot, and the footage is a placeholder. */
const ROWS = [
  { n: 1, t: '0:11–0:31', len: '20.6s', state: 'Accepted', why: ['Contains a number or figure', 'Strong wording', 'Mentions “pricing” from your brief'], line: 'Here is the biggest mistake I made with pricing…' },
  { n: 2, t: '0:52–1:15', len: '23.3s', state: 'To review', why: ['Asks a direct question', 'Speaks directly to the viewer'], line: 'What if you could double your revenue…' },
  { n: 3, t: '0:34–0:49', len: '15.7s', state: 'Rejected', why: ['Mostly filler words'], line: 'Anyway that is a bit of background…' },
]

export function EditorMock() {
  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-[10px] border border-white/10 bg-charcoal shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2 border-b border-white/[0.07] bg-graphite px-3 py-2 text-[11px] text-bone-dim">
          <span className="font-title font-semibold text-bone">Review your first draft</span>
          <span className="hidden sm:inline">· pricing-mistake.mp4</span>
          <span className="ml-auto rounded-full border border-teal-deep/60 bg-teal-deep/20 px-2 py-0.5 text-[10px] text-[#9fd3d6]">Transcript: Whisper on this device</span>
          <span className="hidden rounded-full border border-sodium/40 bg-sodium/10 px-2 py-0.5 text-[10px] text-sodium md:inline">Ranking: rule-based</span>
        </div>
        <div className="grid gap-4 p-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:p-4">
          <div className="mx-auto w-[150px] self-start overflow-hidden rounded-md ring-1 ring-white/10 sm:mx-0">
            <CaptionFrame templateId="heavy-pop" text="Here is the *BIGGEST* mistake" activeWord={3} width={150} height={266} y={0.74} className="block h-auto w-full" />
          </div>
          <ol className="m-0 min-w-0 list-none space-y-2 p-0">
            {ROWS.map((r) => (
              <li key={r.n} className={`rounded-md border p-2.5 ${r.state === 'Accepted' ? 'border-accent-500/60 bg-accent-500/[0.08]' : r.state === 'Rejected' ? 'border-white/[0.06] opacity-60' : 'border-white/10'}`}>
                <div className="flex items-baseline gap-2 text-[12px]">
                  <span className="font-title font-semibold text-bone">Clip {r.n}</span>
                  <span className="tabular-nums text-bone-dim">{r.t} · {r.len}</span>
                  <span className={`ml-auto text-[11px] ${r.state === 'Accepted' ? 'text-accent-300' : 'text-bone-dim'}`}>{r.state}</span>
                </div>
                <p className="mt-1 truncate text-[12px] text-bone">“{r.line}”</p>
                <p className="mt-1.5 flex flex-wrap gap-1">{r.why.map((w) => <span key={w} className="rounded-full border border-sodium/25 bg-sodium/[0.07] px-1.5 py-px text-[10px] text-[#e9c48f]">{w}</span>)}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-white/[0.07] bg-graphite px-3 py-2.5 sm:px-4" aria-hidden="true">
          <div className="relative h-5">
            {[0, 20, 40, 60, 80, 100].map((p) => <span key={p} className="absolute top-0 h-2 w-px bg-white/20" style={{ left: `${p}%` }} />)}
          </div>
          <div className="relative h-9 rounded bg-slate">
            <span className="absolute inset-y-0 rounded-sm border-y-2 border-accent-300 bg-accent-500/30" style={{ left: '13%', width: '25%' }}><i className="absolute left-1 top-1 rounded bg-graphite/80 px-1 text-[9px] not-italic text-white">1</i></span>
            <span className="absolute inset-y-0 rounded-sm border-y-2 border-dashed border-accent-400/70" style={{ left: '63%', width: '28%' }}><i className="absolute left-1 top-1 rounded bg-graphite/80 px-1 text-[9px] not-italic text-bone-dim">2</i></span>
            <span className="absolute inset-y-0 bg-black/50" style={{ left: '0%', width: '13%' }} />
            <span className="absolute inset-y-0 bg-black/50" style={{ left: '38%', width: '25%' }} />
            <span className="absolute inset-y-0 bg-black/50" style={{ left: '91%', width: '9%' }} />
          </div>
        </div>
      </div>
      <figcaption className="mt-3 max-w-[60ch] text-xs leading-relaxed text-bone-dim">Illustration of the draft review screen, drawn with CutPilot’s own caption renderer. The footage is a placeholder, and the times and reasons are an example of what the review shows.</figcaption>
    </figure>
  )
}
