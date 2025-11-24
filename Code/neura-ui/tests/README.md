# Code Tests

This folder collects all automated checks so it is easy to spot, run, and extend them. The suite currently includes:

- **Backend unit/integration tests** (Pytest + FastAPI TestClient) with coverage settings.
- **Dataset action unit tests** (Pytest) covering `dataset_actions_core.py`.
- **Frontend component tests** (Vitest + React Testing Library) for both dashboards.
- **Linting reminders** for both stacks.

## 1. Backend Tests (Pytest)

```
cd /mnt/d/Cursor/FileOps-AddingDatasetActions
python -m pytest Code/neura-ui/tests/backend --cov=Code --cov-report=term-missing
```

What’s covered:
- `normalize_fs_path` edge cases (quotes, UNC drives, `/mnt` conversion).
- `/preview` happy path summary counts.
- `/run` selective rename flow using the new `include_files` payload.
- Dataset action internals (`dataset_actions_core.py`): previews, caption sweeps, snapshot restore, copy/make-blank helpers, and caption loading.
- Dataset HTTP endpoints (`/dataset/captions/*`) via the shared FastAPI app.

## 2. Frontend Tests (Vitest)

```
cd /mnt/d/Cursor/FileOps-AddingDatasetActions/Code/neura-ui
npm install         # once
npm run test        # one-shot
npm run test:watch  # optional dev mode
```

What’s covered:
- Ops Console workflow (check & load → configure op → preview → selective run).
- Dataset Actions dashboard (Caption Atelier) flow: load captions, configure ops, preview table selections, and filtered run payloads.

## 3. Linting / Static Checks

These aren’t under `Code-tests/` but should be part of regular CI:

```
cd Code/neura-ui && npm run lint   # React / Tailwind lint
```

Backend linting can be run via `uv pip install ruff` (future enhancement).

## 4. Adding More Tests

- Backend: drop new Pytest files into `Code/neura-ui/tests/backend`.
- Frontend: place Vitest suites under `Code/neura-ui/tests/frontend` (Vitest already watches `tests/frontend/**/*`).
- Document each addition here so future agents know the coverage story.
