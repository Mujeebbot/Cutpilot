import type { Clip } from '../types'
import { totalLength } from '../lib/sequence'
import type { Range } from '../lib/sequence'
import { fmt } from '../lib/util'
import { btn, btnPrimary, Section } from './ui'
import { Icon } from './icons'
import { TimeField } from './TimeField'

/** Sidebar tab: the clips that make up the edit, in playback/export order. */
export function DraftPanel(p: {
  clips: Clip[]; ranges: Range[]; selId: string | null; hasPlan: boolean; hasVideo: boolean; busy: boolean; planApplied: boolean
  onOpenDraft: () => void; onSelect: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void; onRemove: (id: string) => void
  onRange: (id: string, start: number, end: number) => void; onClear: () => void; onRegenCaptions: () => void
}) {
  const sel = p.clips.find((c) => c.id === p.selId)
  return (
    <div className="space-y-5">
      <Section title="First draft">
        <p className="text-xs leading-relaxed text-mute">
          {p.hasPlan ? (p.planApplied ? 'A draft plan is saved with this project. Reopen it to review or change which suggestions are used.' : 'A draft plan is ready to review.')
            : 'Describe the edit you want and CutPilot proposes clips from the transcript for you to accept or reject.'}
        </p>
        <button className={`${btnPrimary} w-full`} onClick={p.onOpenDraft} disabled={!p.hasVideo}><Icon name="sparkles" size={15} />{p.hasPlan ? 'Open draft review' : 'Prepare a first draft'}</button>
        {!p.hasVideo && <p className="text-[11px] text-dim">Open a video first.</p>}
      </Section>

      <Section title={`Edit sequence${p.clips.length ? ` · ${p.clips.length} clip${p.clips.length === 1 ? '' : 's'}` : ''}`}>
        {!p.clips.length ? (
          <p className="text-xs leading-relaxed text-mute">No clips yet. Until you apply a draft, the edit is the single trimmed range on the timeline.</p>
        ) : (
          <>
            <p className="text-xs text-mute">Plays and exports in this order. Length <span className="tabular-nums text-fg">{fmt(totalLength(p.ranges))}</span>. Clips point at time ranges of your original video; the file is never changed.</p>
            <ol className="space-y-1.5">
              {p.clips.map((c, i) => (
                <li key={c.id} className={`rounded-lg border p-2 ${c.id === p.selId ? 'border-accent-500/60 bg-accent-500/10' : 'border-line bg-ink-850'}`}>
                  <div className="flex items-center gap-2">
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => p.onSelect(c.id)} aria-pressed={c.id === p.selId}>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-ink-600 text-[11px] tabular-nums">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-fg">{c.label ?? `Clip ${i + 1}`}</span>
                        <span className="block text-[11px] tabular-nums text-mute">{fmt(c.start)}–{fmt(c.end)} · {fmt(c.end - c.start)}</span>
                      </span>
                    </button>
                    <button className="grid h-7 w-7 place-items-center rounded text-mute hover:bg-ink-700 hover:text-fg disabled:opacity-30" aria-label={`Move clip ${i + 1} earlier`} disabled={i === 0 || p.busy} onClick={() => p.onMove(c.id, -1)}><Icon name="up" size={15} /></button>
                    <button className="grid h-7 w-7 place-items-center rounded text-mute hover:bg-ink-700 hover:text-fg disabled:opacity-30" aria-label={`Move clip ${i + 1} later`} disabled={i === p.clips.length - 1 || p.busy} onClick={() => p.onMove(c.id, 1)}><Icon name="down" size={15} /></button>
                    <button className="grid h-7 w-7 place-items-center rounded text-mute hover:bg-red-950/60 hover:text-red-300 disabled:opacity-30" aria-label={`Remove clip ${i + 1}`} disabled={p.busy} onClick={() => p.onRemove(c.id)}><Icon name="trash" size={15} /></button>
                  </div>
                </li>
              ))}
            </ol>
            {sel && (
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-ink-850 p-2.5">
                <TimeField label="Clip start" value={sel.start} onCommit={(t) => p.onRange(sel.id, t, sel.end)} />
                <TimeField label="Clip end" value={sel.end} onCommit={(t) => p.onRange(sel.id, sel.start, t)} />
                <p className="col-span-2 text-[11px] leading-relaxed text-dim">Edges stop at neighbouring clips so footage is never repeated. You can also drag the handles on the timeline, or press I / O at the playhead.</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2">
              <button className={btn} onClick={p.onRegenCaptions} disabled={!p.hasPlan || p.busy} title={p.hasPlan ? 'Rebuild unedited draft captions for the current clips from the transcript' : 'Needs a draft transcript'}>Rebuild draft captions</button>
              <button className={btn} onClick={p.onClear} disabled={p.busy}>Remove clips, back to one trim</button>
            </div>
          </>
        )}
      </Section>
      <p className="text-[11px] leading-relaxed text-dim">Export records the clips one after another in real time. The picture holds for a moment at each cut while the video seeks, and audio is silent for that moment.</p>
    </div>
  )
}
