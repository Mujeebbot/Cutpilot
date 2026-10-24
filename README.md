# CutPilot

Browser video editor: trim, caption with a 30-template library, transcribe locally (Whisper), export a real video with captions burned in.

## Run (Windows PowerShell, Node.js 20.19+)

    cd cutpilot
    npm install
    npm run dev

Open http://localhost:5173 in Chrome or Edge.

## Notes
- Export is real-time (a 30 s clip takes ~30 s) via canvas + MediaRecorder; keep the tab visible. MP4 where supported, else WebM.
- Preview and export share one renderer (`src/lib/render.ts`) and one compositor (`src/lib/compose.ts`).
- Transcription downloads a Whisper model (~40 MB) from Hugging Face on first use; no API key.
- Autosave stores captions/style/trim/clips/canvas/brief in localStorage. The video itself and the draft plan are kept in IndexedDB so a refresh at `/editor` restores them (nothing is uploaded). "Save project" writes a JSON backup (not the video).
- Caption fonts are open-source Google Fonts (SIL OFL) loaded from fonts.googleapis.com.

## V4: landing page and AI first-draft workflow

Routes: `/` is the landing page, `/editor` is the studio (tiny History-API router in `src/lib/router.tsx`, no new dependency).
`vercel.json` rewrites every path to `index.html`; `vite dev` / `vite preview` already do this.

**Flow:** Start creating -> choose video, name, brief, format (`NewProjectDialog`) -> editor opens the draft screen
(`DraftScreen`) -> transcribe on device (or reuse existing captions) -> review suggested clips (accept / reject / retime / preview)
-> Apply -> clips are the edit: preview, timeline, sequence bar, captions and export all follow them.

**Edit model** (`src/lib/sequence.ts`): `Clip { id, start, end }` are ranges of the *original* video in source time; array order is
playback/export order. With no clips the single `trim` is the edit, exactly as before. Playback (`advance`), export (`exportVideo(ranges)`),
the length display and the timeline all derive from `sequenceRanges(clips, trim)`. Captions stay in source time.

**Draft engine** (`src/lib/draft/`): `brief.ts` (rule-based brief parsing), `plan.ts` (sentences, pauses from word gaps, explainable
scoring, clip windows), `apply.ts` (accept/reject/retime with overlap protection, clip + caption building), `broll.ts` (text-only ideas).
Words/timestamps are Whisper's; selection and ranking are heuristics and the UI says so.

**Transcription** now runs in a Web Worker (`transcribe.worker.ts` -> `transcribe.engine.ts` -> `transcribe.core.ts`), so the page stays
responsive and a job can be cancelled. Same Whisper models and the same word-timestamp/segment fallback as before.

**Tests:** `npm test` (vitest) covers sequence/time-range logic, brief parsing, planning, apply/captions and the Whisper post-processing.

### Known limits
- Suggestions are keyword/structure heuristics, not semantic understanding. B-roll ideas are text only.
- Export is real-time MediaRecorder. At each cut between clips the picture holds and audio is silent for the duration of a seek (measured ~0.5 s per cut in Firefox).
- The editor is desktop-first (min width 920 px); the landing page and project dialog are responsive.
- Very large videos (> ~500 MB) may fail while decoding audio; the draft screen warns about this.
- Pause detection uses gaps between word timestamps, not audio levels.
