# Progress Tracker

This tracker is the live follow-up to the Project Brief. Read it after the brief and use it to understand what is finished, what remains in flight, and which files own each area.

---

## Current Snapshot (2025‑11‑24)

### Shipped & Stable
- **Smart Renamer (React + Tailwind):** Backend helpers, `/preview` + `/run`, workspace UX, operations grid, preview table, and run flows all mirror the PySide baseline. Continue to monitor for edge-case reports; advanced rename recipes are still backlog.
- **Dataset Actions foundations (React + Chakra):** Caption Atelier, Caption Courier, Blank TXT Forge, copy/make-blank routines, snapshot restore, and recents rail are functional. Backend lives in `dataset_actions_core.py` with ≥91 % Pytest coverage.
- **Face Studio frontend (SvelteKit + Uno + Houdini, embedded in React):** DB3 now renders its decks directly on the glass card while posting telemetry to React, which drives the standardized right rail (`FaceRightRail.jsx`). The React shell controls card height, lift, and the iframe loader; the Svelte app handles the fold-over tabs, Step 1/Step 2 forms, and the cropper deck, polling `/faces/jobs/{id}` for spark progress and logs. Switching dashboards remains instant because the bundle is still served from `public/face-studio` (or the dev server via `VITE_FACE_STUDIO_DEV_URL`).

### Actively In Progress
- **Dataset Actions polish:** tighten preview-table spacing, align summary chips, and unify folder controls/styles across modules. Files: `Code/neura-ui/src/dataset/DatasetActionsDashboard.jsx`.
- **Face Studio backend integration:** current FastAPI routes (`/faces/step1|step2|crop/run`, `/faces/jobs/{id}`) still call `face_jobs.JobManager`, which simulates counts/logs. Next milestones: wrap the real `face_similarity_step1.py`, `face_similarity_step2.py`, and `face_cropper_nitara.py`, expose real log/output paths, and surface thumbnails/output chips in the React right rail.
- **Face Studio UI refinement:** continue iterating on MDB spacing, deck padding, and Insight-specific iconography now that the right rail lives in React (`Code/neura-ui/src/face/FaceRightRail.jsx`) and the embed only renders the maroon card.
- **Testing push:** Backend Pytest already ≥91 %. Frontend Vitest (React dashboards) still sits around 88 % statements / 83 % branches with two OpsConsole guard specs failing—see `Code/neura-ui/tests/frontend/frontend-error.md`. SvelteKit dashboard will need its own Playwright/Vitest plan once backend adapters land.

### Upcoming / Backlog
- Advanced rename features: insert-at-index, replace text, numbering, recursion, undo/export logs.
- Dataset enhancements: caption history diffing, CSV download affordances, drag-and-drop/browse dialogs.
- Face Studio extras: real-time rule counts, anchor calibration editors, headshot thumbnail reels, persistent run history.
- Platform-wide ergonomics: richer recents management, optional browse dialogs, shared telemetry panel patterns.

---

## Key Files & Responsibilities
- **Backend:** `Code/Option_C-Max-API.py`, `dataset_actions_core.py`, `face_jobs.py`, and the InsightFace scripts under `Code/Upcoming/`. Job adapters will live alongside `face_jobs` once implemented.
- **Smart Renamer frontend:** `Code/neura-ui/src/components/OpsConsole.jsx`, `Code/neura-ui/src/App.jsx`.
- **Dataset Actions frontend:** `Code/neura-ui/src/dataset/DatasetActionsDashboard.jsx`.
- **Face Studio frontend:** `Code/face-studio/src/routes/+page.svelte` plus components in `Code/face-studio/src/lib/components`. Embedded bundle output lives under `Code/neura-ui/public/face-studio`; `Code/neura-ui/src/face/FaceDashboard.jsx` hosts the iframe and `Code/neura-ui/src/face/FaceRightRail.jsx` renders the React-side telemetry rail.
- **Testing:** Backend tests in `Code/neura-ui/tests/backend`. Frontend tests + logs in `Code/neura-ui/tests/frontend`. New Svelte tests TBD.

---

## Testing & Validation Rules
1. Do not water down tests for convenience. Fix root causes instead.
2. Backend suites must keep ≥90 % coverage (currently ≥91 %).
3. Frontend coverage must reach ≥90 % statements/branches with no exclusions on working code. Because WSL blocks Vitest/Tinypool, the user runs `npm run test -- --coverage` on a native host and records results inside `Code/neura-ui/tests/frontend/frontend-error.md`; always consult that log before debugging.
4. Follow the dashboard cadence from AGENTS.md: plan → build → refine → (only after green-light) write comprehensive tests and prove ≥90 % coverage for the new work.

---

## Downstream Reading Sequence (Wave 2 → Wave 3)
1. `Documentation/HUMAN_GUIDE.md`
2. `Documentation/Git-Ops.md`
3. `Documentation/DB3-brief.md`
4. Source files listed in the “Key Files” section above (read all relevant files before coding).

---

## Open Questions
1. What telemetry/output surfacing should appear in the Face Studio right rail once real InsightFace runs are wired—rule counts, preview thumbnails, log download links?
2. Which advanced rename features (find/replace, numbering, recursion, undo) should land next after the current UI work?
3. Do we need undo/rollback or exportable reports before inviting more users?
4. Should we standardize a testing stack for the SvelteKit dashboard (Playwright, Vitest, or both) once the backend adapters are live?

---

## Next Coordination Checkpoint
After Dataset Actions polish and the Face Studio backend adapter plan are locked, schedule a design/dev sync to decide whether the next sprint focuses on (a) InsightFace integration, (b) frontend test coverage, or (c) Smart Renamer feature expansion.*** End Patch
