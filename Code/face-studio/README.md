# Face Studio (Dashboard #3)

SvelteKit + UnoCSS + CSS Houdini playground for the Face Similarity & Crop Studio dashboards.

## Quick start

```bash
cd Code/face-studio
npm install
npm run dev -- --open
```

Set `VITE_API_BASE` in a `.env` file if the FastAPI backend is not running on the default `http://127.0.0.1:8000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Launches SvelteKit in dev mode (defaults to `http://127.0.0.1:5174`). |
| `npm run build` | Produces a production build in `dist/`. |
| `npm run build:embed` | Builds and copies the output into `../neura-ui/public/face-studio` so the React shell can serve it. |
| `npm run preview` | Serves the production build locally. |
| `npm run check` | Runs `svelte-check` with the generated tsconfig. |

## Notes

- UnoCSS shortcuts/theme live in `uno.config.ts`.
- The CSS Houdini paint worklet resides in `static/houdini/orbital-noise.js` and is loaded in `src/routes/+layout.svelte`.
- InsightFace jobs are still simulated by `face_jobs.py`; the UI already submits the final payload shape for each job.
- When developing alongside the React dashboards, run `npm run dev` here and the React app will embed the http://127.0.0.1:5174 view automatically (configurable via `VITE_FACE_STUDIO_DEV_URL`).
