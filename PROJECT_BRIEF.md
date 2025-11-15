# Project Brief

## Purpose
NeuraMax Smart Renamer is a local-first dashboard that lets a user clean up a single folder full of files without needing scripting knowledge. The tool focuses on four predictable string tweaks—adding or removing a prefix or suffix—so the user can re-label large drops of media or renders in seconds.

## Core Rename Workflow
1. Paste or type a folder path that lives on the local machine.
2. Ask the FastAPI backend to “Check & Load” the folder (non-recursive) and report how many files it finds.
3. Configure up to four ordered operations (steps 1–4). Each operation can be one of `add_prefix`, `remove_prefix`, `add_suffix`, or `remove_suffix`, and a step number can only be used once.
4. Click Preview to see the proposed mapping (original vs. new names) as well as counts of renamed, unchanged, and collision-resolved files.
5. If everything looks correct, click Run to apply the rename mapping inside that single folder.

## UI / UX Direction
- Full-screen “glass dashboard” aesthetic with layered gradients, soft glows, and motion micro-interactions supplied by Framer Motion.
- The Ops Console card keeps all workflow controls together: folder workspace, operation builder, preview table, and actionable run buttons.
- Status text communicates what to do next (“Paste a folder,” “Preview ready,” “Folder not found”) using color cues (muted, teal OK, rose error).
- A floating “Recent folders” list along the right side lets the user re-select prior paths without re-copying from Explorer.
- Buttons highlight the expected order of operations: clipboard helper → check → configure ops → preview → run.

## Backend / API Overview
- **Tech**: FastAPI + Pydantic models, exposed via `Option_C-Max-API.py`.
- **Endpoints**:
  - `POST /preview` takes `{ folder, operations[] }`, validates the folder, simulates the rename steps, resolves name collisions by appending `_1`, `_2`, etc., and returns `{ files: [{original,new}], summary }`.
  - `POST /run` accepts the same payload, reuses the same computation, and then performs `os.rename` for each changed file before returning the summary.
- **Safety constraints**: operates only on a single directory (non-recursive). Skips files whose computed result matches the original name. Tracks collisions so the summary can alert the user.

## Frontend / App Structure
- **Framework**: Vite + React with Tailwind CSS and Framer Motion. Entry point `src/App.jsx` sets the background canvas and renders `<OpsConsole />`.
- **OpsConsole responsibilities**:
  - Manage folder path state, clipboard paste helper, debounced status messaging, and persistence of the last five folder paths in `localStorage`.
  - Capture the four rename operations, enforce one step per operation, and build an ordered payload for the backend.
  - Handle Preview / Run calls via Axios, show loading states, and display summaries + per-file mappings in a scrollable table.
  - Surface run feedback (“Running…”, “Run completed”, “Run error”) and automatically refresh the preview after a successful run.

## Data Flow Snapshot
```
User input → OpsConsole state → Axios POST to FastAPI → compute_new_names → response summary/mapping → OpsConsole preview/run table
```

## Current Boundaries
- Only simple prefix/suffix operations (no find/replace, regex, or nested folders yet).
- Relies on the user to copy/paste Windows-style paths (UI hints reflect that).
- No authentication; assumes local trusted environment with backend reachable at `127.0.0.1:8000`.

## Near-Term Opportunities
- Introduce richer rename recipes (insert at index, replace text, numbering, recursive folder support).
- Add inline validation (show sample output live as a user types).
- Provide undo/rollback, history export, or dry-run reports.
- Expand preview table with filtering, search, or download as CSV for auditing.
