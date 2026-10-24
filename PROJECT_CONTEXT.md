# CutPilot — Project Context

> This file preserves the agreed vision, feature status, seven-group implementation plan,
> acceptance tests, design decisions, and scope boundary produced during the V4 planning session.
> It is the single source of truth for continuing development in this repository.
>
> **Original conversation:** Antigravity session `41dbd506-2f00-446a-8b13-0625702ddc93` (2026-10-23)
> **Original artifacts:** `cutpilot-audit.md` and `cutpilot-revised-plan.md` in the brain folder above.
> Do not shorten or replace the content below with a summary.

---

## Vision and guiding constraints

- **Free, local-first.** No paid APIs. No data leaves the device. Whisper runs on-device via Transformers.js.
- **Honest UX.** No fake controls, no unverifiable claims. Every limitation is disclosed in the UI.
- **Desktop-first editor.** Minimum 920 px width. Landing page and project dialog are responsive.
- **Preserve every working feature** listed below. Do not rebuild or replace a component unless there is specific evidence it needs replacing.
- **Deadline:** October 26, 2026 (original deadline for the 7-group plan).

---

## CutPilot — Full Codebase Audit
**Date:** 2026-10-23 · **Deadline:** 2026-10-26 (3 days)

---

### A. Version & Git State

| Item | Finding |
|---|---|
| `package.json` version | `0.1.0` (no semantic bump applied) |
| App name in code | `cutpilot` |
| Project save format | `version: 3` (in `saveProject()`) |
| Autosave key | `cutpilot.autosave.v1` |
| Folder name | `cutpilot-v4-test` — suffix suggests V4 intent |
| Git repo | **None** — `fatal: not a git repository`. No `.git` folder exists. There is no commit history. |

> [!WARNING]
> The project has **no version control at all**. There is no undo history, no branch isolation, and no rollback if a change breaks the app. Before any code changes, the user should run `git init && git add -A && git commit -m "audit baseline"`.

**Conclusion:** Cannot confirm "V4" from the code itself. The package version is 0.1.0. The only "V4" signal is the folder name. Feature-wise this is a mature early-access build with a complete draft/review/export pipeline.

---

### B. Design Skill (Emil Kowalski `emil-design-eng`)

**Not installed.** A recursive search of `C:\Users\DELL\.gemini` for `*emil*` and `*design-eng*` returned no results. No `SKILL.md` matching that skill exists in any plugins or skills directory. The science plugin skills are present, but no design-engineering skill is loaded.

No Emil Kowalski design guidance will be applied. Design decisions in this audit are based on the product requirements and general professional editing-tool standards.

---

### C. Feature Status

#### ✅ Working (verified in source)

| Feature | Evidence |
|---|---|
| **Landing page** | `Landing.tsx` — full hero, how-it-works (3 steps), features (available/planned), limits & privacy, CTA, footer, mobile nav, hash-scroll, "Continue" link |
| **Separate editor route** | `router.tsx` — `/` → Landing, `/editor` → App; uses History API push-state; Vite dev + `vercel.json` serve index.html for both |
| **New project dialog** | `NewProjectDialog.tsx` — drag-and-drop + file picker, video probe (duration/dims/codec validation), project name, brief textarea with live goal preview, format picker (9:16/1:1/16:9), modal a11y (Esc, focus trap, return focus) |
| **Video upload & session persistence** | `session.ts` — IndexedDB stores video file + brief; localStorage autosaves captions/style/trim/canvas/clips; survives refresh |
| **Autosave** | Debounced 1.5 s writes to localStorage; flush on `pagehide`; status indicator in header (dot + timestamp); quota-exceeded handled |
| **Recover session** | `RecoverCard` shown when autosave data exists and no video loaded |
| **Local Whisper transcription** | `transcribe.ts` — Transformers.js via Web Worker; fallback to main thread; 3 models (tiny-en, tiny, base-en); word-level timestamps preferred, segment fallback; progress bar; abort/cancel |
| **Project brief parsing** | `brief.ts` — pattern-matches duration, format, hook, pauses, captions, density, emphasis, focus terms; shows matched text; transparent ("this is pattern matching, not comprehension") |
| **AI Draft (first-draft planner)** | `plan.ts` — full rule-based pipeline: sentence segmentation, pause detection from word gaps, hook/quality scoring (10+ rules), window growing, padding, "best fit" set for target length; displayed with reason badges |
| **Draft review screen** | `DraftScreen.tsx` — shows each suggestion with score, reasons, transcript excerpt; accept/reject toggles; TimeField edit for start/end; preview-range video player; B-roll ideas panel; rebuild with new target; cut-long-pauses toggle; hook-first toggle; captions toggle; "Accept the best fit" bulk action; clear choices; apply to project |
| **Accept/reject affects project** | `apply.ts` → `buildClips()` creates Clip array from accepted suggestions; `applyPlan()` sets clips + trim + canvas aspect + generates captions; rejected suggestions are filtered out |
| **Timeline** | `Timeline.tsx` — video filmstrip (up to 40 frames, generated async), trim handles with snapping (Alt to disable), clip handles, caption drag (move/resize left/right), time ticks (adaptive step), playhead, zoom (+/−/Fit, Ctrl+scroll), clip gap overlay, auto-scroll playhead |
| **Sequence bar** | `SequenceBar.tsx` — clips in playback order as coloured segments; click-to-seek |
| **Clip editing (DraftPanel)** | Clip list, move up/down, remove, TimeField for start/end, "Rebuild draft captions" for current clips, "Remove clips, back to one trim" |
| **Caption grouping** | `captions.ts` `groupWords()` — breaks on `n` words OR >0.8 s gap; `regroup()` re-chunks existing captions |
| **Caption density control** | UI: 1 / 2 / 3 word segmented control (in both CaptionsPanel and AiPanel); template suggests a density; `changeDensity()` asks before clobbering hand-edited captions |
| **Caption styling — rich** | `Panels.tsx` `StylesPanel` — font (16 faces), weight, size (24–200 px), letter spacing, uppercase, alignment, text colour, word highlight + box, auto-emphasis, keyword font/weight/italic/scale/box, outline colour/width, shadow, glow + colour, background colour/opacity/radius/padding, 6 animations (none/pop/bounce/slide/fade/karaoke), speed, intensity |
| **Scope: all vs. selected** | Per-caption style overrides; "Use global" reverts; `effScope` logic in App.tsx |
| **Templates gallery** | `templates.ts` — **34 templates** across 13 categories; searchable; filterable by category chip; hover animates live; selected indicator |
| **Caption animation** | `render.ts` — karaoke fill, pop, bounce, slide, fade; same renderer used for preview and export |
| **Preview (Stage)** | `Stage.tsx` — canvas overlay on `<video>`; captions drawn with same `drawCaption`; click-to-select; drag to reposition (snaps to centre); canvas aspect + background (blur/solid) |
| **Canvas formats** | source / 9:16 / 1:1 / 16:9; blur or solid background fill; header select and media panel segmented |
| **Undo/redo** | Structural-sharing snapshot history (past/future/last, 100-step cap, 450 ms debounce); Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y; header buttons with disabled state |
| **Export** | `exporter.ts` — real-time MediaRecorder; plays each clip range in order; canvas+audio stream; MP4 (H.264) preferred, WebM fallback; progress bar; cancel; correct filename |
| **SRT import/export** | `srt.ts`; SRT download button; paste or file import |
| **Emoji suggestions** | `suggestEmojis()` — keyword list; checkbox picker; applied to captions |
| **Keyboard shortcuts** | Space, ←/→ (frame/sec), J/K/L, I/O, Del/Backspace, Ctrl+Z/Y, Ctrl+scroll, ?, Esc |
| **B-roll ideas** | `broll.ts` — text-only ideas based on words in clip; labelled "text suggestions only"; honest about limitations |
| **Conversational editing assistant** | **Not present** — no chat/AI-assistant panel exists |
| **Project file save/load** | JSON download (`.cutpilot.json`); re-open to restore captions/style/trim/clips |

#### ⚠️ Partial / Needs Work

| Feature | Issue |
|---|---|
| **Caption density — flexibility** | UI is locked to exactly 1, 2, or 3 words. The requirement calls for "flexible grouping beyond only 1, 2, or 3 words." The underlying `groupWords(n)` already accepts any integer, so a custom-number input could work. |
| **Words-per-caption from brief** | `parseBrief` only recognises "one/two/three word captions." It will not parse "four words" or any number above 3 because `wordsPerCaption` is typed `1|2|3|null`. |
| **Export quality** | Hard-coded 8 Mbps video bitrate, no resolution toggle. For 9:16 at 1080×1920 this is borderline. No user control. |
| **Export gap artefact** | The code itself warns: "picture holds … audio is silent" at each clip boundary during seek. This is known but not resolved; multi-clip exports will have audible gaps. |
| **B-roll** | Text ideas only; no actual footage finding, generation, or insertion. The landing page is honest about this ("text ideas only"), but the requirement asked for "useful B-roll suggestions" — what's there is a basic keyword list. |
| **Conversational AI assistant** | Required by product spec; completely absent. |
| **Caption font size control** | Exists (24–200 px slider). However there is no independent control for keyword font size in *absolute* px — only a `kwScale` multiplier relative to the base size. |
| **Template count vs. requirement** | 34 templates exist, which is substantial. The requirement says "substantial searchable collection." This is met, though originality disclaimer is important. |
| **Drag-and-drop on timeline** | Caption drag (move + left/right resize) works. Clip drag on timeline does **not** exist — clips are repositioned by TimeField or the sequence-bar click-to-seek approach. No drag-to-reorder on timeline for clips. |
| **Clip split** | Not implemented (noted in keyboard shortcuts help text: "There is no clip-splitting shortcut yet"). |
| **Trimming UI feedback** | In/Out buttons work. But there's no numeric display of the trim handles' timestamps alongside them on the timeline (only the playback bar shows `time / duration`). |
| **Auto-emphasis limitations disclosure** | Present in the UI. Good. But `autoKeywords` only picks at most one word per caption — could frustrate users expecting richer emphasis. |

#### ❌ Missing (per requirements)

| Feature | Status |
|---|---|
| **Conversational editing assistant** | Completely absent. No chat panel, no natural-language edits. |
| **Flexible caption grouping (> 3 words)** | UI enforces 1/2/3 only. |
| **Independent font size for keywords** | Only relative `kwScale` multiplier, not absolute px. |
| **Advanced B-roll** | Text-only at present (as stated on landing page). |
| **"Roadmap for advanced editing features"** | Nothing surfaced in the UI. |
| **Git version control** | No `.git` folder. |

#### 🧪 Testing Gaps

| Area | Gap |
|---|---|
| **Export** | No automated test for the export pipeline (uses MediaRecorder, hard to unit-test). |
| **Timeline drag interactions** | No tests for the pointer drag handlers. |
| **Transcription worker** | `transcribe.core.test.ts` and `transcribe.core.ts` exist — need to verify they cover the main paths. |
| **Sequence logic** | `sequence.test.ts` exists — good. |
| **Draft plan** | `plan.test.ts` exists. |
| **Apply draft** | `apply.test.ts` exists. |
| **Brief parsing** | `brief.test.ts` exists. |
| **Session (IndexedDB)** | No tests — hard to test in jsdom, but critical path. |
| **Caption grouping edge cases** | `captions.ts` not directly tested (no `captions.test.ts`). |
| **Render / animation** | No visual regression tests. |

---

### D. Most Important Design Problems

#### D1. Density control is too rigid
The requirement explicitly calls for "flexible caption grouping beyond only 1, 2, or 3 words." The 3-option segmented control is the most visible manifestation of this constraint. Many use cases need 4–5 words (podcast-style), or sentence-level grouping.

#### D2. No conversational editing assistant
This is a named product requirement. Its absence is the largest feature gap. Adding even a minimal assistant (natural-language → supported project operations) is a significant build.

#### D3. Export audio gap at clip boundaries
Multi-clip exports pause playback to seek, creating a silent frame freeze between every clip. This is an inherent MediaRecorder limitation with the current approach, but it's a real quality problem for the core deliverable.

#### D4. No git — no safety net
With a 3-day deadline and multiple required changes, working without version control is risky. Any mistake cannot be rolled back.

#### D5. "Density" in brief only supports 1–3 words
`parseBrief` maps "one/two/three" → `1|2|3|null` and the type forbids 4+. If the density control is extended, the brief parser must follow.

#### D6. Template gallery: no preview before applying
Hovering previews the animation on the thumbnail, but the creator cannot see a live preview on their own caption text before committing. A "try on selection" mode would help.

#### D7. Clip-gap audio artefact not disclosed in export UI
The export modal says "Keep this tab visible until it finishes" but does not warn about the brief audio gap at each cut. This sets incorrect expectations.

#### D8. Missing undo/redo scope
Undo covers captions, style, trim, canvas, clips. It does **not** cover project name, brief text, or plan decisions — these are lost on undo.

#### D9. Editor requires minimum 920 px width
`min-w-[920px]` on the root div means the editor is broken on smaller screens. This is acknowledged ("desktop-first") but produces a completely unusable horizontal scroll on tablets or smaller monitors, with no warning shown.

#### D10. No "new project" flow from inside the editor
Once in the editor, there is no "New project" button. Creators must navigate back to `/` and use "Start creating." The header link goes to Landing but the project in memory survives — which is good — but the path is non-obvious.

---

## CutPilot — Revised Implementation Plan (Seven Groups)
**Prepared:** 2026-10-23 · **Deadline:** 2026-10-26 · **Awaiting approval before any code change**

---

> [!IMPORTANT]
> No file has been modified. No packages have been installed. No Git commands have been run.
> This document is a plan only. Execution begins only after explicit approval.

---

### Guiding constraints (repeated from the brief)

- Free, local-first, no paid APIs.
- No fake controls or unverifiable claims.
- Preserve every working feature listed in the audit.
- Do not rebuild or replace a component unless there is specific evidence it needs replacing.
- Deadline: October 26, 2026.

---

## Work Group 1 — Git baseline & project protection

### Goal
Create a recoverable snapshot before any code is touched. Every subsequent group is committed separately so any individual change can be reverted without losing others.

### Files / components that change
- `.git/` (created fresh — no project file is modified)
- `.gitignore` (one new file)

### Existing behaviour that must be preserved
Everything. This group makes zero changes to source code.

### What will be done
1. `git init` in `c:\dev\CutPilot\cutpilot-v4-test`.
2. Create `.gitignore` (node_modules, dist, .env).
3. `git add -A && git commit -m "chore: audit baseline — no source changes"`.
4. One additional tagged commit after each subsequent group merges: e.g. `git tag g2-export`, `git tag g3-captions`, etc., so any group can be reverted independently.

### Dependencies on other groups
None — must be completed first.

### Acceptance tests
- `git log` shows exactly one commit with the audit-baseline message.
- `git status` shows clean working tree.
- All existing source files are byte-for-byte identical to their pre-plan state.

### Effort & risk
**5 minutes. Zero risk.** No source file is touched.

### Deadline feasibility
Immediate — completes in minutes.

---

## Work Group 2 — Export reliability (audio gaps at clip boundaries)

### Goal
Reduce or eliminate the audible silent-frame gap that occurs when the MediaRecorder-based exporter pauses, seeks, and resumes between consecutive clips. Be honest in the UI about any remaining limitation.

### Root cause (diagnosed from `exporter.ts`)
The export loop runs:
```
video.pause() → await seek(video, r.start) → draw() → await video.play()
```
During the seek the `MediaElementAudioSourceNode` generates no audio (the element is paused and seeking). The `canvas.captureStream(30)` continues recording canvas frames so the picture holds — but the audio track carries silence for the duration of the seek (typically 50–400 ms on a local file). The result is a visible freeze and an audible silence at every cut.

### Approach (three-part fix)

**Part A — Audio fade at clip boundaries (primary fix)**
The `getGraph()` helper already wires the audio: `MediaElement → AudioContext → MediaStreamDestination`. Add a `GainNode` between the source and the destination. At the end of each clip ramp gain to zero over ~80 ms before pausing the video; after seek ramp back to 1 over ~80 ms before and during play. This masks the silence with a brief fade-out/in that sounds intentional rather than broken. The gain ramp uses the Web Audio API's `linearRampToValueAtTime()` — no new dependency.

**Part B — Continuous canvas draw during seek (secondary fix)**
Currently `draw()` is called once after seek completes. Replace that single call with a `requestAnimationFrame` loop that runs throughout the seek wait, so the canvas always shows the fresh first frame of the new clip rather than holding the last frame of the old one. This eliminates the visual freeze.

**Part C — Export modal disclosure (honesty fix)**
Update the export modal copy to say: *"A brief audio fade occurs at each cut between clips — this is inherent to browser-based real-time recording. For seamless cuts, keep clips long or minimise the number of cuts."* This is accurate and prevents user confusion when a fade is still perceptible.

### Files that change
| File | What changes |
|---|---|
| `src/lib/exporter.ts` | Add `GainNode` to `getGraph()`; ramp gain at boundaries; rAF loop during seek |
| `src/App.tsx` | Export modal `<p>` copy only (the disclosure text) |

### Existing behaviour that must be preserved
- Single-range (no clips) export must work exactly as before — no gain ramp applied when `ranges.length === 1`.
- Multi-clip export still records canvas + audio as one continuous MediaRecorder blob.
- The abort/cancel path must still work.
- Progress reporting (`onProgress`) must still be called correctly.
- The `getGraph` WeakMap cache must still prevent double-wrapping the audio element.
- MP4 preference, WebM fallback, and the `videoBitsPerSecond: 8_000_000` rate stay unchanged.

### Dependencies on other groups
Only Group 1 (must have a baseline commit before editing any file).

### Acceptance tests
1. Export a single-range trim → file downloads, plays correctly, no change from current behaviour.
2. Export a 3-clip edit → audible smooth fade at each cut (no hard silence), canvas does not freeze at cuts.
3. Cancel during export → blob is discarded, video returns to previous position, no hanging AudioContext.
4. After export, preview still plays and the gain is back at 1 (no permanently silent playback).
5. On a browser that only supports WebM → WebM file downloads correctly (no regression).

### Effort & risk
**~3 hours. Medium risk** on the audio path (Web Audio API gain scheduling can interact with the MediaRecorder in unexpected ways). Mitigation: keep the old `draw()` call as a fallback, and only add the gain ramp when `ranges.length > 1`. Write the gain ramp in a separate helper so it can be disabled with a single flag if something breaks.

### Deadline feasibility
Yes — the change is localised to one file plus one line of copy.

---

## Work Group 3 — Complete caption system

### Goal
1. Extend caption density beyond 1/2/3 words to support any value 1–10.
2. Add an independent absolute font-size control for keywords (instead of only a relative `×` multiplier).
3. Update everywhere these values are used so the changes are self-consistent.

### Sub-task 3A — Flexible caption grouping

**What changes:**

| File | Change |
|---|---|
| `src/types.ts` | `type Density = 1 \| 2 \| 3` → `type Density = number` (validated at min 1, max 10 at runtime) |
| `src/App.tsx` | `changeDensity` accepts `number`; state type updated; `Snap` type updated |
| `src/components/Panels.tsx` — `CaptionsPanel` | Replace the 3-button `<Segmented>` with a hybrid: keep 1/2/3 pills for the common cases, add a small `<input type="number" min="1" max="10">` labelled "Custom" that becomes active when the value is outside 1–3 |
| `src/components/Panels.tsx` — `AiPanel` | Same hybrid control |
| `src/lib/draft/brief.ts` | Extend `parseBrief` to recognise "four"/"five"/"six"/"4"/"5"/"6" words-per-caption; update `wordsPerCaption` type from `1\|2\|3\|null` to `number\|null` |
| `src/lib/draft/plan.ts` | `BriefGoals.wordsPerCaption` type widens; `goals.wordsPerCaption` passed to `captionsForRanges` — already accepts any number |
| `src/lib/draft/apply.ts` | `captionsForRanges` signature: `perCaption: 1\|2\|3` → `perCaption: number` |
| `src/lib/captions.ts` | `groupWords` already accepts `number` — no change needed |
| `src/lib/sequence.test.ts` | No change needed |

**Preserved behaviour:**
- Existing projects with density 1/2/3 load and operate identically.
- The "Regroup" confirm dialog still fires when hand-edited captions exist.
- Template `suggestedWords` field is still `1|2|3` (templates don't need to change).
- The `regroup` call in `changeDensity` passes the new density correctly.

### Sub-task 3B — Independent keyword font size

The current `kwScale` is a multiplier (`0.7×` to `2.2×`) relative to `st.size`. This cannot produce "keyword text at 64 px when body is 88 px" without knowing the body size. Add an optional `kwSize: number | null` field to `CaptionStyle`.

| File | Change |
|---|---|
| `src/types.ts` — `CaptionStyle` | Add `kwSize: number \| null` (null = use `kwScale`, for backwards compatibility) |
| `src/types.ts` — `DEFAULT_STYLE` | `kwSize: null` |
| `src/lib/captions.ts` — `normalizeStyle` | Accept and normalise `kwSize` |
| `src/lib/render.ts` — `drawCaption` | `const kwPx = st.kwSize != null ? st.kwSize * s : px * st.kwScale` |
| `src/components/Panels.tsx` — `StylesPanel` customize tab | In the **Emphasis** section, replace the single `kwScale` slider with two fields: (a) a segmented "Use relative size" / "Use fixed size" toggle, (b) when relative: existing `kwScale` slider unchanged; when fixed: a new `kwSize` numeric slider (24–200 px range, same as `size`) |
| `src/lib/session.ts` | No change — project file is schema-forwards-compatible (`kwSize` is simply absent in old saves, `normalizeStyle` sets it to null) |

**Preserved behaviour:**
- All 34 existing templates: `kwSize` is absent → `null` → `kwScale` path used → identical rendering.
- Projects saved without `kwSize` reload correctly via `normalizeStyle`.
- `kwScale` slider still works when relative mode is selected.
- Template thumbnails continue to render identically.
- Export uses the same `drawCaption` function — no separate export path.

### Dependencies on other groups
Group 1 only.

### Acceptance tests — Group 3
1. Set density to 5 → transcription and regrouping produce 5-word captions. Confirm dialog fires if hand-edited captions exist.
2. Brief text "five word captions" → `parseBrief` returns `wordsPerCaption: 5`; a draft built from it groups into 5-word captions.
3. Existing project with density=2 loads; density control shows "2"; captions unchanged.
4. Select "fixed size 64 px" for keywords → preview shows keywords at 64 px regardless of body size slider.
5. Select "relative 1.5×" → keywords render at 1.5× the body size as before.
6. Save project with kwSize=64 → reload → kwSize preserved.
7. Load an old project (no kwSize field) → renders identically to before (no regressions on templates).

### Effort & risk
**~3 hours. Low risk.** All changes are additive to existing type structures and use existing render infrastructure. The biggest risk is the Panels UI change — keep it surgical: touch only the two relevant control sections.

### Deadline feasibility
Yes — Group 3 is self-contained and parallelisable with Group 2 after the baseline commit.

---

## Work Group 4 — Design audit and refinement

### Goal
Review and improve visual consistency, information hierarchy, and interaction quality across the landing page, editor shell, timeline, and template gallery — without rebuilding any working component. Apply Emil Kowalski's design-engineering principles **if the skill can be installed**; otherwise apply equivalent principles (purposeful reduction, meaningful micro-interactions, high-contrast legibility, spatial consistency) directly.

### Sub-task 4A — Emil Kowalski skill investigation
Before any design changes, attempt to install the `emil-design-eng` skill:
1. Check `C:\Users\DELL\.gemini\config\skills\` and `C:\Users\DELL\.gemini\antigravity\builtin\skills\` for any installation mechanism.
2. If the skill is available in a registry or as a downloadable package, install it and read its `SKILL.md`.
3. If the skill cannot be located or installed, proceed with the principles below from public knowledge of Emil's writing (purpose-driven constraints, honest UX, restrained animation, typographic clarity, and component APIs that prevent misuse).
4. Report the outcome to the user before making any design changes in this group.

> [!NOTE]
> This investigation will be the first action in Group 4. If the skill is not installable, that is reported and design work proceeds without it. No design changes happen until this check is complete.

### Sub-task 4B — Design audit findings and targeted changes

Based on the audit, the following specific issues are candidates for refinement. Each will be verified visually before a fix is written. **No working component will be replaced.**

**Landing page (`Landing.tsx`, `EditorMock.tsx`, `CaptionFrame.tsx`, `index.css`)**
| Issue | Candidate fix |
|---|---|
| Three section anchors (How it works, Features, Limits) use `tabIndex={-1}` + `focus()` for scroll-target a11y, which is correct but produces a visible focus ring on the section header on keyboard navigation — jarring for mouse users | Use `focus-visible` CSS to suppress the ring for mouse users |
| Hero `cut-in` CSS animation class is referenced but not in `index.css` — needs verification | Confirm it exists in Tailwind or add a minimal keyframe |
| `EditorMock.tsx` (the hero illustration) is a static component — verify it renders correctly and add a subtle entrance animation if it currently appears without one | Add a single `fade` or `slide` animation consistent with the landing page tone |
| Feature cards list items are plain `<li>` with no visual weight distinction between "available" and "coming soon" | Already distinguished by section — no change needed |

**Editor shell (`App.tsx` header + layout)**
| Issue | Candidate fix |
|---|---|
| Header canvas selector is a plain `<select>` that looks inconsistent with the rest of the design system | Wrap in the existing `input` class from `ui.tsx` to match other selects |
| Autosave status dot and text is in a `border-line` pill that can be missed — low contrast in the `idle` state | Increase contrast of the `Temporary workspace` state (e.g. use `text-dim` → `text-mute`) |
| Tool nav items have no `title` text that matches their label — `sub` is used as `title` but the label appears below the icon — the sub-label is more verbose than necessary for a tooltip | Simplify `title` to just the label (already set), confirm this is correct |
| Min-width of 920 px is enforced without any user-facing warning on narrow viewports | Add a `<noscript>`-style warning strip at the bottom of `App.tsx` when `window.innerWidth < 920` (mounted once, no SSR concern) |

**Timeline (`Timeline.tsx`)**
| Issue | Candidate fix |
|---|---|
| Timeline height is fixed at 176 px with a single video track and single caption track — no visual label for which is which | Track labels "Video" and "Captions" already exist (verified in source). No change needed. |
| Snap indicator line is `bg-accent-300` 1 px wide — may be invisible at high zoom on Windows with sub-pixel rendering | Increase to 1.5 px or use a `min-width: 2px` rule |
| Clip blocks on the timeline have a number badge but no label visible | Clip `label` is stored (the opening line from the draft) but not shown in the timeline chip — add a truncated label below the number badge when the clip is wide enough (> 80 px) |

**Template gallery (`Panels.tsx` — `StylesPanel`)**
| Issue | Candidate fix |
|---|---|
| Template thumbnails animate on hover, which is good, but there is no way to see the animation play for the currently *selected* template without deselecting and re-hovering | Add a "Replay animation" icon button on the selected template card that triggers `setHover(true)` momentarily |
| Category chip strip is `overflow-x-auto` with no scroll affordance on desktop | Add a right-fade gradient mask on the chip strip when it overflows |
| Search input has an icon but no `aria-label` companion text (it has a label but it is `sr-only`) — verify the `aria-label` attribute exists | Verified in source: `aria-label="Search templates"` is present. No change. |

### Files that may change
`Landing.tsx`, `EditorMock.tsx`, `App.tsx` (narrow-viewport warning + header select class), `Timeline.tsx` (snap line, clip label), `Panels.tsx` (replay button, chip fade), `index.css` (verify `cut-in` animation), potentially `components/ui.tsx` (no structural change — only className tweaks).

### Existing behaviour that must be preserved
- All interactive behaviours (clicks, drags, keyboard shortcuts, template application) must work identically.
- No component is re-architected. Only className, copy, and minor render additions.
- The `TemplateCard` hover/animation loop must not be re-written — only a replay trigger added.
- The landing page scroll-to-section, mobile nav, and "Continue" resume link all stay intact.

### Dependencies on other groups
- Group 1 (baseline commit).
- Group 4A (Emil skill check) must complete before 4B begins.
- Group 3 UI changes (density control, kwSize slider) should be merged first so 4B doesn't duplicate styling effort.

### Acceptance tests
1. Landing page: visit `/#how` directly → section scrolls into view; no unwanted focus ring visible.
2. Editor: select canvas aspect in header → `<select>` renders with the `input` class styling, consistent with other selects.
3. Timeline: drag a trim handle → 1.5 px snap line is visible at all zoom levels.
4. Timeline: apply a 3-clip draft → clip blocks show the opening-line label when the clip is wider than 80 px.
5. Template gallery: select a template → "Replay" button appears; clicking it restarts the animation.
6. Template gallery: category chips overflow → right-fade gradient visible; strip scrolls horizontally.
7. Narrow viewport (< 920 px): a banner or message explains the editor is optimised for desktop.
8. No visual regression on any of the 34 template thumbnails.

### Effort & risk
**~4 hours. Low risk** — only additive CSS and copy changes with one small new UI element (replay button). The Emil skill investigation adds ≤30 minutes. If the skill is installable it may provide specific guidance that adjusts this group's scope — that will be reported before changes begin.

### Deadline feasibility
Yes — design changes are isolated to className and copy. The Emil skill check is fast.

---

## Work Group 5 — Conversational editing assistant

### Goal
Add a conversational panel where the creator types a plain-language instruction that maps to a supported project operation. The assistant performs real changes to project state via the existing setters. It does not claim LLM understanding — it is transparent pattern-matching, clearly labelled as such.

### Supported commands (v1 scope)
These are the commands that can be wired to existing App.tsx setters without new infrastructure:

| Intent | Example inputs | Wired to |
|---|---|---|
| Regroup captions | "use 2 word captions", "3 words per caption", "one word at a time" | `changeDensity(n)` |
| Apply template | "apply Heavy Pop", "use the Pill template", "switch to Cove" | `applyTemplate(templateById(name))` |
| Set caption position | "move captions to bottom", "put captions at top", "centre the captions vertically" | `setAllY(y)` |
| Set canvas format | "switch to vertical", "change to 9:16", "square format" | `setCanvas({aspect})` |
| Clear captions | "remove all captions", "clear captions" | `setCaptions([])` (with confirm) |
| Set trim point | "set trim start to 12 seconds", "trim end at 1:30" | `setTrim({start/end})` |
| Undo / redo | "undo that", "undo", "redo" | `undo()` / `redo()` |
| Describe current state | "how many captions?", "what template is selected?" | Read-only — text reply only, no state change |
| Unsupported command | Anything else | Polite refusal + list of what *is* supported |

**What the assistant will NOT do:**
- It will not claim to transcribe, understand video, generate content, or perform operations that require external APIs.
- It will not execute `eval()` or dynamic code.
- All operations are the same code paths the UI buttons call — no backdoors.

### Architecture

**New file: `src/lib/assistant.ts`**
A pure function `parseIntent(text: string): Intent | null` where `Intent` is a discriminated union of the supported commands. Uses the same pattern-matching approach as `parseBrief.ts` — no external API, no LLM. Returns `{ type, params }` or `null` for unrecognised input. Also exports `describeState(state: ProjectState): string` for read-only queries.

**New file: `src/components/AssistantPanel.tsx`**
A panel component with:
- A `<textarea>` for input (pressing Enter submits; Shift+Enter adds a newline).
- A scrollable message log showing user messages and assistant responses.
- An example-prompt section collapsed under a disclosure button.
- A clear disclosure: *"This assistant recognises specific commands and maps them to editor actions. It does not understand natural language or connect to any external service."*

**Changes to `src/types.ts`**
Add `'assistant'` to the `Tool` union type.

**Changes to `src/App.tsx`**
- Add `'assistant'` to the `TOOLS` array with an appropriate icon (`sparkles` or a new `chat` icon).
- Pass the required setters to `<AssistantPanel>` as props (the same setters already used by the other panels).
- `parseIntent` is called in the panel's submit handler; the matched intent invokes the corresponding setter via the prop.

**Changes to `src/components/icons.tsx`**
Add a `chat` icon (a simple speech-bubble SVG path — no new library). Optional: reuse `sparkles` if it reads clearly enough.

### Files that change
| File | Change |
|---|---|
| `src/lib/assistant.ts` | New: intent parser |
| `src/components/AssistantPanel.tsx` | New: panel component |
| `src/types.ts` | Add `'assistant'` to `Tool` type |
| `src/App.tsx` | Add tool entry + `<AssistantPanel>` render + prop wiring |
| `src/components/icons.tsx` | Add `chat` icon path (or confirm `sparkles` suffices) |

### Existing behaviour that must be preserved
- All five existing tool panels (Media, Captions, Styles, Draft, AI Tools) work identically — the assistant is additive.
- Every operation the assistant performs goes through the same setter functions as the UI buttons, including undo/redo tracking (because the setters all trigger the `useEffect` debounce in App.tsx).
- Captions cleared via assistant → Ctrl+Z undoes it (because `setCaptions` is the same call).
- Template applied via assistant → appears in Styles panel as selected (same state path).

### Dependencies on other groups
- Group 1 (baseline).
- Group 3 must be complete first, so the density setter accepts numbers > 3 before the assistant tries to dispatch `changeDensity(5)`.

### Acceptance tests
1. Type "2 word captions" → captions regroup to 2 words; undo reverses it.
2. Type "apply Marquee" → Marquee template applied; Styles panel shows it selected.
3. Type "move captions to bottom" → all caption `y` values set to 0.8; preview updates.
4. Type "switch to 9:16" → canvas aspect changes; header selector shows 9:16.
5. Type "clear captions" → confirm dialog fires; on confirm, captions cleared; undo restores them.
6. Type "what template is selected?" → text reply names the current template; no state change.
7. Type "generate viral content for me" → polite refusal with list of supported commands.
8. Pressing Enter submits; Shift+Enter adds newline.
9. No paid API calls made at any point (verify with browser devtools network tab).

### Effort & risk
**~5 hours. Medium risk.** The pattern-matching in `assistant.ts` can be written incrementally (start with 3 commands, expand). The biggest risk is prop-drilling complexity in `App.tsx` — mitigated by grouping the assistant props in a single interface rather than adding individual props. The UI is simple.

### Deadline feasibility
Yes — this is the largest single group but the scope is deliberately constrained to what is already wired. Writing 8 intent patterns + a simple message log is achievable in a focused session.

---

## Work Group 6 — End-to-end workflow test

### Goal
Verify the complete upload → transcribe → draft review → accept → export pipeline works reliably. Add automated unit tests for the paths that currently have none. Produce a manual test checklist for the browser-dependent paths.

### Sub-task 6A — New unit tests

**New file: `src/lib/captions.test.ts`**
- `groupWords(words, 1)` → one word per caption.
- `groupWords(words, 5)` → five words per caption (Group 3 regression).
- `groupWords` with a long pause > 0.8 s → breaks at the pause regardless of word count.
- `regroup(captions, 3)` → preserves measured word timing; redistributes approximated timing.
- `autoKeywords` → picks a number over a long word; picks strong-word; returns at most one index.
- `suggestEmojis` → returns at most one suggestion per caption; skips captions that already have emoji.
- `appendEmoji` → adds emoji to text and word list correctly.

**Expand `src/lib/draft/brief.test.ts`**
- "five word captions" → `wordsPerCaption: 5` (Group 3 regression test).
- "six words per caption" → `wordsPerCaption: 6`.
- No density mentioned → `wordsPerCaption: null`.

**Expand `src/lib/draft/apply.test.ts`**
- `captionsForRanges` with `perCaption: 5` → five-word groups (Group 3 regression).

### Sub-task 6B — Manual test checklist (browser)

The following are things that cannot be automated in Vitest and must be verified manually in a browser before the deadline:

| # | Test | Pass criteria |
|---|---|---|
| 1 | Upload MP4 (H.264) | Video loads, duration shows, filmstrip appears |
| 2 | Upload WebM | Same as above |
| 3 | Upload unsupported codec (e.g. HEVC) | Error message shown, no crash |
| 4 | Drag-and-drop a video file onto the editor | Video loads |
| 5 | Transcribe with "tiny.en" model (first run) | Model downloads, progress shown, captions appear |
| 6 | Transcribe again (cached) | Faster, captions appended |
| 7 | Cancel transcription | "Cancelled" info message, no captions added |
| 8 | Draft review: accept 2, reject 1 | Apply button enabled; only accepted clips created |
| 9 | Apply draft → check timeline | Clips shown in timeline, sequence bar shows playback order |
| 10 | Preview with 3 clips | Playback jumps between clips in order, no infinite loop |
| 11 | Export (no clips) | Single-range MP4/WebM downloads and plays |
| 12 | Export (3 clips) | Multi-range file downloads; audio fades at cuts (Group 2) |
| 13 | Cancel export | Download does not start, no hanging spinner |
| 14 | Ctrl+Z after regrouping captions | Previous grouping restored |
| 15 | Autosave recovery | Refresh browser → "Recover session?" card appears; restore works |
| 16 | Project file save/load | .cutpilot.json downloads; loading it restores all captions and style |
| 17 | SRT import | .srt file produces correctly timed captions |
| 18 | SRT export | Downloaded .srt plays correctly in VLC |
| 19 | Density set to 5 (Group 3) | Captions group to 5 words after transcription |
| 20 | Keyword fixed size 64 px (Group 3) | Preview shows keyword at 64 px; export matches |
| 21 | Assistant: "apply Cove" (Group 5) | Template changes in Styles panel |
| 22 | Assistant: unsupported command | Polite refusal, no error |

### Files that change
- `src/lib/captions.test.ts` (new)
- `src/lib/draft/brief.test.ts` (expanded)
- `src/lib/draft/apply.test.ts` (expanded)
- No production source files changed in this group.

### Dependencies on other groups
- Group 3 must be complete before regression tests for density > 3 are written.
- Group 5 must be complete before assistant tests (22) are added.
- Manual checklist (6B) runs after all code groups are merged.

### Acceptance tests
`npx vitest run` passes with zero failures after Groups 3 and 5 are merged. All 22 manual checklist items pass.

### Effort & risk
**~2 hours for unit tests. ~1 hour for manual checklist execution. Low risk.** Tests are additive; no production code changes.

### Deadline feasibility
Yes — tests run fast. Manual checklist is the final gate before declaring the build complete.

---

## Work Group 7 — Secondary improvements (time-permitting)

These items improve quality but are not blockers for the core workflow. They are tackled in priority order after Groups 1–6 are complete and tested.

### 7.1 — Clip labels on timeline (30 min, low risk)
Already noted in Group 4's design audit as a one-line change inside `Timeline.tsx`. Promote here in case Group 4 runs short.
- **Files:** `Timeline.tsx` — add `<span className="truncate text-[9px]">` below the clip number badge when the clip block is > 80 px wide.
- **Preserved:** clip click-to-select, clip handle drag, all clip interactions.

### 7.2 — Clip split at playhead (2 h, medium risk)
A "Split" keyboard shortcut (`S`) and a button in the Draft panel that divides the selected clip into two at `time`.
- **Files:** `App.tsx` (new `splitClip` function using `constrainClip` + array splice), `components/DraftPanel.tsx` (split button), keyboard handler in `App.tsx`.
- **Preserved:** `constrainClip`, `moveItem`, `sequenceRanges` all unchanged — split only inserts a new clip record.
- **Risk:** Captions that straddle the split point need to be handled (clip them to whichever sub-clip they mostly fall in, or leave them — they will still export correctly because captions are positioned in source time).

### 7.3 — "New project" button in editor (30 min, low risk)
The header already has a `<Link to="/">` logo. Add a clearly labelled "New project" button (or make the logo link more obvious) that navigates to `/` with a `beforeunload`-style confirm if unsaved changes exist.
- **Files:** `App.tsx` header section — one button, one `confirm()` call before `navigate('/')`.
- **Preserved:** autosave and session persistence are unaffected; navigation already works.

### 7.4 — Narrow-viewport warning in editor (30 min, low risk)
The `min-w-[920px]` root style causes horizontal scrolling on narrow screens with no explanation.
- **Files:** `App.tsx` — add a `useEffect` that checks `window.innerWidth` once on mount and sets a `showNarrowWarning` state; render a dismissible strip at the top: *"CutPilot works best on a wider screen (920 px or more). The editor may scroll horizontally on this display."*
- **Preserved:** No layout change to the editor itself.

### 7.5 — B-roll suggestion quality (1 h, low risk)
The existing `broll.ts` keyword list is functional but small. Expand the keyword-to-suggestion map with ~50 additional entries (action sports, tech, cooking, finance, wellness categories), and add a confidence label ("strong match" / "loose match") to distinguish direct matches from fuzzy ones.
- **Files:** `src/lib/draft/broll.ts` — expand the keyword dictionary; update the `BrollIdea` interface to add `confidence: 'strong' | 'loose'`; update `DraftScreen.tsx` to display the confidence label.
- **Preserved:** All existing B-roll logic; the honest "text suggestions only" disclaimer stays.

### 7.6 — Roadmap section in landing page (45 min, low risk)
The features section already has a "Planned, not built yet" list. Upgrade it to a more structured roadmap table with rough timelines.
- **Files:** `Landing.tsx` — replace the plain `<ul>` under "Planned, not built yet" with a two-column table: Feature | Status.
- **Preserved:** All existing sections; no component re-architecture.

### Dependencies
All Group 7 items depend on Group 1. Items 7.1–7.4 have no other dependencies. Item 7.5 depends on Group 2 being complete (the draft review workflow it extends should be stable). Item 7.6 is entirely standalone.

### Deadline feasibility
7.1, 7.3, 7.4, and 7.6 are achievable if time permits. 7.2 (clip split) and 7.5 (B-roll) are stretch goals.

---

## Timeline and sequencing

| Day | Groups | Target state |
|---|---|---|
| Oct 23 (today) | **G1** (git init, baseline commit) | Safe to begin coding |
| Oct 24 (Day 2) | **G2** (export fix), **G3** (captions) | Core reliability + caption system complete |
| Oct 25 (Day 3) | **G4** (design), **G5** (assistant) | Design consistent; assistant working |
| Oct 26 (Day 4 — deadline) | **G6** (testing), **G7** (secondary, time-permitting) | Fully tested build; secondary polish if time |

Groups 2 and 3 can proceed in parallel (they touch different files). Group 4 starts with the Emil skill investigation, which is fast. Group 5 begins once Group 3 is merged (density setter must accept > 3).

---

## What will NOT be built (explicit scope boundary)

| Item | Reason |
|---|---|
| LLM-powered assistant | No paid API; local LLMs not available in browser without additional infrastructure |
| Faster-than-real-time export | Requires re-engineering the exporter to use `OfflineAudioContext` + WebCodecs — out of scope for this deadline |
| B-roll footage finding or generation | No external API; would require a third-party service |
| Audio-level pause detection | Requires `OfflineAudioContext` analysis — significant new feature, not a fix |
| Mobile-optimised editor | `min-w-[920px]` constraint acknowledged; only a warning strip is added (7.4) |
| Clip drag-to-reorder on timeline | Timeline clip blocks are clickable; reorder is in the DraftPanel. Drag-reorder on the timeline itself requires significant new pointer-drag logic in Timeline.tsx and risks breaking the existing trim/caption drag — deferred past the deadline |

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Web Audio gain ramp creates audio artifacts (Group 2) | Medium | Medium | Gate behind `ranges.length > 1`; provide a disable flag; test on Chrome + Firefox + Safari |
| `kwSize` field breaks template thumbnail rendering (Group 3) | Low | Low | `null` default + existing normalise path; thumbnails use `drawCaption` unchanged |
| AssistantPanel prop-drilling grows unmanageable (Group 5) | Low | Low | Group props in a single `AssistantDispatch` interface passed as one prop |
| Emil skill not installable (Group 4) | High (already not found) | Low | Design work proceeds without it using known public principles |
| Manual test checklist reveals a blocking bug (Group 6) | Low | High | Groups 1–5 are committed separately so any group can be reverted individually without losing others |
