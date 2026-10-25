/**
 * CutPilot logo mark — inline SVG React component.
 *
 * Visual identity:
 * - Playhead razor: An NLE timeline playhead slicing down into an active video play symbol.
 * - Split clips: Left piece represents source footage (CutPilot signature violet),
 *   right piece represents the new AI draft cut (soft lavender).
 * - Palette: Charcoal / graphite container (#121316, #181A20), restrained violet (#8B7CF6),
 *   lavender (#C4BBFF), and soft white (#EDE9FE).
 *
 * Self-contained: works on dark and light surfaces, scales cleanly at any size.
 */

interface LogoProps {
  /** Size in pixels (width & height). Defaults to 32. */
  size?: number
  className?: string
}

export function LogoMark({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="CutPilot logo"
      role="img"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="cp-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#191B21" />
          <stop offset="100%" stopColor="#0F1014" />
        </linearGradient>
        <linearGradient id="cp-left" x1="9" y1="8" x2="14" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9C8EFF" />
          <stop offset="100%" stopColor="#7B68EE" />
        </linearGradient>
        <linearGradient id="cp-right" x1="16" y1="12" x2="24" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4CCFF" />
          <stop offset="100%" stopColor="#AEA0FF" />
        </linearGradient>
      </defs>

      {/* Dark charcoal tile container */}
      <rect width="32" height="32" rx="7" fill="url(#cp-bg)" />
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="6.25" stroke="#2B2F38" strokeWidth="1.25" />

      {/* Left timeline clip (Source) */}
      <path
        d="M 9.5 9 C 9 9.3 8.75 9.8 8.75 10.4 V 21.6 C 8.75 22.2 9 22.7 9.5 23 L 14 20.8 V 11.2 Z"
        fill="url(#cp-left)"
      />

      {/* Right timeline clip (Cut / Draft) */}
      <path
        d="M 16 11.9 L 23.5 15.4 C 24.1 15.7 24.1 16.3 23.5 16.6 L 16 20.1 Z"
        fill="url(#cp-right)"
      />

      {/* Playhead marker & needle at the cut point */}
      <path d="M 12.5 4.5 H 17.5 V 7 L 15 9.2 L 12.5 7 Z" fill="#EDE9FE" />
      <line
        x1="15"
        y1="9.2"
        x2="15"
        y2="23"
        stroke="#EDE9FE"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.95"
      />
    </svg>
  )
}

/**
 * LogoLockup: Combines LogoMark and the "CutPilot" wordmark.
 */
export function LogoLockup({
  size = 32,
  className = '',
  textClassName = 'text-lg text-bone',
}: LogoProps & { textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className={`font-title font-extrabold tracking-tight ${textClassName}`}>
        CutPilot
      </span>
    </span>
  )
}
