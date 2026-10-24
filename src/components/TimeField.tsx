import { useEffect, useState } from 'react'
import { parseTime } from '../lib/sequence'
import { fmt } from '../lib/util'

/** Time entry that accepts "83.5", "1:23.5" or "0:01:23" and commits on Enter/blur. Invalid text is flagged, never silently changed. */
export function TimeField({ label, value, onCommit, step = 0.25 }: { label: string; value: number; onCommit: (t: number) => void; step?: number }) {
  const [text, setText] = useState(fmt(value))
  const [bad, setBad] = useState(false)
  useEffect(() => { setText(fmt(value)); setBad(false) }, [value])
  const commit = () => {
    const t = parseTime(text)
    if (t === null) { setBad(true); return }
    setBad(false)
    if (Math.abs(t - value) > 1e-6) onCommit(t)
    else setText(fmt(value))
  }
  const nudge = 'grid h-8 w-7 place-items-center rounded-md border border-line bg-ink-800 text-sm text-fg hover:bg-ink-700 disabled:opacity-40'
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs text-mute">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={nudge} aria-label={`${label} earlier by ${step} seconds`} onClick={() => onCommit(Math.max(0, value - step))}>−</button>
        <input aria-label={label} aria-invalid={bad} value={text} inputMode="decimal" spellCheck={false}
          onChange={(e) => { setText(e.target.value); setBad(false) }} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
          className={`h-8 w-full min-w-0 rounded-md border bg-ink-950 px-2 text-center text-sm tabular-nums text-fg focus:outline-none ${bad ? 'border-red-400' : 'border-line focus:border-accent-500'}`} />
        <button type="button" className={nudge} aria-label={`${label} later by ${step} seconds`} onClick={() => onCommit(value + step)}>+</button>
      </div>
      {bad && <p className="mt-1 text-[11px] text-red-300" role="alert">Use a time like 12.5 or 1:12.5</p>}
    </div>
  )
}
