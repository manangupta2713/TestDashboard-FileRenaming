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
