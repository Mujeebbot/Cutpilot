import { useCallback, useEffect, useState } from 'react'
import { Link, navigate } from '../lib/router'
import { peekSession } from '../lib/session'
import { Icon } from '../components/icons'
import { LogoMark } from '../components/Logo'
import { NewProjectDialog } from '../components/NewProjectDialog'
import { CaptionFrame } from '../components/landing/CaptionFrame'

const NAV = [
  { id: 'how', label: 'Workflow' },
  { id: 'templates', label: 'Captions' },
  { id: 'compare', label: 'Local-first' },
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

// Single accent: caption highlight yellow used in product demos
const btnPrimary =
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-[#ffe14d] text-[#0b0c0f] font-semibold transition-all duration-200 hover:bg-[#fff066] hover:shadow-[0_0_20px_rgba(255,225,77,0.3)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe14d] shadow-sm'

export default function Landing() {
  const [dialog, setDialog] = useState(false)
  const [menu, setMenu] = useState(false)
  const [resume, setResume] = useState<{ name: string; videoName: string } | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0)
  const [timecode, setTimecode] = useState('00:00:00:00')
  const [parallaxY, setParallaxY] = useState(0)

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

  // Animate hero third line from dashed 'PROPOSED DRAFT' to solid 'ACCEPTED'
  useEffect(() => {
    const timer = setTimeout(() => setAccepted(true), 1400)
    return () => clearTimeout(timer)
  }, [])

  // Scroll Playhead & Parallax tracking
  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      const totalSec = pct * 45 // 45 seconds virtual timeline length
      const m = Math.floor(totalSec / 60)
      const s = Math.floor(totalSec % 60)
      const f = Math.floor((totalSec % 1) * 30)
      setTimecode(
        `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
      )
      if (!calm) {
        setParallaxY(Math.min(14, window.scrollY * 0.035))
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setMenu(false)
    scrollToId(id)
  }

  // Truncate resume project name to ~20 characters
  const resumeName = resume?.name
    ? resume.name.length > 20
      ? `${resume.name.slice(0, 19)}…`
      : resume.name
    : ''

  return (
    <div className="relative min-h-dvh bg-[#0b0c0f] font-body text-[#f3f1ec] antialiased selection:bg-[#ffe14d]/30">
      {/* ------------------------------------------------------------------ ATMOSPHERE LAYERS */}
      {/* Film-grain overlay (inline SVG feTurbulence, 5% opacity, mix-blend-mode: overlay) */}
      <svg
        className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.05] mix-blend-overlay"
        aria-hidden="true"
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Timeline-ruler motif: 3.5% white ticks, short tick every 24px, long tick every 120px */}
      <svg
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-96 w-full opacity-[0.035] [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]"
        aria-hidden="true"
      >
        <defs>
          <pattern id="timeline-ruler" width="120" height="28" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="#ffffff" strokeWidth="1" />
            <line x1="24" y1="0" x2="24" y2="6" stroke="#ffffff" strokeWidth="1" />
            <line x1="48" y1="0" x2="48" y2="6" stroke="#ffffff" strokeWidth="1" />
            <line x1="72" y1="0" x2="72" y2="6" stroke="#ffffff" strokeWidth="1" />
            <line x1="96" y1="0" x2="96" y2="6" stroke="#ffffff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#timeline-ruler)" />
      </svg>

      {/* Scroll Playhead (fixed 1px line at content margin, fading from nav to 120px below, hidden <1024px) */}
      <div
        className="pointer-events-none fixed top-16 bottom-0 z-40 hidden lg:block left-[max(1rem,calc((100vw-72rem)/2))]"
        aria-hidden="true"
      >
        <div
          className="relative h-full w-px"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0px, rgba(255, 255, 255, 0.1) 120px, rgba(255, 255, 255, 0.05) 100%)',
          }}
        >
          <div className="sticky top-24 -ml-2.5 flex items-center gap-1.5 transition-transform duration-75">
            <span className="grid h-5 w-5 place-items-center rounded bg-[#0b0c0f] border border-[#ffe14d]/70 text-[#ffe14d] shadow-[0_0_12px_rgba(255,225,77,0.35)]">
              <span className="h-2 w-0.5 bg-[#ffe14d]" />
            </span>
            <span className="rounded border border-[#ffe14d]/40 bg-[#0b0c0f]/95 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-[#ffe14d] backdrop-blur shadow-sm">
              {timecode}
            </span>
          </div>
        </div>
      </div>

      {/* Skip Link for Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      {/* ------------------------------------------------------------------ NAVIGATION (h-16 / 64px, max 4 links) */}
      <header className="sticky top-0 z-30 h-16 border-b border-white/[0.07] bg-[#0b0c0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            aria-label="CutPilot home"
            className="flex items-center gap-2.5 whitespace-nowrap text-base font-semibold tracking-tight text-white hover:opacity-90"
          >
            <LogoMark size={28} />
            <span className="font-serif text-xl tracking-normal">CutPilot</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={jump(n.id)}
                className="whitespace-nowrap text-sm text-[#9da1ab] transition-colors hover:text-white"
              >
                {n.label}
              </a>
            ))}
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap text-sm text-[#9da1ab] transition-colors hover:text-white"
            >
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {resume && (
              <Link
                to="/editor"
                className="group hidden items-center gap-1.5 whitespace-nowrap text-xs font-medium text-white/70 transition-colors hover:text-white lg:inline-flex"
                title={resume.videoName ? `Project: ${resume.videoName}` : 'Resume editing session'}
              >
                <span>Continue editing</span>
                <span aria-hidden="true" className="text-white/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white">
                  →
                </span>
              </Link>
            )}

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
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-white/[0.07] bg-[#101216] px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={jump(n.id)}
                className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-[#f3f1ec] hover:bg-white/5"
              >
                {n.label}
              </a>
            ))}
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-[#9da1ab] hover:bg-white/5"
            >
              GitHub
            </a>
            {resume && (
              <Link
                to="/editor"
                title={resume.videoName ? `Project: ${resume.videoName}` : 'Resume editing session'}
                className="block whitespace-nowrap rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                Continue editing →
              </Link>
            )}
          </nav>
        )}
      </header>

      <main id="main">
        {/* ------------------------------------------------------------------ HERO SECTION */}
        <section
          className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28"
          style={{
            background:
              'radial-gradient(ellipse 520px 520px at 68% 45%, rgba(245, 184, 0, 0.14) 0%, rgba(245, 184, 0, 0.04) 55%, transparent 70%), radial-gradient(circle 500px at 10% 85%, rgba(100, 160, 220, 0.05), transparent 70%)',
          }}
        >
          {/* Ambient Hero Film Grain & Glow Texture (Brand Tailored) */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <img
              src="/media/hero-bg-brand.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover object-right-top opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c0f]/40 via-transparent to-[#0b0c0f]" />
          </div>

          {/* Top subtle vignette so nav reads clearly */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-[#0b0c0f] to-transparent" />

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            {/* 2 Columns on Desktop: Left 55% Copy, Right 45% 9:16 Phone Frame */}
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
              <div>
                {/* Refined Display Serif Headline */}
                <h1 className="font-serif text-[clamp(2.75rem,6.5vw,5rem)] font-normal leading-[1.12] tracking-[-0.02em] text-[#f3f1ec]">
                  <span className="block">Your footage.</span>
                  <span className="block">Your vision.</span>
                  <span className="mt-4 block">
                    <span
                      className={`relative inline-block rounded-xl px-4 py-1.5 transition-all duration-700 ${
                        accepted
                          ? 'border-2 border-[#ffe14d] bg-[#ffe14d]/10 text-white'
                          : 'border-2 border-dashed border-[#ffe14d]/60 bg-[#ffe14d]/5 text-white/90'
                      }`}
                    >
                      AI does the first cut.
                      <span
                        aria-hidden="true"
                        className={`absolute -top-3 right-3 rounded-full px-2.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider transition-all duration-500 ${
                          accepted
                            ? 'bg-[#ffe14d] text-black shadow-sm'
                            : 'border border-[#ffe14d]/40 bg-[#0b0c0f] text-[#ffe14d]'
                        }`}
                      >
                        {accepted ? 'Accepted' : 'Proposed Draft'}
                      </span>
                    </span>
                  </span>
                </h1>

                {/* Editor-Voice Value Proposition (Two Lines) */}
                <p className="mt-7 max-w-[46ch] text-base leading-relaxed text-[#9da1ab] sm:text-lg">
                  CutPilot turns raw footage into proposed edits you review clip by clip. Transcription runs entirely on your device.
                </p>

                {/* CTA Group with consistent height, padding, corner radius & hover feedback */}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button onClick={() => setDialog(true)} className={`${btnPrimary} h-11 px-7 text-sm`}>
                    Start creating
                  </button>
                  <a
                    href="#how"
                    onClick={jump('how')}
                    className="group inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-6 text-sm font-medium text-[#f3f1ec] transition-all duration-200 hover:border-white/30 hover:bg-white/[0.05] active:scale-[0.98]"
                  >
                    <span>See the workflow</span>
                    <Icon
                      name="down"
                      size={14}
                      className="text-[#9da1ab] transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-white"
                    />
                  </a>
                </div>

                {/* Trust Row: 14px text at 60% white, thin icons, hairline separators */}
                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/60">
                  <div className="flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-[#ffe14d]" />
                    <span>On-device Whisper</span>
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-[#ffe14d]" />
                    <span>Zero cloud uploads</span>
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1.5">
                    <Icon name="check" size={14} className="text-[#ffe14d]" />
                    <span>Multi-clip timeline</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Vertical 9:16 Phone Frame with Overlap, Floating Cards & Parallax */}
              <div
                className="relative mx-auto w-full max-w-[280px] lg:max-w-[310px] lg:-mb-20 z-20 transition-transform ease-out duration-75"
                style={{ transform: `translateY(${parallaxY}px)` }}
              >
                {/* Floating Review Card 1 (Top-Left) */}
                <div className="absolute top-12 -left-8 sm:-left-14 z-30 flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#121316]/95 px-3 py-2 text-xs backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] float-card">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <span className="font-mono text-[11px] font-medium text-white">Clip 1</span>
                    <span className="text-white/20">·</span>
                    <span className="font-mono text-[11px] text-[#9da1ab]">0:11–0:31</span>
                  </div>
                  <span className="rounded bg-[#ffe14d] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#0b0c0f]">
                    Score 96
                  </span>
                </div>

                {/* Floating Review Card 2 (Bottom-Left) */}
                <div className="absolute bottom-20 -left-6 sm:-left-10 z-30 flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#121316]/95 px-3 py-2 text-xs backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] float-card-delayed">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ffe14d]" />
                  <span className="text-[11px] text-[#9da1ab]">Pause trimmed</span>
                  <span className="font-mono text-[11px] font-medium text-[#ffe14d]">-4.8s</span>
                </div>

                {/* Phone Frame: bezel 6px, radius 36px, 1px inner highlight at top edge, no outer ring */}
                <div className="relative rounded-[36px] p-[6px] border border-white/10 border-t-white/30 bg-[#121316] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
                  <div className="overflow-hidden rounded-[30px]">
                    <CaptionFrame
                      templateId="heavy-pop"
                      text="The *FIRST* cut is ready to review"
                      imageSrc="/media/creator-reel-1.jpg"
                      width={280}
                      height={498}
                      y={0.76}
                      animate={true}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Studio Screenshot Display: real CutPilot multi-clip timeline & canvas player */}
            <div className="relative mt-12 sm:mt-16 z-10 w-full max-w-[1100px] mx-auto">
              <div className="overflow-hidden rounded-2xl border border-white/10 border-t-white/30 bg-[#101216] shadow-[0_25px_80px_-20px_rgba(245,184,0,0.14)]">
                <div className="flex h-10 items-center justify-between border-b border-white/[0.07] bg-[#14161b] px-4">
                  <span className="font-mono text-xs text-[#9da1ab]">
                    CutPilot Studio · Multi-clip timeline &amp; canvas player
                  </span>
                  <div className="flex items-center gap-3 text-xs font-mono text-[#9da1ab]">
                    <span className="text-[#ffe14d]">Score: 96</span>
                    <span className="hidden sm:inline">· 100% On-Device</span>
                    <span className="hidden sm:inline">· 9:16 Canvas</span>
                  </div>
                </div>
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0b0c0f]">
                  <img
                    src="/media/studio-interface.png"
                    alt="CutPilot studio editor interface with real multi-clip timeline, waveforms, and video player"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ WORKFLOW SECTION (01 / 02 / 03) */}
        <section
          id="how"
          tabIndex={-1}
          aria-labelledby="how-h"
          className="relative overflow-hidden border-t border-white/[0.07] bg-[#101216] py-24 focus:outline-none sm:py-32"
          style={{
            background:
              'radial-gradient(ellipse 600px 500px at 15% 45%, rgba(255, 255, 255, 0.05), transparent 70%)',
          }}
        >
          {/* Filmstrip Motif Atmosphere */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <img
              src="/media/filmstrip-motif.png"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-full w-full object-cover object-center opacity-15 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101216] via-transparent to-[#101216]" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 id="how-h" className="font-serif text-3xl font-normal text-white sm:text-4xl">
                Three steps from raw footage to finished export
              </h2>
              <p className="mt-3 text-sm text-[#9da1ab] sm:text-base leading-relaxed">
                The edit is a proposal you control. Nothing reaches your timeline until you accept it.
              </p>
            </div>

            {/* Numerals 01 / 02 / 03 Grid */}
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setActiveStep(0)}
                onMouseEnter={() => setActiveStep(0)}
                className={`text-left p-6 rounded-xl border transition-all ${
                  activeStep === 0
                    ? 'border-[#ffe14d]/50 bg-[#16181e] shadow-lg'
                    : 'border-white/5 bg-transparent hover:border-white/10'
                }`}
              >
                <span className="font-mono text-3xl font-light text-[#ffe14d]">01</span>
                <h3 className="mt-3 font-serif text-xl text-white">Drop footage and set brief</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Add your video file and describe target duration or topics in plain English. Your file never leaves your machine.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(1)}
                onMouseEnter={() => setActiveStep(1)}
                className={`text-left p-6 rounded-xl border transition-all ${
                  activeStep === 1
                    ? 'border-[#ffe14d]/50 bg-[#16181e] shadow-lg'
                    : 'border-white/5 bg-transparent hover:border-white/10'
                }`}
              >
                <span className="font-mono text-3xl font-light text-[#ffe14d]">02</span>
                <h3 className="mt-3 font-serif text-xl text-white">Review the proposed cut</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  On-device Whisper generates word-level timestamps and scores candidate segments by hook strength and clarity.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(2)}
                onMouseEnter={() => setActiveStep(2)}
                className={`text-left p-6 rounded-xl border transition-all ${
                  activeStep === 2
                    ? 'border-[#ffe14d]/50 bg-[#16181e] shadow-lg'
                    : 'border-white/5 bg-transparent hover:border-white/10'
                }`}
              >
                <span className="font-mono text-3xl font-light text-[#ffe14d]">03</span>
                <h3 className="mt-3 font-serif text-xl text-white">Trim, style and export</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Accepted clips populate the multi-clip timeline. Pick a caption template, adjust trim handles, and export your video.
                </p>
              </button>
            </div>

            {/* Crossfading Product Visual for Active Step */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c0f] p-6 sm:p-8 transition-all duration-300">
              {activeStep === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-[#14161b] text-[#ffe14d] shadow-[0_0_20px_rgba(255,225,77,0.15)]">
                    <Icon name="upload" size={28} />
                  </div>
                  <p className="mt-4 font-mono text-xs text-[#9da1ab]">raw_interview_session.mp4</p>
                  <p className="mt-1 font-serif text-lg text-white">“A 45-second vertical reel, strongest hook first, remove pauses”</p>
                  <p className="mt-2 text-xs text-[#9da1ab]">100% processed in your browser tab</p>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-3 py-6 animate-fadeIn">
                  <div className="flex items-center justify-between rounded-lg border border-[#ffe14d]/30 bg-[#ffe14d]/5 p-3 text-xs">
                    <div>
                      <span className="font-mono text-white">00:11 – 00:31</span>
                      <span className="ml-3 text-[#9da1ab]">Hook statement · High verbal energy</span>
                    </div>
                    <span className="rounded bg-[#ffe14d] px-2 py-0.5 font-mono text-[10px] font-bold text-black">Accepted (96)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-[#9da1ab]">
                    <div>
                      <span className="font-mono text-[#f3f1ec]">00:52 – 01:15</span>
                      <span className="ml-3">Direct question · Topic delivery</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#9da1ab]">Review (88)</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-transparent p-3 text-xs text-[#9da1ab]/60">
                    <div>
                      <span className="font-mono">00:34 – 00:49</span>
                      <span className="ml-3">Pause &gt; 1.2s · Tangent</span>
                    </div>
                    <span className="font-mono text-[11px]">Excluded (34)</span>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4 py-6 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-[#9da1ab] font-mono">
                    <span>TIMELINE · 2 CLIPS SELECTED</span>
                    <span>LENGTH 00:44</span>
                  </div>
                  <div className="grid h-12 grid-cols-12 gap-1 rounded-lg border border-white/10 bg-[#14161b] p-1.5">
                    <div className="col-span-5 rounded bg-[#ffe14d]/80 flex items-center px-2 text-[11px] font-mono font-semibold text-black">Clip 01 (20s)</div>
                    <div className="col-span-7 rounded bg-[#ffe14d]/50 flex items-center px-2 text-[11px] font-mono font-semibold text-black">Clip 02 (24s)</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#9da1ab]">
                    <span>Captions burned in with canvas compositor</span>
                    <span className="text-white">Export format: 9:16 Vertical MP4</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ CAPTION STYLES (Aligned Reel with continuous loop) */}
        <section
          id="templates"
          tabIndex={-1}
          aria-labelledby="tmpl-h"
          className="relative overflow-hidden py-24 focus:outline-none sm:py-32"
          style={{
            background:
              'radial-gradient(ellipse 700px 500px at 80% 50%, rgba(255, 225, 77, 0.08), transparent 70%)',
          }}
        >
          {/* Studio Light Atmosphere */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <img
              src="/media/light-shafts.png"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-full w-full object-cover object-top opacity-20 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c0f] via-transparent to-[#0b0c0f]" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 id="tmpl-h" className="font-serif text-3xl font-normal text-white sm:text-4xl">
                  Caption styles designed for retention
                </h2>
                <p className="mt-2 text-sm text-[#9da1ab]">
                  From condensed bold emphasis to kinetic sweep and editorial serifs. Live animated in your browser.
                </p>
              </div>
              <button onClick={() => setDialog(true)} className={`${btnPrimary} h-11 px-6 text-sm shrink-0`}>
                Browse in editor
              </button>
            </div>

            {/* Container-aligned horizontal scroll reel with snap on mobile */}
            <div className="mt-12 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
              <div className="flex gap-6 min-w-full">
                {/* Style 1: Heavy Pop */}
                <div className="w-[260px] sm:w-[270px] shrink-0 snap-center flex flex-col gap-2.5">
                  <CaptionFrame
                    templateId="heavy-pop"
                    text="The *FIRST* rule of editing"
                    imageSrc="/media/creator-reel-1.jpg"
                    width={270}
                    height={480}
                    y={0.76}
                    animate={true}
                    className="w-full"
                  />
                  <div className="px-0.5 text-xs text-[#9da1ab]">
                    <span className="font-medium text-white">Heavy Pop</span> — Condensed caps with yellow emphasis
                  </div>
                </div>

                {/* Style 2: Neon Glow */}
                <div className="w-[260px] sm:w-[270px] shrink-0 snap-center flex flex-col gap-2.5">
                  <CaptionFrame
                    templateId="neon-glow"
                    text="Stop guessing what works"
                    imageSrc="/media/creator-reel-2.jpg"
                    width={270}
                    height={480}
                    y={0.76}
                    animate={true}
                    className="w-full"
                  />
                  <div className="px-0.5 text-xs text-[#9da1ab]">
                    <span className="font-medium text-white">Neon Glow</span> — Luminous night tubes with clean contrast
                  </div>
                </div>

                {/* Style 3: Editorial Serif */}
                <div className="w-[260px] sm:w-[270px] shrink-0 snap-center flex flex-col gap-2.5">
                  <CaptionFrame
                    templateId="editorial"
                    text="A quiet *clarity* in voice"
                    imageSrc="/media/creator-reel-1.jpg"
                    width={270}
                    height={480}
                    y={0.76}
                    animate={true}
                    className="w-full"
                  />
                  <div className="px-0.5 text-xs text-[#9da1ab]">
                    <span className="font-medium text-white">Editorial Serif</span> — Refined display with soft fade
                  </div>
                </div>

                {/* Style 4: Cove Italic */}
                <div className="w-[260px] sm:w-[270px] shrink-0 snap-center flex flex-col gap-2.5">
                  <CaptionFrame
                    templateId="cove-italic"
                    text="When you find *focus*"
                    imageSrc="/media/creator-reel-2.jpg"
                    width={270}
                    height={480}
                    y={0.76}
                    animate={true}
                    className="w-full"
                  />
                  <div className="px-0.5 text-xs text-[#9da1ab]">
                    <span className="font-medium text-white">Cove Italic</span> — High-contrast serif with italic keyword
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ STUDIO BANNER (Perspective tilt on hover) */}
        <section
          className="relative overflow-hidden border-y border-white/[0.07] bg-[#101216] py-24 sm:py-32"
          style={{
            background:
              'radial-gradient(ellipse 650px 450px at 50% 25%, rgba(255, 255, 255, 0.06), transparent 70%)',
          }}
        >
          {/* Subtle Lower Section Brand Background Texture */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <img
              src="/media/lower-sections-bg.png"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-full w-full object-cover object-right-top opacity-35 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#101216] via-transparent to-[#101216]" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.8fr] lg:items-center">
              <div>
                <h2 className="font-serif text-3xl font-normal text-white sm:text-4xl">
                  Multi-clip timeline with trim handles and caption editing
                </h2>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#9da1ab]">
                  CutPilot does not force you to accept an automated output blindly. You review proposed segments, retime in and out points on a full multi-clip timeline, adjust caption timing word by word, and export directly from your browser.
                </p>
                <div className="mt-8">
                  <button onClick={() => setDialog(true)} className={`${btnPrimary} h-11 px-7 text-sm`}>
                    Open the editor
                  </button>
                </div>
              </div>

              {/* Real Interface Preview with 3D Perspective Tilt on Hover */}
              <div className="perspective-[1000px] overflow-hidden rounded-xl border border-white/10 bg-[#0b0c0f] shadow-2xl transition-transform duration-500 ease-out hover:[transform:none] [transform:rotateY(-5deg)_rotateX(2deg)]">
                <img
                  src="/media/studio-interface.png"
                  alt="CutPilot studio editor interface with multi-clip timeline, waveforms, and video player"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ WHY LOCAL-FIRST (DIAGRAM + SPEC TABLE) */}
        <section
          id="compare"
          tabIndex={-1}
          aria-labelledby="cmp-h"
          className="relative overflow-hidden py-24 focus:outline-none sm:py-32"
          style={{
            background:
              'radial-gradient(ellipse 600px 450px at 20% 35%, rgba(255, 225, 77, 0.08), transparent 70%)',
          }}
        >
          {/* Audio Waveform Ribbon (On-Device Speech & Signal Atmosphere) */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <img
              src="/media/audio-waveform-ribbon.png"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-full w-full object-cover object-center opacity-30 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c0f] via-transparent to-[#0b0c0f]" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 id="cmp-h" className="font-serif text-3xl font-normal text-white sm:text-4xl">
                Why local-first
              </h2>
              <p className="mt-2 text-sm text-[#9da1ab]">
                Video processing happens on your device rather than a remote cloud server.
              </p>
            </div>

            {/* Architecture Diagram: Your Device vs External */}
            <div className="mt-10 rounded-xl border border-white/10 bg-[#101216] p-6 sm:p-8">
              <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
                {/* Box 1: Your Device */}
                <div className="rounded-lg border border-[#ffe14d]/30 bg-[#0b0c0f] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#ffe14d]">
                      Your Device (In-Browser)
                    </span>
                    <span className="rounded bg-[#ffe14d]/10 px-2 py-0.5 text-[10px] font-mono text-[#ffe14d]">
                      100% Private
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-[#f3f1ec]">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ffe14d]" />
                      <span>Original video footage (never uploaded)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ffe14d]" />
                      <span>Whisper speech recognition (WebAssembly)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ffe14d]" />
                      <span>Multi-clip timeline, captions &amp; canvas export</span>
                    </li>
                  </ul>
                </div>

                {/* Arrow / Connection */}
                <div className="flex flex-col items-center justify-center text-center text-[11px] text-[#9da1ab] py-2 md:py-0">
                  <span className="font-mono">← One-time ~40 MB model →</span>
                  <span className="text-[10px] text-white/40">Zero footage leaves your machine</span>
                </div>

                {/* Box 2: Hugging Face (Model CDN) */}
                <div className="rounded-lg border border-white/10 bg-[#0b0c0f]/60 p-5">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#9da1ab]">
                    Hugging Face (Static CDN)
                  </span>
                  <p className="mt-3 text-xs leading-relaxed text-[#9da1ab]">
                    Downloads quantized Whisper weights once. The file is cached in browser storage for offline editing.
                  </p>
                </div>
              </div>
            </div>

            {/* Spec Table */}
            <div className="mt-12 overflow-x-auto">
              <table className="w-full border-collapse border-t border-b border-white/10 text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-mono uppercase tracking-wider text-[#9da1ab]">
                    <th className="py-4 pr-6 font-medium">Architecture Dimension</th>
                    <th className="py-4 px-6 font-medium text-white">CutPilot (On-Device)</th>
                    <th className="py-4 pl-6 font-medium text-[#9da1ab]">Remote Cloud Editors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-[#9da1ab]">
                  <tr>
                    <td className="py-4 pr-6 font-medium text-white">Media Privacy</td>
                    <td className="py-4 px-6 text-white font-medium">0 KB uploaded · Remains on your machine</td>
                    <td className="py-4 pl-6">Uploaded to remote cloud infrastructure</td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-6 font-medium text-white">Speech Recognition</td>
                    <td className="py-4 px-6 text-white font-medium">OpenAI Whisper running in WebAssembly</td>
                    <td className="py-4 pl-6">Metered remote API calls</td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-6 font-medium text-white">Timeline Control</td>
                    <td className="py-4 px-6 text-white font-medium">Multi-clip timeline with trim handles and caption editing</td>
                    <td className="py-4 pl-6">Rigid automated cut generation</td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-6 font-medium text-white">Export Compositor</td>
                    <td className="py-4 px-6 text-white font-medium">In-browser canvas renderer · Zero watermarks</td>
                    <td className="py-4 pl-6">Remote server-side rendering queue</td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-6 font-medium text-white">Offline Capability</td>
                    <td className="py-4 px-6 text-white font-medium">Runs offline once Whisper model is cached</td>
                    <td className="py-4 pl-6">Requires uninterrupted internet connection</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ TECHNICAL SPECIFICATIONS */}
        <section
          id="privacy"
          tabIndex={-1}
          aria-labelledby="priv-h"
          className="border-t border-white/[0.07] bg-[#101216] py-24 focus:outline-none sm:py-32"
          style={{
            background:
              'radial-gradient(ellipse 600px 500px at 85% 60%, rgba(255, 255, 255, 0.05), transparent 70%)',
          }}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 id="priv-h" className="font-serif text-3xl font-normal text-white sm:text-4xl">
                Technical architecture &amp; specifications
              </h2>
              <p className="mt-2 text-sm text-[#9da1ab]">
                Clear details on what runs where and how performance behaves.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-[#0b0c0f] p-6">
                <h3 className="text-sm font-semibold text-white">On-Device Processing</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Transcription, clip heuristic scoring, caption rendering, and export run directly in your browser tab. Your video file never touches an external server.
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0b0c0f] p-6">
                <h3 className="text-sm font-semibold text-white">Whisper Model Cache</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  On first use, CutPilot downloads a compact quantized Whisper model (~40 MB) from Hugging Face and caches it in browser storage. Subsequent sessions run locally.
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0b0c0f] p-6">
                <h3 className="text-sm font-semibold text-white">IndexedDB Session Storage</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Video data is kept in browser IndexedDB while editing choices are stored in localStorage. A page refresh will not erase your in-progress work.
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0b0c0f] p-6">
                <h3 className="text-sm font-semibold text-white">Real-Time MediaRecorder Export</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Because video composition happens on an HTML5 canvas, export captures real-time playback. Keep the browser tab open while exporting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ FINAL CTA */}
        <section aria-labelledby="cta-h" className="relative overflow-hidden py-28 text-center sm:py-36">
          {/* Ambient Brand Wave Glow (Violet & Warm Yellow Flow) */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <img
              src="/media/cta-gradient-glow.png"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-full w-full object-cover object-center opacity-65 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c0f] via-transparent to-[#0b0c0f]" />
          </div>

          {/* Anamorphic Golden Laser Flare (Cinematic Horizon Line) */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 flex items-center justify-center overflow-hidden">
            <img
              src="/media/anamorphic-gold-flare.png"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-44 w-full max-w-4xl object-contain opacity-75 mix-blend-screen"
            />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="cta-h" className="font-serif text-3xl font-normal text-white sm:text-5xl">
              Bring your footage. Review the proposed cut.
            </h2>
            <p className="mt-4 text-sm text-[#9da1ab] sm:text-base">
              No account creation. Your video stays private on your machine.
            </p>
            <div className="mt-8 flex justify-center">
              <button onClick={() => setDialog(true)} className={`${btnPrimary} h-11 px-8 text-sm`}>
                Start creating
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ FOOTER */}
      <footer className="border-t border-white/[0.07] bg-[#0b0c0f] py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-[42ch]">
              <span className="font-serif text-xl text-white">CutPilot</span>
              <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                A browser-based editing studio where on-device Whisper proposes the first cut and you retain creative control.
              </p>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-[#9da1ab]">
              {NAV.map((n) => (
                <a key={n.id} href={`#${n.id}`} onClick={jump(n.id)} className="transition-colors hover:text-white">
                  {n.label}
                </a>
              ))}
              <a href="/editor" onClick={(e) => { e.preventDefault(); navigate('/editor') }} className="transition-colors hover:text-white">
                Open Editor
              </a>
              <a href={REPO} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                GitHub
              </a>
            </nav>
          </div>

          <div className="mt-10 border-t border-white/[0.06] pt-6 text-xs text-[#9da1ab]/60">
            <p>On-device speech recognition via OpenAI Whisper / Transformers.js. Open-source typography.</p>
          </div>
        </div>
      </footer>

      {dialog && <NewProjectDialog onClose={closeDialog} />}
    </div>
  )
}
