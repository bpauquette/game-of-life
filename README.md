# Game of Life Frontend

A Create React App frontend that renders Conway's Game of Life using the shared GameModel. This repository contains only the UI layer; supporting services live in sibling repositories.

## Repository Map

- Frontend (this repo): React app under `src/`
- Node backend: `../game-of-life-backend` (Express + SQLite shapes API)
- Reverse proxy stack: `../reverse-proxy` (Caddy + Docker compose)

Keep these checkouts side by side so scripts that refer to relative paths continue to work.

## Prerequisites

- Node.js 20 LTS (matches `.nvmrc`)
- npm 10+
- Optional for full stack: Docker Desktop (if using the reverse proxy compose stack)

Install dependencies once:

```bash
npm install
```

## Quick Start (Frontend + Backend)

1. In `game-of-life-backend` run:

    ```bash
    npm install
    npm start
    ```

    The backend listens on `http://localhost:55000` by default (override with `GOL_BACKEND_PORT`).

2. In this repository run:

    ```bash
    npm start
    ```

    The CRA dev server boots on `http://localhost:3000`. If the port is taken, stop the conflicting process instead of relying on CRA to pick another port; several scripts expect 3000.

### Provided helper scripts

- `npm run frontend:start` / `npm run frontend:stop` wrap the shell helpers and enforce the port checks mentioned above.
- `start-backend.sh` / `start-frontend.sh` (and their `.py` variants) are cross-platform launchers used by CI and Windows automation. Prefer these when integrating with OS services.

### Reverse proxy stack (optional)

If you need the Dockerized proxy + services for local QA:

1. Ensure `game-of-life`, `game-of-life-backend`, and `reverse-proxy` folders are siblings.
2. From `reverse-proxy` run:

    ```bash
    ./rebuild-and-up.ps1   # Windows PowerShell
    # or
    docker compose up --build
    ```

    Caddy fronts the frontend on `https://gol.localhost` and the backend on `/api/*`. Configure domains via the env vars documented in `reverse-proxy/Caddyfile`.

## Tests

The authoritative suite lives under `src/new-tests/` and aligns with the MVC architecture (model observers, renderer descriptors, hooks).

```bash
npm run test:coverage  # CI-style run
npm test               # watch mode
```

## Architecture Guardrails

The project enforces a strict MVC + hooks split. Review these before making changes:

- [Architecture contract](Architecture.md)
- [Prime directive for GameOfLifeApp](prime-directive.md)
- Model-first guidance in [.github/copilot-instructions.md](.github/copilot-instructions.md)

Key reminders:

- `GameModel` is the single source of truth.
- Controllers and hooks own orchestration and side effects; React components render only.
- Do not add logic to `GameOfLifeApp.js` beyond composing hooks and layouts.

## Current Known Issues

Open, high-priority defects live in [BROKEN_ITEMS.csv](BROKEN_ITEMS.csv). Review this list before starting new work so you avoid duplicating investigations and understand the current broken flows (run controls, tool commits, shape palette dialog, load grids, canvas init, statistics panel, etc.).

## Troubleshooting & Tooling

- Port conflicts: use `scripts/windows/cleanup-gol-dev-network.ps1` (runs elevated) or terminate the lingering process manually.
- Memory telemetry: toggle via `window.GOL_MEMORY_LOGGER_ENABLED` (frontend) or disable uploads with `REACT_APP_MEMORY_UPLOAD_ENABLED=0`.
- ADA/Accessibility policies, deployment steps, and other domain notes are documented in dedicated markdown files at the repo root.

## Next Steps for New Contributors

1. Run the backend + frontend locally and confirm `/v1/shapes` responds.
2. Read `Architecture.md` and the tool docs in `src/model/tools/` before modifying simulation logic.
3. Pick an item from [BROKEN_ITEMS.csv](BROKEN_ITEMS.csv) or the issue tracker and coordinate with maintainers.

