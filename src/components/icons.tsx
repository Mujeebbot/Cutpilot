const s = (d: string) => ({ d, fill: false })
const f = (d: string) => ({ d, fill: true })

const PATHS = {
  play: f('M8 5.5v13l11-6.5z'),
  pause: f('M7 5h3.6v14H7zM13.4 5H17v14h-3.6z'),
  undo: s('M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3'),
  redo: s('m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3'),
  download: s('M12 4v11m0 0-4-4m4 4 4-4M5 20h14'),
  save: s('M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6'),
  folder: s('M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
  media: s('M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4'),
  captions: s('M3 6h18v12H3zM7 11h4M7 14.5h2.5M13.5 11H17M12.5 14.5H17'),
  type: s('M5 7V5h14v2M12 5v14M9 19h6'),
  sparkles: s('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z'),
  plus: s('M12 5v14M5 12h14'),
  trash: s('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'),
  x: s('M6 6l12 12M18 6 6 18'),
  alert: s('M12 9v4M12 16.5v.01M12 3.5 2.5 20h19z'),
  upload: s('M12 16V4m0 0L8 8m4-4 4 4M5 20h14'),
  markIn: s('M6 4v16M10 12h9m-4-4 4 4-4 4'),
  markOut: s('M18 4v16M14 12H5m4-4-4 4 4 4'),
  reset: s('M4 12a8 8 0 1 0 3-6.2M4 4v4h4'),
  loop: s('M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4'),
  star: s('M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z'),
  text: s('M4 6h16M4 12h16M4 18h10'),
  keyboard: s('M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10'),
  check: s('M5 12.5l4.5 4.5L19 7.5'),
  search: s('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4'),
  film: s('M4 5h16v14H4zM10 9.5v5l4.5-2.5z'),
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const p = PATHS[name]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={p.fill ? 'currentColor' : 'none'} stroke={p.fill ? 'none' : 'currentColor'}
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={p.d} />
    </svg>
  )
}
