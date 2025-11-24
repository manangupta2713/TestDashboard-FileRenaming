# AGENT CONDUCT

This document is the very first stop whenever a fresh agent loads the repo. Read everything here, follow the onboarding chain exactly, and let each document guide you to the next one. The intent is to gather context in waves without hard-coding specific files inside AGENTS.md. Think of it this way:
- **Wave 0:** AGENTS.md introduces our collaboration rules and explains that every document you read will tell you which one to open next.
- **Wave 1:** The next documents (Project Brief and Progress Tracker) give you the high-level project narrative and current status, and point you onward.
- Further waves (tracker, supporting docs, code files) are described inside those downstream documents, so AGENTS.md never needs updating when priorities change.

## Collaboration Rules (STRICT)
1. Always stay in discussion mode—brainstorm and talk through each change with the user before doing anything.
2. Never write or edit code unless the user gives explicit permission in the current message. Past approvals do not carry forward.
3. Before performing a large or potentially disruptive refactor, make a copy of the affected file so the original state is preserved during the change.
4. If a proposal would change shared contracts (API payloads, backend logic, data models, etc.), stop and present options to the user before touching code. Example: when a UI request implies altering FastAPI response formats, describe both the low-impact and full-contract approaches, wait for explicit confirmation, and only then proceed. This keeps future agents from inheriting silent breaking changes.
5. Never “game” tests or water down logic just to get a green check. If a test fails, fix the underlying code or adjust the test only when it is wrong; do not remove coverage, skip scenarios, or simplify behaviour purely to make tests pass. Production quality always comes before convenience.
6. Achieve **≥90% coverage** on all working code by writing tests—**never** exclude files or branches merely to inflate coverage numbers. If an exclusion truly seems necessary, discuss it with the user and secure explicit approval before adjusting configs.
7. When the user runs backend or frontend tests on their side, they’ll log detailed failures under `Code/neura-ui/tests/backend` or `Code/neura-ui/tests/frontend` (e.g. `frontend-error.md`). Read those files for context instead of asking the user to paste full command output.

## Communication Style (STRICT)
- Assume the user is not a coder. Explain every idea and instruction in clear, simple, step-by-step language.
- Provide thorough, spoon-fed guidance for any process or proposal so the user can follow along comfortably.
- When giving directions, provide only the next 1-2 steps at a time so we can review progress together before moving forward.

## Workflow Reminders (BE DILIGENT)
- Listen closely to directions in the chat window.
- Confirm understanding and ask clarifying questions before proceeding when something is ambiguous.
- Once permission is granted, execute only the specifically approved actions and return to discussion afterwards.
- Every dashboard follows this strict sequence:
  1. **Planning** – we discuss the feature set, UI-UX, and any other considerations until a plan of action is locked.
  2. **Build** – implement the dashboard (frontend/back-end order decided case-by-case).
  3. **Refine** – multiple rounds of functionality and polish updates until the user is satisfied.
  4. **Testing** – only after the user confirms the dashboard is “fully ready” do we write comprehensive tests and prove ≥90 % coverage on all working code (no exclusions). Existing testing rules above still apply; this clause clarifies the per-dashboard cadence.

## Wave-by-Wave Onboarding Checklist
Follow these steps the first time you sit down with the repo—or anytime you need a reset:

1. **Read AGENTS.md fully (this file).** Internalize the collaboration rules and remember that you must stay in “discuss before doing” mode at all times.
2. **Proceed to Wave 1:** Open and read the project brief (`Documentation/PROJECT_BRIEF.md`) and the project progress tracker (`Documentation/PROGRESS_TRACKER.md`). These files supply the umbrella context and current status of the project, and tell you where to go next. Do not skip ahead; always let the brief and the tracker guide you.

Once you’ve completed Wave 3, you should know the project purpose, active tasks, and core implementation details. Only then should you begin discussing new changes with the user.
