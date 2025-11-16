# Progress Tracker

## Snapshot (2024-??)
| Area | Status | Notes | Immediate Next Step |
| --- | --- | --- | --- |
| Rename engine (core helpers) | ✅ Done | Prefix/suffix add/remove helpers mirror the legacy script and normalize delimiters. | Monitor for edge cases reported by users. |
| FastAPI endpoints | ✅ Done | `/preview` and `/run` share `compute_new_names`, collision handling, and structured summaries. | Consider surfacing per-file errors after run. |
| Frontend wiring | ✅ Done | OpsConsole builds ordered payloads, calls the API, and shows preview/run summaries. | Keep parity with backend contract as it evolves. |
| Workspace / folder UX | ✅ Done | Clipboard helper, “Check & Load,” recent paths, colored guidance text. | Maybe add browse dialog or drag-and-drop in future. |
| Operations grid logic | 🟢 Polished | Auto-assigns steps when text is entered, enforces swaps, and blocks empty rows with a toast. | Add undo/redo or templates later if needed. |
| Preview table | ✅ Done | Scrollable table, alternating backgrounds, sticky header, summary pills. | Add sorting/filtering when needed. |
| Visual polish | 🟡 In progress | Gradient glass shell, corner glows, recents fly-out perfected; still tuning animations + light balance. | Finish glow alignment + add iconography. |
| Advanced rename features | 🔴 Not started | Ideas include bulk find/replace, numbering, recursive folders, undo. | Prioritize based on user feedback once core UI ships. |
| Testing & resilience | 🟡 In progress | Manual testing through UI; no automated tests yet. | Define minimum regression test list (unit + e2e) for next milestone. |

## Agent Onboarding Map
| Focus Area | Files / Folders | Read For Context | When Picking Up Work |
| --- | --- | --- | --- |
| Rename engine helpers | `Code/Option_C-Max-API.py` | Functions `apply_*` + `compute_new_names` show how prefixes/suffixes are processed, collisions counted, and summaries built. | Update helper logic or summary rules here; keep API models in sync. |
| FastAPI endpoints | `Code/Option_C-Max-API.py` | `/preview` + `/run` handlers wire the helpers into HTTP responses and reveal validation behavior. | Extend payloads or error reporting; run `uvicorn Option_C-Max-API:app --reload` for manual tests. |
| Folder workspace UX | `Code/neura-ui/src/components/OpsConsole.jsx` (Workspace + Recents blocks) | Contains folder path input, clipboard helper, recents fly-out, and status copywriting. | Adjust state names or UX hints here, keep parity with backend folder expectations. |
| Operations grid logic | `Code/neura-ui/src/components/OpsConsole.jsx` (Operations builder section) | Handles ordered steps, auto-numbering, swap safeguards, and toast messaging. | Touch this file when adding new operation types or enforcing validation. |
| Preview table + summaries | `Code/neura-ui/src/components/OpsConsole.jsx` (Preview card) | Renders renamed vs. original names plus summary chips using Axios responses. | Update table columns, sorting, or summary pills here; coordinate with backend payload whenever columns change. |
| Frontend shell & visuals | `Code/neura-ui/src/App.jsx`, `BlobField.jsx`, `WaveScene.jsx`, `Particles.jsx`, `SmokeField.jsx` | These files draw the “glass dashboard” gradients, animated blobs, and overall layout. | Modify layout/polish here; keep OpsConsole import paths intact. |
| Testing & resilience | No dedicated folder yet; manual runs through `neura-ui` UI hitting local FastAPI | Notes live in this tracker plus ad-hoc scripts. | When adding tests, create `tests/` (backend) or React Testing Library setup; document steps back here. |

## 0→1 Checklist for Incoming Agents
1. Read `AGENTS.md`, `Documentation/PROJECT_BRIEF.md`, then this tracker to anchor scope and etiquette.
2. Start FastAPI locally from `Code/` (`uvicorn Option_C-Max-API:app --reload`) so `/preview` + `/run` are reachable.
3. Inside `Code/neura-ui/`, run `npm install` once, then `npm run dev` to boot the dashboard at `http://127.0.0.1:5173`.
4. Open `Code/Option_C-Max-API.py` and `Code/neura-ui/src/components/OpsConsole.jsx` side by side; these two files cover nearly all current functionality.
5. Before coding, update the “Snapshot” table and this checklist with anything notable so the next agent lands on their feet.

## Recent Highlights
- Smart step management in OpsConsole: auto-numbering, swap behavior, and empty-row guard toasts.
- Recents panel separated from the main card so TC/MC align perfectly at shared width.
- Corner gradients now animated gently and anchored at the screen edges for a calmer backdrop.

## Open Questions
1. Should we persist successful run logs or exportable reports for auditing?
2. Do we need undo/rollback before rolling out to a wider audience?
3. Which advanced operations (find/replace, numbering, recursion) should be prioritized next?

## Next Planning Checkpoint
Once the outstanding UI polish items are identified, schedule a design/dev sync to lock the next mini-sprint (polish vs. feature expansion vs. testing).
