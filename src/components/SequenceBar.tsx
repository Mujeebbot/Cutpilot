import type { Clip } from '../types'
import { sequenceToSource, sourceToSequence, totalLength } from '../lib/sequence'
import type { Range } from '../lib/sequence'
import { fmt } from '../lib/util'

/**
 * The edit in OUTPUT order: clips laid end to end, widths proportional to their length, with the playhead mapped
 * from source time. This is the one place where reordering is visible; the main timeline stays in source time.
 */
export function SequenceBar({ clips, ranges, time, selId, disabled, onSelect, onSeek }: {
  clips: Clip[]; ranges: Range[]; time: number; selId: string | null; disabled: boolean
  onSelect: (id: string) => void; onSeek: (sourceTime: number) => void
}) {
  const total = totalLength(ranges)
  if (!clips.length || total <= 0) return null
  const pos = sourceToSequence(ranges, time)
  const click = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    const r = e.currentTarget.getBoundingClientRect()
    const { t, index } = sequenceToSource(ranges, ((e.clientX - r.left) / r.width) * total)
    if (index >= 0) { onSelect(clips[index].id); onSeek(t) }
  }
  return (
    <div className="flex h-8 sm:h-9 items-center gap-2 sm:gap-3 border-t border-line bg-ink-900 px-2 sm:px-4" aria-label="Edit sequence">
      <span className="hidden sm:inline w-14 shrink-0 text-xs text-mute">Sequence</span>
      <div className={`relative h-5 sm:h-6 min-w-0 flex-1 cursor-pointer select-none overflow-hidden rounded-md bg-ink-850 ${disabled ? 'opacity-60' : ''}`} onPointerDown={click}>
        <div className="flex h-full gap-px">
          {clips.map((c, i) => (
            <div key={c.id} title={`${i + 1}. ${c.label ?? 'Clip'} — source ${fmt(c.start)}–${fmt(c.end)}`} style={{ width: `${((c.end - c.start) / total) * 100}%` }}
              className={`flex h-full min-w-[3px] items-center overflow-hidden whitespace-nowrap px-1 sm:px-1.5 text-[9px] sm:text-[10px] ${c.id === selId ? 'bg-accent-500 text-white' : 'bg-ink-600 text-fg'}`}>
              {i + 1}
            </div>
          ))}
        </div>
        {pos !== null && <div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{ left: `${(pos / total) * 100}%` }} />}
      </div>
      <span className="hidden sm:inline w-[120px] shrink-0 text-right text-xs tabular-nums text-mute">{pos !== null ? fmt(pos) : '–:––'}<span className="text-dim"> / {fmt(total)}</span></span>
    </div>
  )
}
