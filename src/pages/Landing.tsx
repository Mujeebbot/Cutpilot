import { useCallback, useEffect, useState } from 'react'
import { Link, navigate } from '../lib/router'
import { TEMPLATES } from '../lib/templates'
import { peekSession } from '../lib/session'
import { Icon } from '../components/icons'
import { NewProjectDialog } from '../components/NewProjectDialog'
import { EditorMock } from '../components/landing/EditorMock'
import { CaptionFrame } from '../components/landing/CaptionFrame'

const NAV = [{ id: 'how', label: 'How it works' }, { id: 'features', label: 'Features' }, { id: 'limits', label: 'Limits and privacy' }]
const REPO = 'https://github.com/Mujeebbot/Cutpilot'

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
  el.focus({ preventScroll: true })
}

const btnMain = 'inline-flex h-11 items-center justify-center rounded-md bg-accent-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-400'

export default function Landing() {
  const [dialog, setDialog] = useState(false)
  const [menu, setMenu] = useState(false)
  const [resume, setResume] = useState<{ name: string; videoName: string } | null>(null)
  const closeDialog = useCallback(() => setDialog(false), [])

  useEffect(() => { void peekSession().then(setResume) }, [])
  useEffect(() => { document.title = 'CutPilot: your footage, your vision, AI does the first cut' }, [])
  useEffect(() => { // direct visits to /#how should land on the section
    const id = location.hash.slice(1)
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
  }, [])

  const jump = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); setMenu(false); scrollToId(id) }

  return (
    <div className="min-h-dvh bg-graphite font-body text-bone antialiased selection:bg-accent-500/40">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-bone focus:px-3 focus:py-2 focus:text-graphite">Skip to content</a>

      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-graphite/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="CutPilot home" className="flex items-center gap-2.5 font-title text-lg font-extrabold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-accent-500 text-white"><Icon name="film" size={17} /></span>CutPilot
          </Link>
          <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((n) => <a key={n.id} href={`#${n.id}`} onClick={jump(n.id)} className="rounded-md px-3 py-2 text-sm text-bone-dim transition-colors hover:text-bone">{n.label}</a>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {resume && <Link to="/editor" className="hidden text-sm text-bone-dim underline-offset-4 hover:text-bone hover:underline lg:inline" title={resume.videoName}>Continue “{resume.name}”</Link>}
            <button onClick={() => setDialog(true)} className={`${btnMain} h-10`}>Start creating</button>
            <button className="grid h-10 w-10 place-items-center rounded-md border border-white/15 md:hidden" aria-expanded={menu} aria-controls="mobile-nav" aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu((m) => !m)}>
              <Icon name={menu ? 'x' : 'text'} size={18} />
            </button>
          </div>
        </div>
        {menu && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-white/[0.07] px-4 py-2 md:hidden">
            {NAV.map((n) => <a key={n.id} href={`#${n.id}`} onClick={jump(n.id)} className="block rounded-md px-2 py-3 text-[15px] text-bone">{n.label}</a>)}
            {resume && <Link to="/editor" className="block rounded-md px-2 py-3 text-[15px] text-accent-300">Continue “{resume.name}”</Link>}
          </nav>
        )}
      </header>

      <main id="main">
        {/* ------------------------------------------------------------------ hero */}
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12 lg:pb-24 lg:pt-20">
          <div>
            <h1 className="font-title text-[clamp(2.2rem,5.2vw,3.9rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              <span className="cut-in mb-2 block w-fit rounded-[5px] border-t-[3px] border-bone-dim/60 bg-slate px-3 pb-1.5 pt-1">Your footage.</span>
              <span className="cut-in mb-2 block w-fit rounded-[5px] border-t-[3px] border-bone-dim/60 bg-slate px-3 pb-1.5 pt-1" style={{ animationDelay: '140ms' }}>Your vision.</span>
              <span className="cut-in relative block w-fit rounded-[5px] border-2 border-dashed border-accent-400 px-3 pb-1.5 pt-1 text-accent-300" style={{ animationDelay: '280ms' }}>
                AI does the first cut.
                <span aria-hidden="true" className="absolute -top-2.5 right-3 rounded bg-graphite px-1.5 font-body text-[11px] font-medium leading-none tracking-normal text-accent-300">proposed</span>
              </span>
            </h1>
            <p className="mt-7 max-w-[52ch] text-lg leading-relaxed text-bone-dim">
              CutPilot turns raw footage into a proposed edit. It transcribes your video on this device, suggests clips with timestamps and reasons, and you accept, reject or retime each one before refining the result in a full editing studio.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <button onClick={() => setDialog(true)} className={`${btnMain} h-12 px-6 text-base`}>Start creating</button>
              <a href="#how" onClick={jump('how')} className="text-[15px] text-bone underline decoration-white/30 underline-offset-[6px] transition-colors hover:decoration-bone">See how it works</a>
            </div>
            <p className="mt-5 text-sm text-bone-dim">Free to use. No account, no API key. Your video is not uploaded.</p>
          </div>
          <EditorMock />
        </section>

        {/* ------------------------------------------------------------------ how it works */}
        <section id="how" tabIndex={-1} aria-labelledby="how-h" className="border-y border-white/[0.07] bg-charcoal focus:outline-none">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 id="how-h" className="max-w-[22ch] font-title text-3xl font-bold tracking-tight sm:text-4xl">A first cut you can check, change and keep</h2>
            <p className="mt-3 max-w-[60ch] text-bone-dim">The draft is a plan, not a finished video. Nothing reaches your timeline until you accept it.</p>
            <ol className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-0">
              {[
                { t: 'Upload footage', d: 'Pick a video from your computer and describe the cut you want in plain language: a length, a strong opening, removing pauses, captions. Choose vertical, square or landscape.', n: 'The file stays in your browser.', v: (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-white/20 text-sm text-bone-dim">interview.mp4 · 12:41 · 9:16</div>) },
                { t: 'Review the AI draft', d: 'Whisper transcribes on your device. CutPilot then proposes clips with start and end times and the rules that picked them. Accept, reject, or change a clip’s times, and preview each range.', n: 'Suggestions are rule-based, so you stay in charge.', v: (
                  <div className="space-y-1.5">{['Clip 1  0:11–0:31', 'Clip 2  0:52–1:15', 'Clip 3  0:34–0:49'].map((c, i) => <div key={c} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm tabular-nums ${i === 0 ? 'border-accent-500/60 bg-accent-500/10 text-bone' : i === 2 ? 'border-white/[0.06] text-bone-dim line-through decoration-white/30' : 'border-white/10 text-bone'}`}><span>{c}</span><span className="text-xs no-underline">{['Accepted', 'To review', 'Rejected'][i]}</span></div>)}</div>) },
                { t: 'Refine and export', d: 'Accepted clips become a sequence on the timeline with captions that stay in step with the footage. Restyle captions, adjust clip edges, reorder, then export a video with captions burned in.', n: 'Export records in real time, so keep the tab open.', v: (
                  <div className="flex h-24 items-end gap-1 rounded-md bg-slate p-2">{[30, 18, 26, 12].map((w, i) => <span key={i} className={`h-full rounded-sm border-y-2 ${i % 2 ? 'border-accent-400/40 bg-accent-500/15' : 'border-accent-300 bg-accent-500/35'}`} style={{ width: `${w}%` }} />)}</div>) },
              ].map((s, i) => (
                <li key={s.t} className="relative lg:px-8 lg:first:pl-0 lg:last:pr-0">
                  {i > 0 && <span aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-px bg-white/[0.08] lg:block" />}
                  <div className="mb-5 flex h-[7.5rem] flex-col justify-center">{s.v}</div>
                  <h3 className="flex items-baseline gap-3 font-title text-xl font-bold"><span className="tabular-nums text-accent-300">{i + 1}</span>{s.t}</h3>
                  <p className="mt-2.5 leading-relaxed text-bone-dim">{s.d}</p>
                  <p className="mt-3 text-sm text-bone">{s.n}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------------ features */}
        <section id="features" tabIndex={-1} aria-labelledby="feat-h" className="mx-auto max-w-6xl px-4 py-16 focus:outline-none sm:px-6 lg:py-24">
          <h2 id="feat-h" className="max-w-[24ch] font-title text-3xl font-bold tracking-tight sm:text-4xl">What works today, and what does not yet</h2>
          <div className="mt-12 space-y-16">
            <article className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <div>
                <p className="mb-2 text-sm text-[#8cc7ca]">Available</p>
                <h3 className="font-title text-2xl font-bold">Transcript-based edit suggestions</h3>
                <p className="mt-3 leading-relaxed text-bone-dim">Speech is transcribed locally with Whisper, with a timestamp for each word. Clips are then proposed by looking for questions, numbers, hook phrases, strong wording and words from your brief, and by penalising filler and sign-offs. Every suggestion lists the rules that matched.</p>
                <p className="mt-3 leading-relaxed text-bone-dim">This is keyword and sentence-structure scoring. It does not watch your video or understand it, so treat suggestions as a starting point.</p>
              </div>
              <ul className="m-0 grid list-none content-start gap-3 p-0 text-sm sm:grid-cols-2">
                {['Target length, hook, pauses and captions read from your brief', 'Candidate clips with start and end times', 'Reasons shown for each pick, and what the rules could not know', 'Accept, reject, or retime each clip before it touches your project', 'Long pauses found from word timestamps, cut only if you allow it', 'Text-only B-roll ideas tied to words you actually say'].map((x) => (
                  <li key={x} className="flex gap-2.5 border-t border-white/10 pt-3 text-bone"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-accent-300" />{x}</li>
                ))}
              </ul>
            </article>

            <article className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <div>
                <p className="mb-2 text-sm text-[#8cc7ca]">Available</p>
                <h3 className="font-title text-2xl font-bold">Caption customization</h3>
                <p className="mt-3 leading-relaxed text-bone-dim">{TEMPLATES.length} caption templates, plus control over font, size, colours, outline, shadow, glow, background box, keyword emphasis and word-by-word animation. The same renderer draws the preview and the exported video. The frames on the right were drawn by it.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ id: 'heavy-pop', text: 'The *SECRET* is', w: 2 }, { id: TEMPLATES[3]?.id ?? 'heavy-pop', text: 'Stop *guessing* your price', w: 1 }, { id: TEMPLATES[9]?.id ?? 'heavy-pop', text: 'It cost me *$12,000*', w: 3 }].map((f, i) => (
                  <CaptionFrame key={i} templateId={f.id} text={f.text} activeWord={f.w} width={180} height={320} y={0.74} className="block h-auto w-full rounded-md ring-1 ring-white/10" />
                ))}
              </div>
            </article>

            <article className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <div>
                <p className="mb-2 text-sm text-[#8cc7ca]">Available</p>
                <h3 className="font-title text-2xl font-bold">Timeline-based refinement</h3>
                <p className="mt-3 leading-relaxed text-bone-dim">Approved clips appear on the timeline in source time and in a sequence bar in playback order. Drag clip edges (they stop at neighbouring clips), reorder or remove clips, retime captions, and undo or redo any of it. Your project is autosaved in this browser.</p>
              </div>
              <div className="space-y-3 self-start" aria-hidden="true">
                <div className="relative h-14 rounded-md bg-slate-2">
                  <span className="absolute inset-y-0 border-y-2 border-accent-300 bg-accent-500/30" style={{ left: '10%', width: '22%' }} />
                  <span className="absolute inset-y-0 border-y-2 border-accent-300 bg-accent-500/30" style={{ left: '48%', width: '30%' }} />
                  <span className="absolute inset-y-0 left-0 bg-black/50" style={{ width: '10%' }} /><span className="absolute inset-y-0 bg-black/50" style={{ left: '32%', width: '16%' }} /><span className="absolute inset-y-0 right-0 bg-black/50" style={{ width: '22%' }} />
                  <span className="absolute -bottom-px -top-2 w-px bg-bone" style={{ left: '61%' }} />
                </div>
                <div className="flex h-7 gap-px"><span className="flex items-center rounded-sm bg-accent-500 px-2 text-xs text-white" style={{ width: '58%' }}>2</span><span className="flex items-center rounded-sm bg-slate-2 px-2 text-xs" style={{ width: '42%' }}>1</span></div>
                <p className="text-xs text-bone-dim">Top: source timeline with two accepted clips. Bottom: the same clips in playback order, with clip 2 moved first.</p>
              </div>
            </article>

            <div className="border-t border-white/10 pt-8">
              <h3 className="font-title text-xl font-bold">Planned, not built yet</h3>
              <ul className="mt-4 grid gap-x-10 gap-y-3 text-bone-dim sm:grid-cols-2">
                {['Understanding what is happening on screen, not just what is said', 'Finding or generating B-roll footage (today it is text ideas only)', 'Pause detection from audio levels, not only word timing', 'Exporting faster than real time', 'A touch-first editor for phones (the landing page is responsive; the editor is desktop-first)'].map((x) => <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-bone-dim" />{x}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ limits & privacy */}
        <section id="limits" tabIndex={-1} aria-labelledby="lim-h" className="border-t border-white/[0.07] bg-charcoal focus:outline-none">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-20">
            <h2 id="lim-h" className="font-title text-3xl font-bold tracking-tight">Where things run</h2>
            <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                ['On your device', 'Transcription, clip planning, preview, editing and export all happen in your browser tab. Your video is never uploaded.'],
                ['One download', 'The first transcription downloads the Whisper model (about 40 MB) from Hugging Face and caches it. After that it works from the cache.'],
                ['Kept in this browser', 'Your video and draft are kept in browser storage so a refresh does not lose them. You can replace them by starting a new project.'],
                ['Real-time export', 'Export plays your edit while recording it, so a 30 second edit takes about 30 seconds. There is a brief hold at each cut between clips.'],
              ].map(([t, d]) => <div key={t}><dt className="font-title text-base font-bold text-bone">{t}</dt><dd className="m-0 mt-1.5 text-[15px] leading-relaxed text-bone-dim">{d}</dd></div>)}
            </dl>
          </div>
        </section>

        <section aria-labelledby="cta-h" className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <h2 id="cta-h" className="mx-auto max-w-[20ch] font-title text-3xl font-bold tracking-tight sm:text-4xl">Bring a video. Review the first cut.</h2>
          <button onClick={() => setDialog(true)} className={`${btnMain} mt-8 h-12 px-7 text-base`}>Start creating</button>
        </section>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-bone-dim sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[40ch]">
            <p className="font-title text-base font-extrabold text-bone">CutPilot</p>
            <p className="mt-2 leading-relaxed">A browser-based editing studio where AI prepares the first draft and you make every final decision.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            {NAV.map((n) => <a key={n.id} href={`#${n.id}`} onClick={jump(n.id)} className="hover:text-bone">{n.label}</a>)}
            <button onClick={() => setDialog(true)} className="hover:text-bone">Start creating</button>
            <a href="/editor" onClick={(e) => { e.preventDefault(); navigate('/editor') }} className="hover:text-bone">Open the editor</a>
            <a href={REPO} className="hover:text-bone" rel="noreferrer">Source on GitHub</a>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-bone-dim/80 sm:px-6">Speech recognition by OpenAI Whisper via Transformers.js. Caption fonts are open-source Google Fonts (SIL OFL).</p>
      </footer>

      {dialog && <NewProjectDialog onClose={closeDialog} />}
    </div>
  )
}
