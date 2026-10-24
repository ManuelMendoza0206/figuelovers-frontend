# AGENTS.md

## Project
- React 19 + TypeScript + Vite 8 SPA (single npm package). No backend code here: the FastAPI API is a separate repo at `E:\IV0_5\MAT-361` (with its own `AGENTS.md`). Most algorithm screens need it running at `http://localhost:8000`.
- Projects and graphs persist in browser `localStorage`; there is no database.
- UI copy is Spanish; keep new user-facing strings in Spanish.

## Commands
- Prerequisites: Node 20.19+ or 22.12+, npm. Install with `npm ci`.
- Dev server: `npm run dev`. Override the API with `VITE_API_URL` in `.env.local`.
- Verify before finishing: `npm run lint`, `npm test`, `npm run build`.
- Single test: `npx vitest run src/pages/TreesPage.test.tsx`.
- No separate typecheck script. `npm run build` runs `tsc -b` (app + tests) then Vite; `npx tsc -b --noEmit` is a fast check.

## TypeScript and tests
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`: use `import type` for types; enums/namespaces/parameter properties are rejected.
- Test files are included in `tsc -b`; an unused import or type error in a test breaks `npm run build`.
- Vitest + jsdom, tests colocated under `src/**/*.test.ts(x)`. `globals: false`: import `describe`/`it`/`expect` from `vitest`.
- Testing Library does not auto-clean without globals; call `afterEach(cleanup)` (see `Sidebar.test.tsx`).
- `src/test/setup.ts` stubs `ResizeObserver` and `DOMMatrixReadOnly` for React Flow. Keep those stubs when adding canvas tests.
- Constellation tests read the real files in `public/constellations/`; malformed catalog data fails tests. This repo has no CI or e2e config.

## Architecture and invariants
- `src/main.tsx` → `src/App.tsx`. Landing and Dashboard are eager; `MainLayout` and every other page are lazy.
- Perf invariant: React Flow must stay out of the initial chunk. Do not import `reactflow`, `GraphCanvas`, or `useGraphStore` from eager pages. After building, `dist/assets/index-*.js` must not contain `react-flow__handle`; React Flow belongs to a lazy vendor chunk.
- `src/store/useGraphStore.ts` is the graph source of truth. Constellation projects set `structureLocked`; structural mutations (add/move/remove/clear/replace) are rejected inside the store, not just disabled in the UI.
- Algorithm results must live in session stores so they survive navigation: `useJohnsonResult`, `useTreeResult`, `useAssignmentStore`, `useNorthwestStore`.
- Editor pages must call `useClearSelectionOnUnmount()`; otherwise a selected node/edge leaks into canvas-free screens.
- Arbitrary `node.data` is persisted graph data (roles, supply/demand, `treeValue`/`treeSide`, etc.). `src/utils/graphFile.ts` spreads it into payloads; keep `graphPersistence.test.ts` green when adding metadata.
- `Sidebar` has a properties mode and a `workbench` mode (wide panel used by `/trees`). Algorithm buttons are intentionally labeled `JOHNSON`, `ASIGNACION`, `ARBOLES`, `NORTHWEST`.
- Constellations are data-only: add a JSON file plus an `index.json` entry; no TS, route, or test changes. `public/constellations/` templates are read-only.

## API
- `src/services/api.ts` is the only HTTP layer. The axios base is `VITE_API_URL` (default `http://localhost:8000`) plus `/api/v1`; do not put `/api/v1` in the env var.
- Follow existing patterns: `extractApiErrorMessage`, `isCanceled`, and `AbortController` for cancellable calls (a canceled request must not display an error).
- The frontend calls validate/import, Johnson, assignment, Northwest, and tree build/traverse. `dijkstra` and `bfs` are backend stubs; tree reconstruction was removed from the frontend.

## UI conventions
- Tailwind 4 via `@tailwindcss/vite`; there is no `tailwind.config`. Theme tokens live in `src/index.css` under `@theme`; use tokens/classes such as `text-ink`, `text-ink-muted`, `bg-surface`, `border-border`, `brand`, `mission`, `glass-panel`, and `space-shell` instead of hardcoded palette values.
- Help lives in a contextual floating drawer: `HelpModal` plus `src/help/helpSections.tsx`. It is route-aware, so update the matching section when a page's buttons or flow change.

## README drift (trust the code)
- The README still documents tree reconstruction and entering values one by one. The current trees UI accepts comma-separated batches and has no reconstruction; `api.ts` has no `reconstructTree`.
- README directory names (`figuelovers-frontend`, `../figuelovers-backend`) do not match this checkout: frontend `E:\IV0_5FRONTEND`, backend `E:\IV0_5\MAT-361`.
