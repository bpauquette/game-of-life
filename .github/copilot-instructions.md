This repository is a Conway's Game of Life implementation with a React frontend and an optional Node.js/SQLite backend for shape management and tooling.

## Architecture overview
- **Frontend (CRA):** React app under `src/` with canvas-based rendering, chunked world state, and a controller-driven simulation loop.
- **Backend (Express):** Optional API under `backend/` that serves shapes and accepts imports/telemetry; runs independently on `GOL_BACKEND_PORT` (default 55000).
- **State & logic:** Core game rules live in pure model code; UI and rendering sit on top via observers and overlay descriptors.

## Core frontend structure
- `src/model/GameModel.js` — single source of truth for running state, tool/shape selection, color scheme, overlays, and viewport; emits observer events.
- `src/view/GameOfLife.js` — main UI shell and canvas event wiring (mouse, wheel zoom, keyboard pan). Integrates with `GameModel` and owns high-level dialogs.
- `src/view/renderer/*` or `src/renderer.js` (depending on refactor stage) — canvas drawing for grid and cells. Preserve devicePixelRatio handling and the two-step **draw + overlay** pattern.
- `src/model/gameLogic.js` — pure game rules (neighbor calculation and step). Any rule changes must stay pure and be covered by tests in `src/new-tests/`.
- `src/model/chunkedGameState.js` (and related) — chunked state for large worlds (chunk size 64). New features that modify cells should go through helpers such as `setCellAlive`, `placeShape`, or `applyToolOverlay` rather than mutating internal maps.
- `src/hashlife/` and `src/model/hashlife/` — experimental Hashlife engine; keep changes isolated and backward compatible with existing chunked stepper.

## Tools, overlays, and observers
- `src/model/tools/*` and `src/overlays/*` — tools emit overlay descriptors (pure data). The model stores current overlay(s); the view passes them to the renderer; the renderer only knows how to draw descriptors.
- Tool modules follow a unified interface (`onMouseDown/onMouseMove/onMouseUp/drawOverlay`). When adding tools, copy an existing one (e.g. draw/rect/random-rect) and keep logic side-effect free except for calling model APIs.
- React hooks such as `src/hooks/useToolStateObserver.js` and other `use*Observer` hooks subscribe to `GameModel` events instead of pulling state directly. When adding new observable state, extend `GameModel` events first, then wire a dedicated hook.

## Backend & data flow
- Entry point: `backend/src/index.js`; SQLite database at `backend/data/shapes.db` is the authoritative store for shapes.
- Shape importers live under `backend/scripts/` (e.g. `import-lexicon-shapes.mjs`, `bulk-import-all.mjs`) and go through the SQLite DB, not the legacy `backend/data/shapes.json`.
- RLE parsing/normalization is in `backend/src/rleParser.js`. Frontend and scripts should reuse this when possible instead of rolling their own.

## Build, run, and tests
- Frontend dev: `npm start` (or `npm run frontend:start` which wraps the dev server and enforces port 3000).
- Backend dev: `cd backend && npm install && npm start` (port via `GOL_BACKEND_PORT` → `PORT` → `55000`).
- Tests (model/overlay-focused): `npm run test:coverage` (preferred) or `npm test` for watch mode. New logic in `src/model/*`, `src/overlays/*`, or observer hooks should be covered in `src/new-tests/` rather than legacy `src/*test.js`.
- SonarQube: `docker compose -f docker-compose.sonarqube.yml up -d`, then use the helper scripts under `scripts/sonar-*.sh` when adjusting quality gates.
- Windows LAN testing: use `scripts/windows/run-setup.cmd` / `run-refresh.cmd` / `run-cleanup.cmd` to manage firewall and portproxy rules; do not duplicate this logic in Node.

## Project-specific conventions
- **Model-first:** `GameModel` is authoritative for running state, selection, overlays, and options. Avoid duplicating these in React component state; instead, observe the model.
- **Pure core logic:** Keep rules, coordinate transforms, symmetry/analysis helpers, and overlay descriptor builders pure and easily unit-testable. Side effects belong in controllers, hooks, or the backend.
- **Chunked performance:** Avoid O(n²) scans over all cells on hot paths (e.g. animation loop). Prefer working in terms of chunks or changed regions; if a global operation is needed, consider worker offload.
- **Canvas & DPR:** Preserve `devicePixelRatio` math and `ctx.setTransform` usage when changing zoom/resize behavior. Tests and mocks rely on current patterns.
- **Overlay safety:** Overlay drawing must never throw and break the main render; follow the existing try/catch pattern around `drawWithOverlay`.

## Useful reference patterns
- World stepping: see `src/model/chunkedGameState.js` `step()` calling `gameStep(getLiveCells())` and then reconciling chunks.
- Tool implementation: see an existing tool such as `src/model/tools/drawTool.js` for the expected mouse handler and overlay contract.
- Backend API usage: `README.md` and `backend/README.md` list the `/v1/shapes`, `/v1/import-rle`, and memory telemetry endpoints used by the frontend and scripts.

If you change global behavior (rendering cadence, state shape, observer contracts, or backend API), keep changes minimal, update the relevant tests in `src/new-tests/`, and, when in doubt, ask the maintainer before large refactors.

See also: `.github/SONAR_GUIDANCE.md` for SonarQube-specific guidance (logger usage, tests, stable keys).
