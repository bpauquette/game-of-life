This repository is a Conway's Game of Life implementation with a React frontend and optional Node.js backend for shape management.

## Architecture Overview
**Frontend**: Create React App with canvas-based rendering for performance
**Backend**: Express.js API for shapes catalog (optional, runs independently)
**State Management**: Chunked world state for large simulations with React hooks
**Tools System**: Modular drawing tools with unified mouse event interface

Key goals for an AI coding agent working on this repo:
- Preserve the canvas-based rendering approach (see `src/GameOfLife.js` and `src/renderer.js`). Changes should maintain devicePixelRatio handling and the two-step draw+overlay pattern used by tools.
- Prefer pure, testable logic in `src/gameLogic.js` and keep side-effectful rendering/DOM code in React components/hooks.
- Performance-sensitive state uses a chunked structure in `src/chunkedGameState.js`. Avoid large, unconditional conversions between chunked and flat maps in hot paths.

## Important files and what they contain:
**Core Frontend:**
- `src/GameOfLife.js` — main UI and canvas event wiring (mouse, wheel zoom, keyboard pan). Use this as the primary integration point for UI changes.
- `src/renderer.js` — drawing logic for grid and cells. Follow its coordinate math and HSL coloring when adding visuals.
- `src/gameLogic.js` — pure game rules: neighbor calculation and step function. Unit-test any changes here.
- `src/chunkedGameState.js` — optimized state for large worlds (chunk size 64). New features that modify cells should call `setCellAlive` / `placeShape` to keep chunk invariants.

**Tools & Hooks:**
- `src/tools/*` — small, self-contained interaction helpers (draw, line, rect, etc.). Tools expose `onMouseDown/onMouseMove/onMouseUp/drawOverlay` hooks; follow that API when adding new tools.
- `src/hooks/useCanvasManager.js` — canvas operations, drawing, and mouse interactions
- `src/hooks/useShapeManager.js` — shape loading and management from backend

**Backend (Optional):**
- `backend/src/index.js` — Express API for shapes catalog (health, list/get shapes, import RLE)
- `backend/src/rleParser.js` — Run Length Encoded pattern parser for Conway patterns
- `backend/data/shapes.json` — shape database (LowDB)

## Project-specific conventions:
- Keep pure logic (game step, neighbor math) in `src/gameLogic.js` so it can be used by both chunked and non-chunked state implementations.
- UI state lives in hooks (`useChunkedGameState`, `useGameState`). Prefer `chunksRef` and `liveCellsRef` patterns used in those files when adding non-reactive, fast-access state.
- Drawing routines receive refs and pixel sizes rather than reading global component state; pass explicit parameters when calling `drawScene`/draw helpers.
- When changing zoom/size, carefully handle `window.devicePixelRatio`. See `resizeCanvas` and wheel zoom code in `src/GameOfLife.js` for exact math.

## Build, test, and run commands:
**Frontend:**
- Start dev server: `npm start` (Create React App)
- Run tests: `npm test` (project uses react-scripts/jest; tests are under `src/*.test.js`)
- Build production bundle: `npm run build`
- Process management: `npm run frontend:start|stop|status` (uses `scripts/manage.js`)

**Backend:**
- Start backend: `cd backend && npm start` (runs on port 55000 by default)
- Or use env: `GOL_BACKEND_PORT=4001 bash backend/start.sh`
- Process management: `npm run backend:start|stop|status`

**Both:**
- SonarQube analysis: `docker compose -f docker-compose.sonarqube.yml up -d`

## Edge-cases and priorities for fixes/PRs:
- Avoid introducing synchronous O(n^2) conversions over all cells on the main animation path. If you must, throttle or run in a worker.
- Ensure canvas transforms and DPR scaling remain correct in tests that mock canvas (see comments in `GameOfLife.js` about `ctx.setTransform`).
- Preserve tool overlay isolation: overlay drawing must never throw and break the main render (see the try/catch in `drawWithOverlay`).

## Example snippets to refer to:
- Stepping the world: `src/chunkedGameState.js` -> `step()` calls `gameStep(getLiveCells())` then converts to chunks.
- Tool interface: `src/tools/drawTool.js` exports `onMouseDown/onMouseMove/onMouseUp/drawOverlay` used by `GameOfLife.js`.

If you modify global behavior (rendering, state shape, or public API of hooks), add or update tests in `src/*.test.js` and keep changes minimal and well-scoped.

If anything above is ambiguous or you need deeper context (preferred behaviors for large-world performance, intended UX for new tools, or color-scheme rules), ask the repo owner before large changes.
