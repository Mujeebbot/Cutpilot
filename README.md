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
- Autosave stores captions/style/trim/canvas in localStorage (never the video). "Save project" writes a JSON backup.
- Caption fonts are open-source Google Fonts (SIL OFL) loaded from fonts.googleapis.com.
