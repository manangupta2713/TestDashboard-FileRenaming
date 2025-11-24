# NeuraMax Tech Stack Overview

This document captures the technologies already in use plus a wishlist of frontend frameworks to explore next. It is organized in two complementary ways so you can see the same information by dashboard and by technology.

---

## 1. Dashboard-wise Breakdown

### File Renaming Dashboard (FR-DB)
- **Frontend foundation:** React 19 rendered via Vite with ES modules and hot reloading.
- **Styling + layout:** Tailwind CSS for utility-first styling, plus custom gradients and glassmorphism helpers in plain CSS.
- **Animation:** Framer Motion drives the micro-interactions (card fade/slide, hover hints, step highlights).
- **State + logic helpers:** React Context + hooks orchestrate folder state, step assignment, preview/run toggles, and localStorage recents.
- **Networking:** Axios sends `/preview` and `/run` requests to the FastAPI backend.
- **Backend handling:** FastAPI (Python) exposes the preview/run endpoints backed by custom rename helpers and Pydantic models for validation.

### Dataset Actions Dashboard (DSA-DB)
- **Frontend foundation:** React + Vite just like FR-DB to keep tooling consistent.
- **Component system:** Chakra UI (with Emotion) supplies form controls, grid layout, theming, and toasts.
- **Animation:** Framer Motion + AnimatePresence add subtle transitions between module shells.
- **Networking:** Axios hits caption-specific FastAPI endpoints (`/dataset/captions/...`) for load/preview/run/copy/make_blank flows.
- **Backend handling:** The same FastAPI app routes to helpers in `dataset_actions_core.py` (caption loaders, prefix/suffix runners, copy/make-blank utilities, snapshot restore logic).

---

## 2. Technology-wise Breakdown

### React
- **Tier:** Frontend framework
- **Where used:** Core UI for **both FR-DB and DSA-DB**.
- **Purpose:** Component model with hooks for state, side effects, and shared context providers.

### Vite
- **Tier:** Frontend build/dev tooling
- **Where used:** Build/dev server for **all dashboards** in `Code/neura-ui`.
- **Purpose:** Ultra-fast dev server with JSX transform, TypeScript-ready bundling, and production builds.

### Tailwind CSS
- **Tier:** Frontend styling system
- **Where used:** Styling system for **FR-DB** (and global shell). DSA-DB leans on Chakra instead.
- **Purpose:** Utility classes for spacing, color, gradients, and glassmorphism cards without custom CSS files.

### Chakra UI (+ Emotion)
- **Tier:** Frontend component library
- **Where used:** Component primitives on **DSA-DB**.
- **Purpose:** Accessible inputs, grids, switches, toasts, and theming helpers; Emotion handles scoped styling.

### Framer Motion
- **Tier:** Frontend animation library
- **Where used:** Animations on **both dashboards** (card transitions, button hover states, module fades).
- **Purpose:** Declarative motion/gesture layer to keep the UI lively without imperative DOM tweaks.

### Axios
- **Tier:** Frontend HTTP client
- **Where used:** HTTP client for **both dashboards**.
- **Purpose:** Simplified POST calls to FastAPI for folder preview/run and dataset caption utilities, with error handling hooks.

### FastAPI + Pydantic + Uvicorn
- **Tier:** Backend web/API stack
- **Where used:** Backend powering **all API endpoints**.
- **Purpose:** FastAPI serves the HTTP routes, Pydantic validates request/response models, and Uvicorn hosts the ASGI server with hot reload.

### Python rename/dataset helpers
- **Tier:** Backend business logic modules
- **Where used:** Shared logic modules (`compute_new_names`, `dataset_actions_core.py`) invoked by FastAPI endpoints.
- **Purpose:** Pure-Python business logic for rename pipelines, caption edits, snapshots, and report generation so the API stays stateless.

---

## 3. Frontend Technologies to Explore Next

These are **not** in the project yet, but each one offers a different mental model for building the next dashboard. Pick whichever aligns with the UX you want to try:

### Next.js (React meta-framework)
- **Why explore:** App Router unlocks server components, nested layouts, streaming data, route groups, and server actions without extra wiring—perfect for learning how modern React can mix SSR, CSR, and edge runtimes in one place.
- **Try it for:** A dashboard that needs authenticated routes, user-specific data preloaded on the server, or incremental static regeneration so previews feel instant even when the API is busy.

### Remix
- **Why explore:** Remix treats routing, loaders, actions, and forms as first-class citizens, so you get progressive enhancement, optimistic UI, and error boundaries out of the box while staying close to web standards.
- **Try it for:** A workflow wizard or caption-review flow that streams updates as steps advance, including forms that continue to work even if JavaScript is slow or disabled.

### Astro
- **Why explore:** Astro’s island architecture renders most content to static HTML while hydrating only the widgets that need interactivity; you can even mix React, Svelte, Vue, or Solid components on the same page.
- **Try it for:** A mostly static insights board or documentation dashboard that still has a few rich controls (filters, previews) without shipping a large client bundle.

### Svelte / SvelteKit
- **Why explore:** Svelte compiles components to minimal vanilla JS, giving you built-in transitions, animations, and stores with virtually zero runtime tax; SvelteKit adds routing, adapters, and server hooks.
- **Try it for:** Animation-heavy control panels or art-directable layouts where you want to tweak transitions (possibly with Skeleton UI or GSAP) while keeping bundle sizes tiny.

### SolidJS
- **Why explore:** Solid’s fine-grained signals update only the DOM nodes that truly change, so even giant tables stay fast while still feeling React-like; JSX and context remain familiar.
- **Try it for:** Dashboards that juggle thousands of filenames, dataset rows, or live metrics where re-render performance is critical but you still want a component model.

### Vue 3 + Vite
- **Why explore:** The Composition API, script setup syntax, and reactive refs make state sharing ergonomic, while template syntax keeps your markup readable; the ecosystem (Pinia, Vue Query) covers most needs.
- **Try it for:** Rebuilding Dataset Actions to contrast hooks vs. composition functions, optionally layering Naive UI or Element Plus for polished inputs, tables, and dialogs.

### Angular
- **Why explore:** Angular ships batteries-included—routing, dependency injection, RxJS-powered data streams, typed forms, and schematics—so you can practice enterprise patterns plus strict TypeScript.
- **Try it for:** Larger admin consoles or compliance dashboards where you want guarded routes, complex form validation, and Material-style components from Angular Material or PrimeNG.

### Qwik
- **Why explore:** Qwik’s resumability pauses execution on the server and resumes only the necessary chunks on the client, delivering instant interactivity with ultra-low hydration cost.
- **Try it for:** Dashboards that must feel live on lower-powered devices (tablets, smart displays), or landing pages where SEO + performance budgets are tight but you still want dynamic widgets.

### Lit (Web Components)
- **Why explore:** Lit builds standard-compliant custom elements with scoped styling, reactive properties, and SSR support, letting you drop the same UI blocks into React, Vue, or plain HTML without wrappers.
- **Try it for:** Building reusable widget cards, status panels, or preview tables that every dashboard can embed regardless of framework choice.

### Alpine.js or HTMX
- **Why explore:** Alpine sprinkles reactivity directly into HTML templates, and HTMX swaps content via HTML-over-the-wire, letting you prototype UX with minimal tooling—ideal when you want to stay close to semantic markup.
- **Try it for:** Lightweight stats panels, notification rails, or monitoring sidebars that lean on server-rendered fragments but still react to clicks, toggles, and quick filters.

### React Three Fiber (deeper usage)
- **Why explore:** R3F bridges React and Three.js, so you can use hooks, suspense, and Drei helpers to craft cinematic 3D scenes, particle systems, or animated flows without imperative scene graphs.
- **Try it for:** Visualizing rename flows, dataset clusters, or process timelines in a spatial environment—think orbiting file nodes, glowing connectors, or 3D gauges layered behind glass panels.

Feel free to grab one of these for the next dashboard to broaden the tech palette.

---

## 4. Styling, Component, and Animation Options to Explore

Use these to pair new frameworks with fresh visual systems so each dashboard gets a distinct personality.

### UnoCSS / Windi CSS (utility-first alternatives)
- **Why explore:** Both generate utility classes on demand, support custom presets, variant groups, and attributify syntax, and can feel lighter than Tailwind when you crave bespoke tokens or dynamic theming.
- **Try it for:** Framework experiments (Svelte, Solid, Vue) where you still want utility ergonomics but also want to co-create a new design scale, gradient system, or responsive ruleset.

### CSS-in-JS stacks (Stitches, Vanilla Extract, styled-components, Linaria)
- **Why explore:** These libraries let you co-locate styles with components, define strongly typed tokens, and compile to minimal CSS; Vanilla Extract and Linaria even output static CSS at build time.
- **Try it for:** Dashboards that need theme switching, design tokens, or per-component style isolation—e.g., pairing Next.js with Stitches or Qwik with Vanilla Extract for a token-driven system.

### Component suites (Mantine, Radix UI + Stitches, Material UI, Ant Design, ShadCN UI)
- **Why explore:** Ready-made, accessible components speed up dashboards so you can focus on layout/polish; Radix primitives pair nicely with custom theming, while Mantine/MUI/Ant provide batteries-included patterns.
- **Try it for:** Rapid prototypes where you want polished tables, drawers, timelines, or form controls before layering custom art direction.

### Vue ecosystem kits (Naive UI, Element Plus)
- **Why explore:** These Vue-specific component libraries match the Composition API mindset, include data-heavy widgets, and ship theming hooks for pastel or glass-inspired palettes.
- **Try it for:** A Vue-based Dataset Actions rewrite where you want parity with Chakra’s controls but in the Vue ecosystem.

### Svelte companions (Skeleton UI)
- **Why explore:** Skeleton UI provides Svelte + Tailwind-friendly components with consistent spacing, typography, and color tokens, letting you get production-ready shells quickly.
- **Try it for:** A SvelteKit dashboard that needs inputs, tabs, and data cards without rebuilding every primitive by hand.

### Token-driven CSS (Open Props, CSS Modules, PostCSS, Sass/SCSS, Style Dictionary)
- **Why explore:** Design tokens + modern CSS features (custom properties, container queries, clamp typography) give you precise control without utilities; Style Dictionary can sync palettes across backend + frontend.
- **Try it for:** Crafting a bespoke gradient/glass system or matching client brand guidelines exactly while still shipping lean CSS.

### Animation layers (GSAP, Motion One, Lottie/Bodymovin, CSS Houdini)
- **Why explore:** These unlock timeline-based control, keyframe scrubbing, vector animations, or custom paint worklets beyond what Framer Motion covers.
- **Try it for:** Hero transitions, scroll-linked effects, or exporting After Effects animations (via Lottie/Bodymovin) that bring a visual-design-heavy dashboard to life.

### Visual-theming toolkits (Theme UI, Evergreen)
- **Why explore:** Theme-first libraries provide typography/spacing scales, color modes, and component primitives aligned with editorial layouts.
- **Try it for:** A documentation-style dashboard or brand book where consistent typography and color ramps matter more than granular utility classes.

### Lightweight sprinkle stacks (PostHTML + Alpine, HTMX + server templates)
- **Why explore:** Combining HTML preprocessors with Alpine/HTMX keeps you close to semantic markup while still enabling dynamic states, perfect for static hosts or low-JS constraints.
- **Try it for:** Sidekick panels or marketing dashboards that live alongside mostly static content but still need a few reactive zones.

Now every framework, library, and styling idea we discussed lives here for future reference.
