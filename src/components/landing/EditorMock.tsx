import { useState } from 'react'
import { CaptionFrame } from './CaptionFrame'

interface DraftRow {
  n: number
  title: string
  t: string
  len: string
  score: number
  state: 'Accepted' | 'To review' | 'Cut'
  why: string[]
  line: string
  templateId: string
  imageSrc: string
}

const CLIPS: DraftRow[] = [
  {
    n: 1,
    title: 'High-Retention Hook',
    t: '0:11–0:31',
    len: '20.6s',
    score: 96,
    state: 'Accepted',
    why: ['Contains financial figure', 'High energy opening', 'Brief keyword: “pricing”'],
    line: 'Here is the *BIGGEST* mistake I made with pricing…',
    templateId: 'heavy-pop',
    imageSrc: '/media/creator-reel-1.jpg',
  },
  {
    n: 2,
    title: 'Core Value Delivery',
    t: '0:52–1:15',
    len: '23.3s',
    score: 88,
    state: 'To review',
    why: ['Asks direct question', 'Pacing acceleration', 'High verbal clarity'],
    line: 'What if you could *DOUBLE* your creator revenue this month?',
    templateId: 'neon',
    imageSrc: '/media/creator-reel-2.jpg',
  },
  {
    n: 3,
    title: 'Filler & Tangent',
    t: '0:34–0:49',
    len: '15.7s',
    score: 34,
    state: 'Cut',
    why: ['Pauses > 1.2s detected', 'Filler phrase repetition'],
    line: 'Anyway, that is just some quick context before we start…',
    templateId: 'minimal-editorial',
    imageSrc: '/media/creator-reel-1.jpg',
  },
]

export function EditorMock() {
  const [selected, setSelected] = useState(0)
  const active = CLIPS[selected] ?? CLIPS[0]

  return (
    <figure className="m-0 select-none">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-charcoal shadow-[0_30px_100px_-20px_rgba(139,124,246,0.25)]">
        {/* macOS Studio Window Titlebar */}
        <div className="flex h-10 items-center justify-between border-b border-white/[0.08] bg-graphite/90 px-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]/80 ring-1 ring-white/10" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]/80 ring-1 ring-white/10" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]/80 ring-1 ring-white/10" />
            <span className="ml-2 font-mono text-[11px] font-medium text-bone/70">
              CutPilot Studio · <span className="text-bone">pricing_masterclass_v4.mp4</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-deep/60 bg-teal-deep/20 px-2.5 py-0.5 text-[#9fd3d6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9fd3d6] animate-pulse" />
              On-Device Whisper
            </span>
            <span className="hidden rounded-full border border-accent-500/40 bg-accent-500/10 px-2 py-0.5 text-accent-300 sm:inline">
              100% Private (0 KB uploaded)
            </span>
          </div>
        </div>

        {/* Main Stage Grid: Left Preview Player + Right AI Draft Review */}
        <div className="grid gap-4 p-4 lg:grid-cols-[200px_minmax(0,1fr)]">
          {/* Vertical 9:16 Video Stage Monitor */}
          <div className="flex flex-col gap-2">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-lg">
              <CaptionFrame
                templateId={active.templateId}
                text={active.line}
                imageSrc={active.imageSrc}
                badge={`${active.len} · Clip ${active.n}`}
                width={200}
                height={355}
                y={0.76}
                animate={true}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between px-1 text-[11px] text-bone-dim">
              <span className="font-mono">00:14.28 / 00:43.90</span>
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">9:16 Vertical</span>
            </div>
          </div>

          {/* AI First-Draft Review Panel */}
          <div className="flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div>
                <p className="text-[13px] font-semibold text-bone">AI Proposed Edit Sequence</p>
                <p className="text-[11px] text-bone-dim">Select a candidate clip to preview timing & captions</p>
              </div>
              <span className="rounded-full bg-accent-500/20 px-2.5 py-0.5 text-[11px] font-medium text-accent-300">
                Target: ~45s
              </span>
            </div>

            <ol className="m-0 list-none space-y-2 p-0">
              {CLIPS.map((clip, i) => {
                const isCurrent = i === selected
                return (
                  <li
                    key={clip.n}
                    onClick={() => setSelected(i)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
                      isCurrent
                        ? 'border-accent-400/80 bg-accent-500/15 shadow-[0_0_20px_-5px_rgba(139,124,246,0.3)] ring-1 ring-accent-400/50'
                        : clip.state === 'Cut'
                        ? 'border-white/[0.06] bg-black/20 opacity-50 hover:opacity-75'
                        : 'border-white/10 bg-slate/60 hover:border-white/20 hover:bg-slate'
                    }`}
                  >
                    <div className="flex items-baseline justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className={`grid h-4 w-4 place-items-center rounded font-mono text-[10px] font-bold ${
                          clip.state === 'Accepted' ? 'bg-accent-500 text-white' : clip.state === 'Cut' ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-bone'
                        }`}>
                          {clip.n}
                        </span>
                        <span className="font-semibold text-bone">{clip.title}</span>
                        <span className="font-mono text-bone-dim">({clip.t})</span>
                      </div>
                      <span className={`text-[11px] font-medium ${
                        clip.state === 'Accepted' ? 'text-accent-300' : clip.state === 'Cut' ? 'text-red-400 line-through' : 'text-amber-300'
                      }`}>
                        {clip.state}
                      </span>
                    </div>

                    <p className={`mt-1.5 text-[12px] italic ${isCurrent ? 'text-white' : 'text-bone/80'}`}>
                      “{clip.line}”
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-accent-300 border border-accent-500/20">
                        Score {clip.score}
                      </span>
                      {clip.why.map((w) => (
                        <span
                          key={w}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-bone-dim"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        {/* NLE Multitrack Timeline Component at Bottom */}
        <div className="border-t border-white/[0.08] bg-[#0d0e12] p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-bone-dim font-mono">
            <span>TIMELINE TRACKS</span>
            <span className="text-accent-300">00:14.28 [PLAYING]</span>
          </div>

          {/* Time ruler ticks */}
          <div className="relative mb-1.5 h-3">
            {[0, 15, 30, 45, 60, 75, 90, 100].map((pos) => (
              <span
                key={pos}
                className="absolute top-0 h-2.5 w-px bg-white/20 font-mono text-[8px] text-white/40"
                style={{ left: `${pos}%` }}
              />
            ))}
          </div>

          {/* Visual Track 1: Video clips */}
          <div className="relative h-9 rounded-md bg-slate border border-white/10 overflow-hidden">
            {/* Clip 1 */}
            <span
              className="absolute inset-y-0 flex items-center rounded-sm border-y-2 border-accent-300 bg-accent-500/40 px-2 font-mono text-[10px] font-bold text-white shadow-sm"
              style={{ left: '6%', width: '38%' }}
            >
              Clip 1 · 20.6s
            </span>
            {/* Cut Gap */}
            <span
              className="absolute inset-y-0 flex items-center justify-center bg-red-900/40 font-mono text-[9px] text-red-300/80 border-x border-red-500/40"
              style={{ left: '44%', width: '12%' }}
            >
              PAUSE CUT (-4.8s)
            </span>
            {/* Clip 2 */}
            <span
              className="absolute inset-y-0 flex items-center rounded-sm border-y-2 border-accent-300 bg-accent-500/40 px-2 font-mono text-[10px] font-bold text-white shadow-sm"
              style={{ left: '56%', width: '36%' }}
            >
              Clip 2 · 23.3s
            </span>

            {/* Glowing Vertical Playhead */}
            <div
              className="absolute -bottom-1 -top-1 w-[2px] bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.9)] z-20"
              style={{ left: '26%' }}
            >
              <div className="absolute -top-1 -left-[5px] h-3 w-3 rotate-45 bg-accent-300 border border-white" />
            </div>
          </div>

          {/* Track 2: Caption Track */}
          <div className="relative mt-1.5 h-6 rounded bg-slate/60 border border-white/[0.06] overflow-hidden">
            <span
              className="absolute inset-y-0 flex items-center rounded bg-accent-400/25 px-2 text-[9px] font-medium text-accent-300"
              style={{ left: '6%', width: '38%' }}
            >
              💬 Captions: &quot;BIGGEST mistake I made...&quot;
            </span>
            <span
              className="absolute inset-y-0 flex items-center rounded bg-accent-400/25 px-2 text-[9px] font-medium text-accent-300"
              style={{ left: '56%', width: '36%' }}
            >
              💬 Captions: &quot;DOUBLE your creator revenue...&quot;
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3.5 flex items-center justify-between text-xs text-bone-dim">
        <span>Interactive studio preview. Click clips to test dynamic caption styles & timing.</span>
        <span className="font-mono text-accent-300">CutPilot NLE v4.0</span>
      </figcaption>
    </figure>
  )
}
