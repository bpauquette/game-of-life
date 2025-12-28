Short guidance for AI coding agents working on Game of Life (frontend + two backends).

1) Big picture
- Frontend: Create React App under `src/` — canvas renderer + controller loop. Key model: `src/model/GameModel.js` (single source of truth).
- Backends: `game-of-life-backend` (Node/Express + SQLite) and `gol-backend` (Java/Gradle/Spring Boot, work-in-progress).

2) Key developer flows (copyable commands)
- Start frontend dev: `npm start` (or `npm run frontend:start`).
- Start Node backend dev (shapes + import scripts):
  - `cd game-of-life-backend && npm install && npm start`
  - port via `GOL_BACKEND_PORT` (historically 55000).
- Start Java backend dev (WIP):
  - `cd gol-backend && ./gradlew bootRun` (Windows: `gradlew.bat bootRun`).
- Run tests: `npm run test:coverage` (preferred) or `npm test` for watch mode.
- Sonar: `docker compose -f docker-compose.sonarqube.yml up -d` then use `scripts/sonar-*.sh`.

3) Project-specific conventions (do not deviate)
- Model-first: `GameModel` is authoritative — avoid duplicating running state in React components; use `use*Observer` hooks.
- Pure core logic: `src/model/*` and `src/hashlife/*` are pure, unit-testable. Side effects belong in controllers/hooks/backends.
- Chunked state: `src/model/chunkedGameState.js` uses chunk size 64 — prefer chunk/region operations over global scans.
- Tools/overlays: `src/model/tools/*` produce overlay descriptors; tools implement `onMouseDown/onMouseMove/onMouseUp/drawOverlay`.
- Rendering: preserve `devicePixelRatio` math and `ctx.setTransform`; use the two-step draw + overlay pattern and keep overlays non-throwing.

4) Integration & data flows
- Shapes import: `game-of-life-backend/scripts/*` → write into SQLite (`game-of-life-backend/data/shapes.db`). Frontend loads shapes from `/v1/shapes` endpoints exposed by the Node backend.
- RLE parsing: reuse `game-of-life-backend/src/rleParser.js` (if present) for normalization.
- Java backend: `gol-backend` is a migration target — schema, endpoints, and ports may differ; consult `gol-backend/README.md` before changes.

5) Where to look for examples
- World stepping: `src/model/chunkedGameState.js` (calls `gameStep(getLiveCells())`).
- Tool example: `src/model/tools/drawTool.js`.
- Renderer: `src/view/renderer/*` or `src/renderer.js` (devicePixelRatio handling).
- Node backend: `game-of-life-backend/scripts/` and `game-of-life-backend/src/`.
- Java backend: `gol-backend/build.gradle` and `gol-backend/src/main/java/`.

6) When you change behavior
- If altering rendering cadence, state shape, observer events, or backend API: update `src/new-tests/` and coordinate with maintainers before broad refactors.

7) Windows & infra notes
- Use repo scripts for Windows LAN/testing: `start-backend.ps1`, `start-frontend.ps1`, and `scripts/windows/*` (they auto-elevate where needed).

Follow these rules to stay consistent with existing tests and performance assumptions.

---

Notes: I couldn't update the original file automatically; this proposed file is ready to be moved into place, or I can try the patch again if you want me to overwrite the existing `.github/copilot-instructions.md` directly.

8) Reverse-proxy infrastructure (repo `reverse-proxy`)
- Purpose: A Docker + Caddy reverse-proxy that fronts the frontend and backend services, provides TLS, logging, and local/test/prod hostnames via `Caddyfile`.
- Key files: `reverse-proxy/Caddyfile`, `reverse-proxy/docker-compose.yml`, `reverse-proxy/rebuild-and-up.ps1`.
- Behavior:
  - `Caddyfile` routes `/*` to `gol-frontend:80` and `/api/*` to `gol-backend:55000` (internal service names used by Docker compose). Domains are injected via env vars `CADDY_PROD_DOMAIN`, `CADDY_TEST_DOMAIN`, `CADDY_EMAIL`.
  - `docker-compose.yml` defines three services: `caddy-proxy`, `gol-backend` (built from `../game-of-life-backend`), and `gol-frontend` (built from `../game-of-life`). They share `gol-network` so Caddy can address backend/frontend by service name.
  - `rebuild-and-up.ps1` tears down, rebuilds with `--no-cache`, and brings the stack up detached.

9) Recommendations for agent docs and multi-build setups
- Per-project instructions: yes — each major project/folder should include its own `.github/copilot-instructions.md` (or README section) focusing on build/run/test specifics and service boundaries. Reason: different languages, build tools, and dev flows (CRA npm vs Gradle) need concise guidance local to the code.
- Top-level repo instruction: keep a concise top-level `.github/copilot-instructions.md` that links to per-project instructions and describes cross-project flows (e.g., reverse-proxy dev stack, docker-compose orchestration, env var expectations).
- Multi-build handling (how to present to AI agents):
  - Document canonical dev orchestration commands: e.g., run frontend alone (`npm start`), run Node backend alone, run Java backend (`./gradlew bootRun`), or run proxy stack (`cd reverse-proxy && ./rebuild-and-up.ps1` / `docker compose up --build`).
  - Describe image build contexts and ports (see `reverse-proxy/docker-compose.yml` build contexts pointing to `../game-of-life` and `../game-of-life-backend`). Agents should prefer using the repo-provided compose task for multi-service integration tests/local QA.
  - Note common env vars and file-backed volumes (e.g., `${GOL_DB_PATH}`) so agents know where to persist/test data.

10) Quick examples for cross-project tasks
- Rebuild proxy + services (Windows PowerShell):
```powershell
cd reverse-proxy
.\rebuild-and-up.ps1
```
- Run frontend only (dev):
```bash
cd game-of-life
npm start
```
- Run Java backend (WIP):
```bash
cd gol-backend
./gradlew bootRun
```

Keep per-project docs small and focused; link them from the top-level instructions so agents can land in the right place quickly.