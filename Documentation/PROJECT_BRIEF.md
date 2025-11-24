# Project Brief

## Purpose
NeuraMax is a local-first control room for repetitive creative-ops work. The product doubles as a living lab for its creator—a visual designer who is intentionally experimenting with different frontend stacks to understand how various frameworks, design systems, and backend pairings behave in production-quality dashboards. Each dashboard is therefore allowed to choose its own stack (even if partially overlapping with others) while still plugging into the same FastAPI backend. The suite now spans three coordinated dashboards: Smart Renamer (single-folder prefix/suffix tweaks), Dataset Actions (caption atelier, courier, TXT utilities), and the emerging Face Similarity & Crop Studio. Dashboards 1 and 2 ship today; Dashboard 3 intentionally moves to a SvelteKit + UnoCSS + CSS Houdini stack to stretch our design language. For now, it exposes simulated InsightFace runs so we can finish the UX before wiring in the heavy scripts that live in `Code/Upcoming/`.

### Dashboard Lineup
1. **Smart Renamer (shipped):** single-folder rename console with four ordered prefix/suffix operations that mirrors our PySide legacy logic.
2. **Dataset Actions (feature-complete, polish pending):** caption atelier, caption courier, blank TXT forge, make-copy tools, and snapshot/undo utilities that reuse the renamer’s muscle-memory layout.
3. **Face Similarity & Crop Studio (frontend complete, backend adapters pending):** two vertically stacked mini-dashboards dedicated to the InsightFace flows from `face_similarity_step1.py`, `face_similarity_step2.py`, and `face_cropper_nitara.py`. This dashboard now lives in its own SvelteKit + UnoCSS + Houdini canvas so we can explore non-React motion/gradient techniques without sacrificing the shared outer frame.
   - **MDB #1 – Similarity Sweeps:** Step 1 and Step 2 controls share the same card (folders, anchors/calibration inputs, move mode, detection thresholds, quality-gate toggles, spark progress bars, and log feeds). The new Svelte UI talks to the existing FastAPI simulator so we can validate the choreography before executing the GPU scripts.
   - **MDB #2 – Headshot Cropper:** exposes input/output pickers, margin/min-confidence knobs, skip counters, and a progress rail driven by the same simulated job service. Next milestones: plug in the Nitara cropper, show recent headshot chips, and surface skip reason logs.

All dashboards keep the same left rail, title treatment, centered glass card, and right-column footprint so operators gain muscle memory even as tones/themes diverge.

## Core Rename Flow
1. Paste or type a folder path on the local machine.
2. Click **Check & Load** so the backend confirms the folder (non-recursive) and reports how many files it finds.
3. Configure up to four ordered rename operations (steps 1–4), each being `add_prefix`, `remove_prefix`, `add_suffix`, or `remove_suffix`.
4. Click **Preview** to see the proposed mapping (original vs. new names) plus counts of renamed, unchanged, and collision-resolved files.
5. If the preview matches expectations, click **Run** to apply the rename mapping inside that single folder.

## Dataset Actions Snapshot
- Caption Atelier mirrors the rename layout with folder pills, backup toggles, caption tables, and prefix/suffix operations that share the backend helpers.
- Caption Courier copies TXT sidecars between folders with overwrite and dry-run controls.
- Blank TXT Forge, snapshot restore, and log chips reuse the same card architecture; UI polish (spacing, summary chips, folder rails) is the final to-do.

## Face Studio Snapshot
- Dashboard #3 is the first to move outside the React codebase. The dedicated SvelteKit app (`Code/face-studio`) ships with UnoCSS utility tokens, CSS Houdini shaders, spark progress components, and emits job status/log events back to the right rail.
- FastAPI exposes `/faces/step1/run`, `/faces/step2/run`, `/faces/crop/run`, and `/faces/jobs/{id}`. These endpoints currently call into `face_jobs.JobManager`, which counts images, simulates state/log updates, and will later wrap the InsightFace + crop scripts.
- Right-rail already shows anchor thresholds, live job states, GPU/CPU notes, and recent log lines; future work will add clickable output chips and thumbnail reels once real scripts run.
- React embeds the Svelte build via an iframe but now passes an `embed` flag so the Svelte app yields the outer rails/title card back to React; DB3 therefore fills the same main-card footprint/colors as the other dashboards while still controlling its maroon interior decks.

## Experience Pillars
- Full-screen “glass dashboard” aesthetic with layered gradients, soft glows, and Framer Motion micro-interactions.
- A single Ops Console card keeps every control together: folder workspace, operations grid, preview table, and run buttons.
- Status text constantly nudges the next action (“Paste a folder,” “Preview ready,” “Folder not found”) using muted/teal/error tones.
- Recents lists (rename + dataset) let the user re-select prior paths without digging through Explorer; Face Studio will reuse this idea once scripts land.
- Buttons reinforce the expected order: clipboard helper → load folder → configure ops → preview → run.

## Global Layout Rules
- The left dashboard switcher, title card, and main card must always share identical widths and relative positions across every dashboard.
- The right-side quiet space (recents list, log panel, or Insight console) keeps the same footprint so the overall frame never shifts.
- No view may introduce scrolling—every dashboard stays within the fixed-height frame so the glass cards appear locked in place on load.
- Typography sizing stays in lockstep across dashboards; themes change via tone/glow, not by resizing the foundational type ramp.

## Architecture Overview
- **Backend:** FastAPI (`Code/Option_C-Max-API.py`) exposes rename endpoints, dataset-action helpers, and the face job APIs. Rename logic is purposefully constrained to a single folder. Dataset endpoints call into `dataset_actions_core.py` (load, preview, run, copy, make blank, snapshot restoration). Face APIs currently rely on `face_jobs.py`, a lightweight job manager that simulates long-running InsightFace/crop tasks until we replace it with adapters that invoke the scripts under `Code/Upcoming/`.
- **Frontend:** Multiple stacks by design. Dashboards #1 and #2 still live in the Vite + React + Tailwind workspace (`Code/neura-ui`) so we can iterate quickly on shared UX. Dashboard #3 is being rebuilt in its own SvelteKit workspace with UnoCSS tokens and CSS Houdini shaders to push the visual language forward. Every dashboard honors the shared outer frame (left nav, title card, centered main card, right utilities) regardless of the framework.
- **Repo layout & hygiene:** The Git history now lives entirely inside `/mnt/d/Cursor/FileOps-DB3` on `main`; legacy worktrees have been removed. A root-level `.gitignore` centralizes Python/Node/coverage artifacts and keeps `Samples/` as a local-only scratch space for heavy reference assets so remote clones stay lean while still containing every needed source file.

## Data Flow Snapshot
- **Rename:** Ops Console state → Axios POST (`/preview`, `/run`) → rename computation + collision handling → summary + per-file mapping back to the UI.
- **Dataset actions:** UI builds caption/courier payloads → FastAPI delegates to dataset helpers → summary/logs/CSV paths returned. Snapshot restore + copy endpoints provide additional loops.
- **Face Studio (current):** SvelteKit app calls `/faces/step1|step2|crop/run` to start a job → backend creates a job_id via `face_jobs.JobManager` → UI polls `/faces/jobs/{id}` for spark progress, logs, and completion. Job manager will proxy the InsightFace + crop scripts once adapters are finished.

## Current Boundaries
- Rename dashboard: still limited to prefix/suffix steps (no regex, numbering, recursion, or multi-folder batching).
- Dataset actions: UI polish for the preview table + summary chips is pending; caption tooling assumes TXT sidecars live next to the images; recursive scans exist but lack deep UX surfacing.
- Face Studio: endpoints simulate work; InsightFace comparisons, Excel/CSV outputs, and face preview galleries are not yet wired. Clipboard/manual folder entry remains the workflow (no system file picker).
- Platform-wide: local-only (no auth) on `127.0.0.1`, and every dashboard must remain scroll-free within the fixed-height frame.

## Opportunity Backlog
- Rename: insert-at-index, replace text, numbering, recursion, undo/export logs, inline previews while typing.
- Dataset: finish preview-table spacing, align summary chips, expose caption history diffing, add CSV download affordances.
- Face Studio: replace the simulated jobs with the actual InsightFace/crop scripts, surface live log files + rule counts, add thumbnail reels for scored/cropped faces, and persist last-run settings.
- Platform-wide: optional browse dialogs, richer recents management, experiment-specific right-rail content.

## Next Step After This Brief
Proceed directly to the Progress Tracker (`Documentation/PROGRESS_TRACKER.md`). It captures the live state, points you to `Documentation/DB3-brief.md` for Dashboard #3 context, and hands you the next set of documents and source files to read.
