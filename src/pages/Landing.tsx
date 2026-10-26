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
  'inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg bg-[#ffe14d] px-6 text-sm font-semibold text-black transition-all duration-150 hover:bg-[#ffd54f] active:scale-[0.98]'

export default function Landing() {
  const [dialog, setDialog] = useState(false)
  const [menu, setMenu] = useState(false)
  const [resume, setResume] = useState<{ name: string; videoName: string } | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0)

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
    <div className="relative min-h-dvh bg-[#0c0d10] font-body text-[#f3f1ec] antialiased selection:bg-[#ffe14d]/30">
      {/* Skip Link for Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      {/* ------------------------------------------------------------------ NAVIGATION (h-16 / 64px, max 4 links) */}
      <header className="sticky top-0 z-30 h-16 border-b border-white/[0.08] bg-[#0c0d10]/90 backdrop-blur-xl">
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
                className="hidden whitespace-nowrap text-xs text-[#ffe14d] transition-colors hover:underline lg:inline-flex"
                title={resume.videoName}
              >
                Continue “{resumeName}” →
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
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-white/[0.08] bg-[#121316] px-4 py-3 md:hidden">
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
              <Link to="/editor" className="block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[#ffe14d] hover:bg-white/5">
                Continue “{resumeName}” →
              </Link>
            )}
          </nav>
        )}
      </header>

      <main id="main">
        {/* ------------------------------------------------------------------ HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-28 sm:pt-24 sm:pb-36 lg:pt-28 lg:pb-40">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl">
              {/* Display Headline in Refined Serif */}
              <h1 className="font-serif text-[clamp(2.75rem,7vw,5.25rem)] font-normal leading-[1.05] tracking-[-0.02em] text-[#f3f1ec]">
                <span className="block">Your footage.</span>
                <span className="block">Your vision.</span>
                <span className="mt-2 block">
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
                          : 'border border-[#ffe14d]/40 bg-[#0c0d10] text-[#ffe14d]'
                      }`}
                    >
                      {accepted ? 'Accepted' : 'Proposed Draft'}
                    </span>
                  </span>
                </span>
              </h1>

              {/* Quiet, Editor-Voice Value Proposition */}
              <p className="mt-8 max-w-[54ch] text-base leading-relaxed text-[#9da1ab] sm:text-lg">
                CutPilot turns raw footage into proposed edits you review clip by clip, with word-level snapping,
                trim handles, and kinetic captions. Transcription runs entirely on your device with Whisper.
              </p>

              {/* Call to action & quiet check items */}
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <button onClick={() => setDialog(true)} className={`${btnPrimary} h-12 px-7 text-sm`}>
                  Start creating
                </button>
                <a
                  href="#how"
                  onClick={jump('how')}
                  className="inline-flex h-12 items-center gap-1.5 rounded-lg border border-white/10 px-5 text-sm text-[#f3f1ec] transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <span>See the workflow</span>
                  <Icon name="down" size={14} className="text-[#9da1ab]" />
                </a>
              </div>

              {/* One Quiet Line for Key Guarantees */}
              <p className="mt-7 text-xs text-[#9da1ab]">
                On-device Whisper <span className="mx-2 text-white/20">·</span> Zero cloud uploads{' '}
                <span className="mx-2 text-white/20">·</span> Multi-clip timeline with trim handles
              </p>
            </div>

            {/* Studio Screenshot Display */}
            <div className="mt-16 relative">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121316] shadow-2xl">
                <div className="flex h-10 items-center justify-between border-b border-white/[0.08] bg-[#18191e] px-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="ml-3 font-mono text-xs text-[#9da1ab]">
                      CutPilot Studio · Multi-clip sequence &amp; caption timeline
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#9da1ab]">100% In-Browser</span>
                </div>
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0c0d10]">
                  <img
                    src="/media/studio-screenshot.jpg"
                    alt="CutPilot browser-based video editing studio"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ WORKFLOW SECTION (01 / 02 / 03) */}
        <section id="how" tabIndex={-1} aria-labelledby="how-h" className="border-t border-white/[0.08] bg-[#121316] py-28 focus:outline-none sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 id="how-h" className="font-serif text-3xl font-normal text-white sm:text-4xl">
                Three steps from raw footage to finished export
              </h2>
              <p className="mt-3 text-sm text-[#9da1ab] sm:text-base leading-relaxed">
                The edit is a proposal you control. Nothing reaches your timeline until you accept it.
              </p>
            </div>

            {/* Numerals 01 / 02 / 03 Grid */}
            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => setActiveStep(0)}
                className={`text-left p-6 rounded-xl border transition-all ${
                  activeStep === 0
                    ? 'border-[#ffe14d]/40 bg-[#18191e]'
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
                className={`text-left p-6 rounded-xl border transition-all ${
                  activeStep === 1
                    ? 'border-[#ffe14d]/40 bg-[#18191e]'
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
                className={`text-left p-6 rounded-xl border transition-all ${
                  activeStep === 2
                    ? 'border-[#ffe14d]/40 bg-[#18191e]'
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

            {/* Large Interactive Visual for the Active Step */}
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d10] p-6 sm:p-8">
              {activeStep === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-[#18191e] text-[#ffe14d]">
                    <Icon name="upload" size={28} />
                  </div>
                  <p className="mt-4 font-mono text-xs text-[#9da1ab]">raw_interview_session.mp4</p>
                  <p className="mt-1 font-serif text-lg text-white">“A 45-second vertical reel, strongest hook first, remove pauses”</p>
                  <p className="mt-2 text-xs text-[#9da1ab]">100% processed in your browser tab</p>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-3 py-6">
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
                <div className="space-y-4 py-6">
                  <div className="flex items-center justify-between text-xs text-[#9da1ab] font-mono">
                    <span>TIMELINE · 2 CLIPS SELECTED</span>
                    <span>LENGTH 00:44</span>
                  </div>
                  <div className="grid h-12 grid-cols-12 gap-1 rounded-lg border border-white/10 bg-[#18191e] p-1.5">
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

        {/* ------------------------------------------------------------------ CAPTION STYLES (Full-Bleed Horizontal Reel) */}
        <section id="templates" tabIndex={-1} aria-labelledby="tmpl-h" className="py-28 focus:outline-none sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 id="tmpl-h" className="font-serif text-3xl font-normal text-white sm:text-4xl">
                  Caption styles designed for retention
                </h2>
                <p className="mt-2 text-sm text-[#9da1ab]">
                  From condensed bold emphasis to kinetic sweep and editorial serifs. Live animated in your browser.
                </p>
              </div>
              <button onClick={() => setDialog(true)} className={`${btnPrimary} shrink-0`}>
                Browse in editor
              </button>
            </div>
          </div>

          {/* Full-Bleed Horizontal Reel */}
          <div className="mt-12 overflow-x-auto pb-6 hide-scrollbar">
            <div className="flex gap-6 px-4 sm:px-6 w-max mx-auto">
              {/* Style 1: Heavy Pop */}
              <div className="w-[260px] sm:w-[280px] flex flex-col gap-2">
                <CaptionFrame
                  templateId="heavy-pop"
                  text="The *FIRST* rule of editing"
                  imageSrc="/media/creator-reel-1.jpg"
                  badge="Heavy Pop"
                  width={280}
                  height={480}
                  y={0.76}
                  animate={true}
                  className="w-full"
                />
                <div className="px-1">
                  <p className="text-sm font-medium text-white">Heavy Pop</p>
                  <p className="text-xs text-[#9da1ab]">Condensed heavy caps with yellow keyword emphasis</p>
                </div>
              </div>

              {/* Style 2: Neon Glow */}
              <div className="w-[260px] sm:w-[280px] flex flex-col gap-2">
                <CaptionFrame
                  templateId="neon-glow"
                  text="Stop guessing what works"
                  imageSrc="/media/creator-reel-2.jpg"
                  badge="Neon Glow"
                  width={280}
                  height={480}
                  y={0.76}
                  animate={true}
                  className="w-full"
                />
                <div className="px-1">
                  <p className="text-sm font-medium text-white">Neon Glow</p>
                  <p className="text-xs text-[#9da1ab]">Luminous glow with clean contrast</p>
                </div>
              </div>

              {/* Style 3: Editorial Serif */}
              <div className="w-[260px] sm:w-[280px] flex flex-col gap-2">
                <CaptionFrame
                  templateId="editorial"
                  text="A quiet *clarity* in voice"
                  imageSrc="/media/creator-reel-1.jpg"
                  badge="Editorial"
                  width={280}
                  height={480}
                  y={0.76}
                  animate={true}
                  className="w-full"
                />
                <div className="px-1">
                  <p className="text-sm font-medium text-white">Editorial Serif</p>
                  <p className="text-xs text-[#9da1ab]">Refined serif display with gentle animation</p>
                </div>
              </div>

              {/* Style 4: Cove Italic */}
              <div className="w-[260px] sm:w-[280px] flex flex-col gap-2">
                <CaptionFrame
                  templateId="cove-italic"
                  text="When you find *focus*"
                  imageSrc="/media/creator-reel-2.jpg"
                  badge="Cove Italic"
                  width={280}
                  height={480}
                  y={0.76}
                  animate={true}
                  className="w-full"
                />
                <div className="px-1">
                  <p className="text-sm font-medium text-white">Cove Italic</p>
                  <p className="text-xs text-[#9da1ab]">High-contrast serif with italic keyword accent</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ STUDIO BANNER */}
        <section className="border-y border-white/[0.08] bg-[#121316] py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-serif text-3xl font-normal text-white sm:text-4xl">
                  Multi-clip timeline with trim handles and caption editing
                </h2>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#9da1ab]">
                  CutPilot does not force you to accept an automated output blindly. You review proposed segments, retime in and out points on a full multi-clip timeline, adjust caption timing word by word, and export directly from your browser.
                </p>
                <div className="mt-8">
                  <button onClick={() => setDialog(true)} className={btnPrimary}>
                    Open the editor
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0d10] shadow-xl">
                <img
                  src="/media/studio-screenshot.jpg"
                  alt="CutPilot studio editor interface"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ WHY LOCAL-FIRST (SPEC TABLE) */}
        <section id="compare" tabIndex={-1} aria-labelledby="cmp-h" className="py-28 focus:outline-none sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 id="cmp-h" className="font-serif text-3xl font-normal text-white sm:text-4xl">
                Why local-first
              </h2>
              <p className="mt-2 text-sm text-[#9da1ab]">
                Video processing happens on your device rather than a remote cloud server.
              </p>
            </div>

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

        {/* ------------------------------------------------------------------ TECHNICAL ARCHITECTURE & LIMITS */}
        <section id="privacy" tabIndex={-1} aria-labelledby="priv-h" className="border-t border-white/[0.08] bg-[#121316] py-28 focus:outline-none sm:py-36">
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
              <div className="rounded-xl border border-white/5 bg-[#0c0d10] p-6">
                <h3 className="text-sm font-semibold text-white">On-Device Processing</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Transcription, clip heuristic scoring, caption rendering, and export run directly in your browser tab. Your video file never touches an external server.
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0c0d10] p-6">
                <h3 className="text-sm font-semibold text-white">Whisper Model Cache</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  On first use, CutPilot downloads a compact quantized Whisper model (~40 MB) from Hugging Face and caches it in browser storage. Subsequent sessions run locally.
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0c0d10] p-6">
                <h3 className="text-sm font-semibold text-white">IndexedDB Session Storage</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Video data is kept in browser IndexedDB while editing choices are stored in localStorage. A page refresh will not erase your in-progress work.
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#0c0d10] p-6">
                <h3 className="text-sm font-semibold text-white">Real-Time MediaRecorder Export</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#9da1ab]">
                  Because video composition happens on an HTML5 canvas, export captures real-time playback. Keep the browser tab open while exporting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ FINAL CTA */}
        <section aria-labelledby="cta-h" className="py-28 text-center sm:py-36">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="cta-h" className="font-serif text-3xl font-normal text-white sm:text-5xl">
              Bring your footage. Review the proposed cut.
            </h2>
            <p className="mt-4 text-sm text-[#9da1ab] sm:text-base">
              No account creation. Your video stays private on your machine.
            </p>
            <div className="mt-8 flex justify-center">
              <button onClick={() => setDialog(true)} className={`${btnPrimary} h-12 px-8 text-sm`}>
                Start creating
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ FOOTER */}
      <footer className="border-t border-white/[0.08] bg-[#0c0d10] py-12">
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
