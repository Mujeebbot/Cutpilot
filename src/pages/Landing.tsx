import { useCallback, useEffect, useState } from 'react'
import { Link, navigate } from '../lib/router'
import { TEMPLATES } from '../lib/templates'
import { peekSession } from '../lib/session'
import { Icon } from '../components/icons'
import { LogoMark, LogoLockup } from '../components/Logo'
import { NewProjectDialog } from '../components/NewProjectDialog'
import { EditorMock } from '../components/landing/EditorMock'
import { CaptionFrame } from '../components/landing/CaptionFrame'

const NAV = [
  { id: 'how', label: 'How it works' },
  { id: 'templates', label: 'Caption Styles' },
  { id: 'features', label: 'Features' },
  { id: 'compare', label: 'Why Local-First' },
  { id: 'privacy', label: 'Privacy' },
]

const REPO = 'https://github.com/Mujeebbot/Cutpilot'

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
  el.focus({ preventScroll: true })
}

const btnPrimary =
  'inline-flex h-11 items-center justify-center rounded-xl bg-accent-500 px-6 text-[15px] font-semibold text-white shadow-[0_0_25px_-4px_rgba(139,124,246,0.6)] transition-all duration-200 hover:bg-accent-400 hover:shadow-[0_0_35px_-2px_rgba(139,124,246,0.8)] active:scale-[0.98]'

export default function Landing() {
  const [dialog, setDialog] = useState(false)
  const [menu, setMenu] = useState(false)
  const [resume, setResume] = useState<{ name: string; videoName: string } | null>(null)
  const closeDialog = useCallback(() => setDialog(false), [])

  useEffect(() => {
    void peekSession().then(setResume)
  }, [])

  useEffect(() => {
    document.title = 'CutPilot: Your footage, your vision, AI does the first cut'
  }, [])

  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView())
  }, [])

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setMenu(false)
    scrollToId(id)
  }

  return (
    <div className="relative min-h-dvh bg-ink-950 font-body text-bone antialiased selection:bg-accent-500/40">
      {/* Skip Link for Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-bone focus:px-3 focus:py-2 focus:text-graphite"
      >
        Skip to content
      </a>

      {/* Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            aria-label="CutPilot home"
            className="flex items-center gap-2.5 font-title text-lg font-extrabold tracking-tight"
          >
            <LogoMark size={32} />
            <span className="flex items-baseline gap-1.5">
              <span>CutPilot</span>
              <span className="rounded bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-mono font-medium text-accent-300">
                v4.0
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={jump(n.id)}
                className="rounded-lg px-3 py-1.5 text-sm text-bone-dim transition-colors hover:bg-white/[0.04] hover:text-bone"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {resume && (
              <Link
                to="/editor"
                className="hidden items-center gap-1.5 rounded-lg border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-xs text-accent-300 transition-colors hover:bg-accent-500/20 lg:inline-flex"
                title={resume.videoName}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse" />
                Resume “{resume.name}”
              </Link>
            )}

            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-bone-dim transition-colors hover:border-white/20 hover:text-bone sm:inline-flex"
            >
              <Icon name="star" size={13} className="text-amber-400" />
              <span>GitHub</span>
            </a>

            <button onClick={() => setDialog(true)} className={`${btnPrimary} h-9 px-4 text-xs`}>
              Start creating
            </button>

            <button
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 md:hidden"
              aria-expanded={menu}
              aria-controls="mobile-nav"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              onClick={() => setMenu((m) => !m)}
            >
              <Icon name={menu ? 'x' : 'text'} size={17} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {menu && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-white/[0.08] bg-ink-900 px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={jump(n.id)}
                className="block rounded-md px-3 py-2.5 text-[15px] text-bone hover:bg-white/5"
              >
                {n.label}
              </a>
            ))}
            {resume && (
              <Link to="/editor" className="block rounded-md px-3 py-2.5 text-[15px] font-medium text-accent-300 hover:bg-white/5">
                Resume “{resume.name}”
              </Link>
            )}
          </nav>
        )}
      </header>

      <main id="main">
        {/* ------------------------------------------------------------------ HERO SECTION */}
        <section className="relative overflow-hidden hero-glow pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28">
          {/* Subtle Ambient Grid Background */}
          <div className="pointer-events-none absolute inset-0 hero-grid" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14">
              <div>
                {/* Feature Pill Announcement */}
                <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3.5 py-1 text-xs font-medium text-accent-300 shadow-[0_0_20px_-3px_rgba(139,124,246,0.3)]">
                  <span className="h-2 w-2 rounded-full bg-accent-400 animate-pulse" />
                  <span>On-Device Whisper AI · Free &amp; Private</span>
                </div>

                {/* Main Hero Headline */}
                <h1 className="mt-5 font-title text-[clamp(2.3rem,5.2vw,4rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-white">
                  <span className="cut-in mb-2 block w-fit rounded-lg border-t-2 border-bone-dim/40 bg-slate px-3.5 pb-1.5 pt-1 shadow-sm">
                    Your footage.
                  </span>
                  <span
                    className="cut-in mb-2 block w-fit rounded-lg border-t-2 border-bone-dim/40 bg-slate px-3.5 pb-1.5 pt-1 shadow-sm"
                    style={{ animationDelay: '140ms' }}
                  >
                    Your vision.
                  </span>
                  <span
                    className="cut-in relative block w-fit rounded-lg border-2 border-dashed border-accent-400/80 bg-accent-500/10 px-3.5 pb-1.5 pt-1 text-accent-300 shadow-[0_0_30px_-5px_rgba(139,124,246,0.3)]"
                    style={{ animationDelay: '280ms' }}
                  >
                    AI does the first cut.
                    <span
                      aria-hidden="true"
                      className="absolute -top-2.5 right-3 rounded-full bg-accent-500 px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                    >
                      Proposed Draft
                    </span>
                  </span>
                </h1>

                {/* Subhead with Value Proposition */}
                <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-bone-dim">
                  CutPilot transforms raw talking-head footage into high-retention vertical reels in your browser.
                  Transcribes locally with Whisper, detects punchy hooks, removes dead pauses, and burns in viral animated captions.
                </p>

                {/* Call-to-action Group */}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button onClick={() => setDialog(true)} className={`${btnPrimary} h-12 px-7 text-base`}>
                    Start creating for free
                  </button>
                  <a
                    href="#how"
                    onClick={jump('how')}
                    className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-[15px] font-medium text-bone transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <span>See how it works</span>
                    <Icon name="down" size={15} className="text-bone-dim" />
                  </a>
                </div>

                {/* Trust Metrics / Privacy Badges */}
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-6 text-xs text-bone-dim">
                  <div className="flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-teal-deep" />
                    <span>0 KB Uploaded (100% In-Browser)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-teal-deep" />
                    <span>No Account or API Key</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-teal-deep" />
                    <span>34+ Viral Caption Styles</span>
                  </div>
                </div>
              </div>

              {/* Hero Studio Mockup */}
              <div className="relative">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent-600/30 to-purple-600/20 opacity-70 blur-2xl" />
                <EditorMock />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ HOW IT WORKS */}
        <section id="how" tabIndex={-1} aria-labelledby="how-h" className="border-y border-white/[0.08] bg-charcoal focus:outline-none">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-300">The Workflow</span>
              <h2 id="how-h" className="mt-2 font-title text-3xl font-bold tracking-tight sm:text-4xl text-white">
                From raw rambling to viral cut in three steps
              </h2>
              <p className="mt-3 text-bone-dim leading-relaxed">
                The draft is a proposal you control, not a black-box video. Nothing reaches your project timeline until you approve it.
              </p>
            </div>

            <ol className="mt-14 grid gap-8 lg:grid-cols-3">
              {/* Step 1 */}
              <li className="relative rounded-2xl border border-white/10 bg-slate/60 p-6 shadow-lg">
                <div className="mb-6 flex h-28 items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-500/20 text-accent-300 border border-accent-500/30">
                      <Icon name="film" size={20} />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-semibold text-bone">interview_final.mp4</p>
                      <p className="text-[11px] text-bone-dim">14:28 · 9:16 Vertical · H.264</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500 font-mono text-xs font-bold text-white">
                    1
                  </span>
                  <h3 className="font-title text-xl font-bold text-white">Drop footage &amp; prompt</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-bone-dim">
                  Select a video file from your computer and specify your goals: desired duration, target audience hook, aggressive pause trimming, or format.
                </p>
                <div className="mt-4 rounded-lg bg-white/[0.04] p-2.5 text-xs text-bone-dim border border-white/5">
                  🔒 File never leaves your machine. IndexedDB persists it in your browser.
                </div>
              </li>

              {/* Step 2 */}
              <li className="relative rounded-2xl border border-white/10 bg-slate/60 p-6 shadow-lg">
                <div className="mb-6 flex h-28 flex-col justify-center rounded-xl border border-white/10 bg-black/30 p-3 space-y-1.5">
                  <div className="flex items-center justify-between rounded-md border border-accent-500/40 bg-accent-500/15 px-2.5 py-1.5 text-xs">
                    <span className="font-mono font-medium text-bone">Clip 1: 0:11–0:31</span>
                    <span className="rounded bg-accent-400 px-1.5 py-0.5 text-[9px] font-bold text-black">Accepted (96)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-bone-dim">
                    <span className="font-mono">Clip 2: 0:52–1:15</span>
                    <span className="text-[10px] text-amber-300">To review (88)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500 font-mono text-xs font-bold text-white">
                    2
                  </span>
                  <h3 className="font-title text-xl font-bold text-white">Review the AI draft</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-bone-dim">
                  On-device Whisper generates word-by-word timestamps. CutPilot scores and ranks high-retention segments, lets you retime start/end times, and preview clips.
                </p>
                <div className="mt-4 rounded-lg bg-white/[0.04] p-2.5 text-xs text-bone-dim border border-white/5">
                  ⚙️ 100% explainable rules: hook detection, question scoring, and pause removal.
                </div>
              </li>

              {/* Step 3 */}
              <li className="relative rounded-2xl border border-white/10 bg-slate/60 p-6 shadow-lg">
                <div className="mb-6 flex h-28 items-center justify-center rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="w-full space-y-2">
                    <div className="flex h-6 gap-1 rounded bg-black/40 p-1">
                      <span className="h-full rounded bg-accent-400/80" style={{ width: '45%' }} />
                      <span className="h-full rounded bg-accent-500/50" style={{ width: '55%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-bone-dim font-mono">
                      <span>Exporting MP4...</span>
                      <span className="text-accent-300">100%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500 font-mono text-xs font-bold text-white">
                    3
                  </span>
                  <h3 className="font-title text-xl font-bold text-white">Restyle &amp; burn-in export</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-bone-dim">
                  Approved clips populate the timeline. Apply from 34+ viral caption templates, customize fonts and colors, reorder clips, and export a ready-to-publish MP4 video.
                </p>
                <div className="mt-4 rounded-lg bg-white/[0.04] p-2.5 text-xs text-bone-dim border border-white/5">
                  ⚡ Hardware-accelerated canvas compositor burns captions in real-time.
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------------ CAPTION STYLES SHOWCASE */}
        <section id="templates" tabIndex={-1} aria-labelledby="tmpl-h" className="mx-auto max-w-6xl px-4 py-16 focus:outline-none sm:px-6 lg:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent-300">34+ Built-in Templates</span>
              <h2 id="tmpl-h" className="mt-2 font-title text-3xl font-bold tracking-tight sm:text-4xl text-white">
                Viral caption styles made famous by top creators
              </h2>
              <p className="mt-3 max-w-[55ch] text-bone-dim">
                From Alex Hormozi punchy bold pop to sleek kinetic karaoke and minimalist editorial serifs. Live animated in your browser.
              </p>
            </div>
            <button onClick={() => setDialog(true)} className={`${btnPrimary} shrink-0`}>
              Browse all templates in editor
            </button>
          </div>

          {/* 3 Large Cinematic Creator Caption Cards */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Heavy Pop / Hormozi Style */}
            <div className="flex flex-col gap-3">
              <CaptionFrame
                templateId="heavy-pop"
                text="The *BIGGEST* secret to viral growth"
                imageSrc="/media/creator-reel-1.jpg"
                badge="Viral Heavy Pop"
                width={320}
                height={520}
                y={0.76}
                animate={true}
                className="w-full"
              />
              <div className="px-1">
                <p className="text-sm font-semibold text-bone">Hormozi Heavy Pop</p>
                <p className="text-xs text-bone-dim">Yellow emphasis keyword with high-contrast black border &amp; bounce</p>
              </div>
            </div>

            {/* Card 2: Cyber Neon Glow */}
            <div className="flex flex-col gap-3">
              <CaptionFrame
                templateId="neon"
                text="Stop *GUESSING* what viewers want"
                imageSrc="/media/creator-reel-2.jpg"
                badge="Midnight Neon"
                width={320}
                height={520}
                y={0.76}
                animate={true}
                className="w-full"
              />
              <div className="px-1">
                <p className="text-sm font-semibold text-bone">Midnight Neon</p>
                <p className="text-xs text-bone-dim">Electric cyan and violet glow with pop scale animations</p>
              </div>
            </div>

            {/* Card 3: Cove Kinetic Karaoke */}
            <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
              <CaptionFrame
                templateId="cove"
                text="It generated *$48,000* in revenue"
                imageSrc="/media/creator-reel-1.jpg"
                badge="Clean Karaoke"
                width={320}
                height={520}
                y={0.76}
                animate={true}
                className="w-full"
              />
              <div className="px-1">
                <p className="text-sm font-semibold text-bone">Cove Kinetic Karaoke</p>
                <p className="text-xs text-bone-dim">Smooth word-by-word active fill with subtle rounded backdrop</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ WORKSPACE BANNER */}
        <section className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate p-8 sm:p-12 lg:p-16 shadow-2xl">
            {/* Background Workspace Image with Vignette */}
            <img
              src="/media/workspace-hero.jpg"
              alt="Video editing studio setup"
              className="absolute inset-0 h-full w-full object-cover opacity-25"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-transparent" />

            <div className="relative max-w-xl">
              <span className="rounded-full bg-accent-500/20 px-3 py-1 font-mono text-xs font-semibold text-accent-300 border border-accent-500/30">
                PRO NLE STUDIO
              </span>
              <h2 className="mt-4 font-title text-3xl font-extrabold text-white sm:text-4xl">
                The control of a desktop NLE. The speed of AI.
              </h2>
              <p className="mt-4 text-base text-bone-dim leading-relaxed">
                Traditional AI video cutters force you to accept their cuts blindly. CutPilot gives you a complete multi-clip timeline with word-level snapping, trim handles, sequence reordering, and autosave.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button onClick={() => setDialog(true)} className={btnPrimary}>
                  Open the Editor
                </button>
                <Link to="/editor" className="text-sm font-medium text-bone underline underline-offset-4 hover:text-white">
                  Direct editor link →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ WHY LOCAL-FIRST (COMPARISON) */}
        <section id="compare" tabIndex={-1} aria-labelledby="cmp-h" className="mx-auto max-w-6xl px-4 py-16 focus:outline-none sm:px-6 lg:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-300">Architected Differently</span>
            <h2 id="cmp-h" className="mt-2 font-title text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Why creators choose CutPilot over cloud subscriptions
            </h2>
            <p className="mt-3 text-bone-dim">
              No cloud uploads, no monthly credits, no recurring bills.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full border-collapse rounded-2xl border border-white/10 bg-slate/40 text-left text-sm backdrop-blur">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="p-4 sm:p-5 font-title text-base font-bold text-bone">Feature</th>
                  <th className="p-4 sm:p-5 font-title text-base font-bold text-accent-300 bg-accent-500/10 border-x border-accent-500/20">
                    CutPilot 4.0 (Local-First)
                  </th>
                  <th className="p-4 sm:p-5 font-title text-base font-bold text-bone-dim">
                    Cloud Subscription Tools
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-bone-dim">
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-bone">Privacy &amp; Data Security</td>
                  <td className="p-4 sm:p-5 text-accent-300 font-semibold bg-accent-500/5 border-x border-accent-500/20">
                    🔒 100% On-Device (0 KB uploaded)
                  </td>
                  <td className="p-4 sm:p-5">Uploaded to remote cloud servers</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-bone">Pricing &amp; Subscriptions</td>
                  <td className="p-4 sm:p-5 text-accent-300 font-semibold bg-accent-500/5 border-x border-accent-500/20">
                    💰 Free Forever · Open Source
                  </td>
                  <td className="p-4 sm:p-5">$19 – $49 / month recurring</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-bone">AI Transcription Engine</td>
                  <td className="p-4 sm:p-5 text-accent-300 font-semibold bg-accent-500/5 border-x border-accent-500/20">
                    ⚡ OpenAI Whisper on WebAssembly / Web Worker
                  </td>
                  <td className="p-4 sm:p-5">Metered cloud API with monthly minute caps</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-bone">Editing Flexibility</td>
                  <td className="p-4 sm:p-5 text-accent-300 font-semibold bg-accent-500/5 border-x border-accent-500/20">
                    🎬 Full NLE Timeline with trim handles &amp; sequence bar
                  </td>
                  <td className="p-4 sm:p-5">Rigid black-box automatic generation</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-bone">Watermarks &amp; Restrictions</td>
                  <td className="p-4 sm:p-5 text-accent-300 font-semibold bg-accent-500/5 border-x border-accent-500/20">
                    ✨ No watermarks, full quality MP4 export
                  </td>
                  <td className="p-4 sm:p-5">Watermarked unless on paid plans</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------------------ PRIVACY & LIMITS FAQ */}
        <section id="privacy" tabIndex={-1} aria-labelledby="priv-h" className="border-t border-white/[0.08] bg-charcoal focus:outline-none">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-deep">Technical Integrity</span>
              <h2 id="priv-h" className="mt-2 font-title text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Honest limitations and privacy architecture
              </h2>
              <p className="mt-3 text-bone-dim">
                We believe in complete transparency about what runs where and how performance behaves.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate/50 p-6">
                <h3 className="font-title text-lg font-bold text-bone">On-Device Processing</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">
                  Transcription, clip heuristic scoring, live playback, caption rendering, and export all run in your browser tab. Your footage never touches an external server.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate/50 p-6">
                <h3 className="font-title text-lg font-bold text-bone">Cached Whisper Model</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">
                  On first use, CutPilot downloads a compact quantized Whisper model (~40 MB) from Hugging Face and caches it in browser storage. Subsequent sessions run offline.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate/50 p-6">
                <h3 className="font-title text-lg font-bold text-bone">Browser Session Persistence</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">
                  Video blobs are preserved in browser IndexedDB while editing choices are stored in localStorage. A page refresh will not destroy your work.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate/50 p-6">
                <h3 className="font-title text-lg font-bold text-bone">Real-Time MediaRecorder Export</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">
                  Because video composition happens on an HTML5 canvas, export captures real-time playback (a 30s video takes ~30s). Keep the browser tab open while exporting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ FINAL CTA BANNER */}
        <section aria-labelledby="cta-h" className="relative overflow-hidden hero-glow py-20 text-center sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="cta-h" className="font-title text-3xl font-extrabold text-white sm:text-5xl tracking-tight">
              Bring your footage. Review the first cut.
            </h2>
            <p className="mt-5 text-lg text-bone-dim">
              No account creation. No monthly subscriptions. Your video stays private on your machine.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button onClick={() => setDialog(true)} className={`${btnPrimary} h-13 px-8 text-base`}>
                Start creating now — it&apos;s free
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ FOOTER */}
      <footer className="border-t border-white/[0.08] bg-ink-950 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-[42ch]">
              <LogoLockup size={28} textClassName="text-lg font-extrabold text-white" />
              <p className="mt-3 text-sm leading-relaxed text-bone-dim">
                A modern browser-based video editing studio where on-device AI prepares the first cut and you retain 100% creative control.
              </p>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-bone-dim">
              {NAV.map((n) => (
                <a key={n.id} href={`#${n.id}`} onClick={jump(n.id)} className="transition-colors hover:text-white">
                  {n.label}
                </a>
              ))}
              <a href="/editor" onClick={(e) => { e.preventDefault(); navigate('/editor') }} className="transition-colors hover:text-white">
                Open Editor
              </a>
              <a href={REPO} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                Source on GitHub
              </a>
            </nav>
          </div>

          <div className="mt-10 border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-bone-dim/70 gap-4">
            <p>On-device speech recognition via OpenAI Whisper / Transformers.js. Fonts from SIL Open Font License.</p>
            <p className="font-mono text-accent-400/80">CutPilot 4.0 · Local-First Architecture</p>
          </div>
        </div>
      </footer>

      {dialog && <NewProjectDialog onClose={closeDialog} />}
    </div>
  )
}
