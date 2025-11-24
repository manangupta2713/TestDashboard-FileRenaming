# Dashboard #3 – Face Similarity & Crop Studio

## Mission
Bring InsightFace similarity sweeps (two scripts) and the Nitara headshot cropper into the NeuraMax shell while using Dashboard #3 as a design lab for SvelteKit + UnoCSS + CSS Houdini. Smart Renamer (React) and Dataset Actions (React/Chakra) stay untouched; DB3 intentionally explores a new stack to broaden our visual and technical vocabulary.

## Backend Inputs
- `Code/face_similarity_step1.py`: GPU InsightFace sweep against three anchors, calibrated with CSV thresholds, quality gates, and rule-based output folders/logs.
- `Code/face_similarity_step2.py`: multi-female re-check that crops each detected female face, re-scores, and exports Excel logs plus “not similar” drops.
- `Code/face_cropper_nitara.py`: CPU-friendly cropper with margin, confidence, and face-size controls.
- FastAPI (`Code/Option_C-Max-API.py`) already exposes `/faces/step1/run`, `/faces/step2/run`, `/faces/crop/run`, and `/faces/jobs/{id}` that currently call the simulated `face_jobs.JobManager`. Real adapters will replace the simulator later without changing payload shapes. The legacy `Code/Upcoming` folder now only houses experiments that are not wired into any dashboard; the scripts above live alongside the rest of the production code so every dashboard follows the same structure.

## Frontend Stack & Hosting Decision
- **Framework:** SvelteKit (`Code/face-studio`).
- **Styling:** UnoCSS shortcuts + custom theme tokens.
- **Motion/Visuals:** CSS Houdini paint worklet (`static/houdini/orbital-noise.js`) for the nebula background, gradient overlays, spark progress bars.
- **HTTP:** native `fetch` to the FastAPI endpoints; no Redux/state libs required.
- **Layout Guardrails:** match the existing NeuraMax frame (left rail, title card, centered main card, right rail, no scrolling). React dashboards remain for other modules; DB3 uses SvelteKit independently but with the same visual proportions.
- **Embedding (Option B):** We embed the Svelte app inside the React shell, so switching dashboards stays instant. During dev, the React app loads the Svelte dev server (configurable via `VITE_FACE_STUDIO_DEV_URL`). For production, run `npm run build:embed` in `Code/face-studio` to copy the bundle into `Code/neura-ui/public/face-studio`, which the React iframe serves at `/face-studio/index.html`. React now passes an `embed=1` flag so the Svelte app paints only the maroon main card and posts telemetry back up; the React shell owns the outer rails (left, title, right) and renders the live Insight console via `FaceRightRail.jsx`.

## UI Structure
1. **Left Rail:** lists all dashboards + states, highlights Face Studio as “SvelteKit · Uno · Houdini”, reiterates that every dashboard can pick its stack.
2. **Title Card:** describes the two InsightFace steps + cropper, notes the stack/back-end, and shows chips for the current build status.
3. **Main Card – MDB #1 (Similarity Sweeps):**
   - Step 1 section: folder input, move-mode select, calibration CSV / anchor dir inputs, quality-gate toggle, (future) dry-run toggle, Run button, SparkProgress, log stream.
   - Step 2 section: source folder, detection threshold, destination folder, Run button, SparkProgress, log stream for cropped previews.
   - Both sections poll `/faces/jobs/{id}` and emit `status` events so the shell/right rail can stay in sync.
   - MDB #1 and MDB #2 share a fold-over tab edge: the active deck rises while the inactive deck tucks back into the card so the main-panel footprint never changes.
4. **Main Card – MDB #2 (Headshot Cropper):**
   - Input/output folders, margin %, min confidence, minimum face size.
   - Run + reset buttons, SparkProgress, summary counters (processed/total/state), skip/log feed.
5. **Right Rail (“Insight Console”):**
   - Now rendered in React (`Code/neura-ui/src/face/FaceRightRail.jsx`) so it shares the same footprint as DB1/DB2.
   - Receives `postMessage` updates from the embedded app (anchor thresholds, live job states, system notes, recent logs).
   - Future additions (rule counts, output chips, thumbnails) will land here once backend adapters emit real artifacts.

## Current Status
- Full SvelteKit UI implemented (see `Code/face-studio/src/routes/+page.svelte` and components under `src/lib/components`).
- UNO/Houdini theme + worklet wired in (`uno.config.ts`, `static/houdini/orbital-noise.js`, `src/app.css`).
- React shell now controls the fully standardized frame: the Svelte embed renders only the decks, while `FaceDashboard.jsx` hosts the iframe and `FaceRightRail.jsx` mirrors the Insight console layout from DB1/DB2.
- Backend still simulates long-running InsightFace jobs, so the current focus is on UX polish, telemetry hand-off to React, and prepping the UI for real adapters.

## Next Steps
1. Replace the `face_jobs` simulator with adapters that call the real InsightFace + crop scripts and stream log lines/output references.
2. Surface rule counts, preview thumbnails, and output chips once real jobs produce files.
3. Keep Dataset Actions polish + frontend testing push in parallel (≥90% coverage target).

## Running the Dashboard
```bash
cd Code/face-studio
npm install
npm run dev -- --open   # defaults to http://0.0.0.0:5174
```
Set `VITE_API_BASE` if FastAPI is not on `127.0.0.1:8000`. The Svelte app polls `/faces/jobs/{id}` automatically.
