# CutPilot

<div align="center">

![CutPilot Logo](public/icon.svg)

### Local-First AI Video Editor & Multi-Clip Studio

**Turn raw footage into proposed cuts, edit on a multi-clip timeline, and burn in animated captions — 100% in your browser.**

[![Live Demo](https://img.shields.io/badge/demo-cutpilot--three.vercel.app-ffe14d?style=for-the-badge&logo=vercel&logoColor=black)](https://cutpilot-three.vercel.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-106%20Passed-10b981?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20On--Device-8b7cf6?style=for-the-badge)](https://cutpilot-three.vercel.app/)

</div>

---

## 🌟 Overview

**CutPilot** is a modern, high-performance, privacy-first web video editor designed for creators, educators, and social media producers. Rather than requiring users to upload sensitive gigabytes of private footage to cloud servers or pay per-minute API fees, CutPilot executes **speech recognition, video compositing, and AI-assisted rough cuts directly on your device**.

### Why CutPilot?

- **0 KB Uploaded to Cloud**: Your video never leaves your browser. Transcription and rendering execute entirely inside client-side Web Workers and WebAssembly.
- **On-Device Whisper AI**: Automatically transcribes speech using a quantized OpenAI Whisper model running in your browser via Hugging Face Transformers.js and ONNX Runtime.
- **Explainable First-Draft AI**: Describe your goals in plain English (e.g., *"Make a 45-second vertical clip about pricing with a punchy hook"*). CutPilot scores and proposes candidate clips with clear rationale, leaving you in total creative control.
- **Multi-Clip Timeline**: Review, trim, re-order, and split clips (`S`) with sub-pixel snap guides, filmstrip thumbnails, and waveform previews.
- **34 Kinetic Caption Templates**: Retention-optimized styles with customizable density (1–10 words), word-by-word timing, pop/karaoke/fade animations, and independent keyword sizing.
- **Local Conversational Assistant**: Built-in command assistant to restyle captions, adjust densities, switch canvas formats, and manage trims via natural commands without external LLM dependencies.

---

## 🚀 Key Features

### 🎙️ 1. On-Device Speech Recognition (Whisper)
- Powered by `@huggingface/transformers` running in a dedicated background Web Worker (`src/lib/transcribe.worker.ts`).
- Generates precise word-level timestamps without freezing the UI.
- Models are cached in browser storage after the first run (~40 MB quantized download), enabling full offline transcription thereafter.

### ✂️ 2. Rule-Based First Draft Workflow
- **Brief Parser**: Recognizes duration targets, canvas aspect ratios, topic focus terms, pause removal, and keyword emphasis.
- **Heuristic Scoring**: Identifies strong openings, questions, energetic delivery, and natural pauses.
- **Interactive Review**: Accept or reject proposed clips, retime boundaries, preview segments, and inspect rule-based rationale before anything touches your timeline.

### 🎞️ 3. Full Multi-Clip Timeline & Studio
- **Source-Time Sequence Model**: Non-destructive clip references (`Clip { id, start, end }`). Your original media file is never altered or degraded.
- **Interactive Trimming & Splitting**: Drag in/out handles with magnetic snapping, frame-stepping keyboard shortcuts (`←`/`→`), and split at playhead (`S`).
- **Flexible Canvas Aspect Ratios**: Switch between 9:16 (TikTok/Shorts/Reels), 1:1 (Square), 16:9 (Landscape), and Original source framing with dynamic background blur.

### 🎨 4. 34 Kinetic Caption Styles & Deep Customization
- **Pre-designed Templates**: Heavy Pop, Karaoke Box, Marquee, Bubble, Pill, Burst, Neon Glow, Editorial Serif, and 26 more.
- **Flexible Density (1–10 Words)**: Full control over word grouping cadence, from 1-word punchy shorts to multi-word subtitle blocks.
- **Emphasis & Keywords**: Automatic heuristic keyword scoring (numbers, currency, strong words) or manual `*asterisk*` markers.
- **Dual Keyword Sizing**: Choose between relative scale multipliers (`kwScale`) or fixed pixel sizes (`kwSize`, 24–200 px).
- **Customization**: Typography (Google Fonts SIL OFL), weights, letter spacing, drop shadows, glow effects, stroke outlines, and background pill geometry.

### 🤖 5. Conversational Editing Assistant
- Native command panel to direct the editor using typed instructions:
  - *"use 2 word captions"*, *"one word at a time"*
  - *"apply Heavy Pop"*, *"switch to Cove"*
  - *"move captions to bottom"*, *"captions at top"*
  - *"switch to 9:16"*, *"square format"*
  - *"trim start at 10s"*, *"undo"*, *"clear captions"*
- Transparent, on-device regex-based intent parser that runs with zero latency and zero cloud costs.

### 📤 6. Client-Side Export with Audio Crossfade
- Real-time HTML5 Canvas Compositor paired with `MediaRecorder`.
- **Seamless Cuts**: Integrated Web Audio `GainNode` schedules 80ms linear ramp crossfades across clip boundaries to eliminate silent gaps.
- Exports standard MP4 (where supported) or WebM with burned-in animated captions at native resolution with zero watermarks.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Framework & UI** | React 19, TypeScript 5.9, Vite 7 |
| **Styling & Design** | Tailwind CSS v4, Custom SVG Design System, SIL OFL Google Fonts |
| **Machine Learning** | Hugging Face Transformers.js v3, ONNX Runtime Web (WASM + SIMD) |
| **Media & Audio** | HTML5 Canvas 2D Context, Web Audio API (`AudioContext`, `GainNode`), `MediaRecorder` |
| **Persistence** | IndexedDB (`cutpilot` session store), `localStorage` (debounced autosave) |
| **Testing** | Vitest (106 unit & integration tests) |
| **Deployment** | Vercel SPA (with rewrite rules in `vercel.json`) |

---

## 📁 Repository Structure

```
cutpilot/
├── public/                 # Static assets, logos, and background atmosphere media
├── src/
│   ├── components/         # Modular UI components
│   │   ├── AssistantPanel.tsx # Conversational editing assistant
│   │   ├── DraftPanel.tsx     # Clip sequence manager & split controls
│   │   ├── DraftScreen.tsx    # First-draft proposal review screen
│   │   ├── Panels.tsx         # Media, Captions, Styles, and AI tool panels
│   │   ├── Stage.tsx          # Canvas video player & interactive caption overlay
│   │   ├── Timeline.tsx       # Multi-track filmstrip timeline with snap handles
│   │   └── ui.tsx             # Shared buttons, sliders, segmented controls, and badges
│   ├── lib/                # Core engines and utilities
│   │   ├── assistant.ts       # Natural command intent parser & state describer
│   │   ├── captions.ts        # Caption grouping, regrouping, and emoji suggestions
│   │   ├── compose.ts         # Canvas dimensioning and aspect ratio scaling
│   │   ├── exporter.ts        # Web Audio GainNode & MediaRecorder canvas export engine
│   │   ├── render.ts          # High-performance 60fps caption renderer & animations
│   │   ├── sequence.ts        # Non-destructive clip range math & sequence navigation
│   │   ├── session.ts         # IndexedDB & localStorage persistence
│   │   ├── templates.ts       # 34 animated typography presets and metadata
│   │   └── transcribe.*       # Web Worker pipeline for on-device Whisper inference
│   ├── pages/
│   │   └── Landing.tsx        # Responsive landing page with interactive hero and roadmap
│   ├── App.tsx             # Main desktop-first studio workspace
│   ├── main.tsx            # Application entry point and router mount
│   └── types.ts            # Canonical domain models and TypeScript contracts
├── vercel.json             # SPA fallback rewrites for Vercel deployment
└── vite.config.ts          # Vite build configuration (ES modules web worker support)
```

---

## ⚡ Quickstart & Local Development

### Prerequisites
- **Node.js**: `v20.19.0` or higher
- **Package Manager**: `npm` (included with Node.js)
- **Browser**: Modern Chromium-based browser (Chrome, Edge, Brave) or Firefox with WebAssembly SIMD support.

### 1. Clone the repository
```bash
git clone https://github.com/Mujeebbot/Cutpilot.git
cd Cutpilot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 4. Run automated test suite
```bash
npm test
```
Runs 106 automated unit and integration tests via Vitest covering sequence range calculations, caption densities, draft planning, audio ramps, and assistant intents.

### 5. Build for production
```bash
npm run build
```
Generates an optimized, minified client bundle in `dist/`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause playback |
| `←` / `→` | Step one frame backward / forward (30 fps) |
| `Shift` + `←` / `→` | Step one second backward / forward |
| `I` | Mark Clip Start / Trim In at playhead |
| `O` | Mark Clip End / Trim Out at playhead |
| `S` | **Split clip at playhead position** |
| `J` | Jump back 5 seconds |
| `K` | Pause and reset playback rate |
| `L` | Play (press again to increase speed up to 3×) |
| `Delete` / `Backspace` | Delete selected caption |
| `Ctrl` + `Z` | Undo last action (100-step history) |
| `Ctrl` + `Shift` + `Z` / `Ctrl` + `Y` | Redo action |
| `Ctrl` + `Scroll` | Zoom in / out on timeline |
| `Alt` (while dragging) | Temporarily disable magnetic boundary snapping |
| `?` | Toggle keyboard shortcuts modal |

---

## 🛡️ Privacy & Security Commitments

1. **Local Media Processing**: Your video files are processed strictly in your browser tab via HTML5 File and MediaStream APIs.
2. **Zero Cloud Telemetry**: CutPilot does not upload your media, audio streams, transcriptions, or project metadata to external servers.
3. **Open-Source Dependencies**: Built on transparent open-source libraries (`transformers.js`, `react`, `vite`, `tailwindcss`).

---

## 🗺️ Roadmap

- [x] **On-Device Whisper Transcription** (Web Worker + WebAssembly)
- [x] **Rule-based AI First Draft Generation** (Silence removal, hook scoring)
- [x] **34 Animated Caption Styles & Flexible Density (1–10 words)**
- [x] **Export Crossfades** (Web Audio GainNode boundary ramps)
- [x] **Conversational Editing Assistant** (Zero-latency on-device command panel)
- [x] **Clip Split at Playhead (`S`)**
- [ ] **Multi-Project Dashboard & Cloud Draft Persistence** (In Progress)
- [ ] **User Accounts & Secure Authentication** (In Progress)
- [ ] **Multi-Track Audio Ducking & Background Music**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Fonts bundled from Google Fonts are licensed under the [SIL Open Font License (OFL)](http://scripts.sil.org/OFL).
