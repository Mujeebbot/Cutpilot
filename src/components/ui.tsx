import type { ReactNode } from 'react'
import { Icon } from './icons'
import type { IconName } from './icons'

const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'
export const btn = `${base} h-8 border border-line bg-ink-800 px-3 text-fg hover:bg-ink-700 disabled:hover:bg-ink-800`
export const btnPrimary = `${base} h-8 bg-accent-500 px-3.5 font-semibold text-white hover:bg-accent-400 disabled:hover:bg-accent-500`
export const btnDanger = `${base} h-8 border border-line bg-ink-800 px-3 text-red-300 hover:bg-red-950/60`
export const input = 'w-full rounded-md border border-line bg-ink-950 px-2.5 py-1.5 text-sm text-fg placeholder:text-dim hover:border-white/15 focus:border-accent-500 focus:outline-none'

export function IconButton({ icon, label, onClick, disabled, active, size = 'md', tone = 'ghost' }: {
  icon: IconName; label: string; onClick?: () => void; disabled?: boolean; active?: boolean; size?: 'md' | 'lg'; tone?: 'ghost' | 'accent'
}) {
  const dim = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'
  const look = tone === 'accent'
    ? 'bg-accent-500 text-white hover:bg-accent-400'
    : active ? 'bg-ink-700 text-white' : 'text-mute hover:bg-ink-700 hover:text-fg'
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className={`grid shrink-0 place-items-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${dim} ${look}`}>
      <Icon name={icon} size={size === 'lg' ? 20 : 17} />
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-mute">{label}</span>
      {children}
    </label>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-display text-[13px] font-semibold text-fg">{title}</h3>
      {children}
    </section>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-mute">{label}</span>
        <span className="tabular-nums text-fg">{Number(value.toFixed(2))}{suffix}</span>
      </div>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex h-8 items-center justify-between gap-3 rounded-md border border-line bg-ink-850 px-2.5 text-xs text-fg transition-colors hover:bg-ink-800">
      {label}
      <span className={`relative h-4 w-7 rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-ink-600'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${checked ? 'left-3.5' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 rounded-md border border-line bg-ink-850 px-2.5 transition-colors hover:bg-ink-800">
      <span className="text-xs text-fg">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[11px] uppercase tabular-nums text-dim">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      </span>
    </div>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void; label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md border border-line bg-ink-950 p-0.5">
      {options.map((o) => (
        <button key={String(o.value)} type="button" disabled={o.disabled} aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={`h-7 flex-1 rounded px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${o.value === value ? 'bg-ink-600 text-white' : 'text-mute hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
