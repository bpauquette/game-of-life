
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### Tests

This repo uses a small, architecture-aligned test suite under `src/new-tests/`:

- Model observer events (overlay, tool/shape selection, viewport/running)
- Renderer overlay descriptors (pure-data overlays)
- React hook `useToolStateObserver`

Run non-interactively with coverage:

```bash
npm run test:coverage
```

Run in interactive watch mode:

```bash
npm test
```

Note: Coverage thresholds are temporarily relaxed while the new suite grows; we’ll raise them as we add tests.

### `npm run build`

## SonarQube (static analysis)

This repository includes a minimal SonarQube setup to run code analysis locally or in CI.

Run locally with Docker Compose (requires Docker):

```bash
docker compose -f docker-compose.sonarqube.yml up -d
# Wait for Sonar to start (~1-2 minutes), then open http://localhost:9000
# Default admin/admin - create a token for CI.
```

To run an analysis locally you can use the official scanner Docker image (replace <TOKEN> with your admin token):

```bash
# from repo root
docker run --rm -e SONAR_HOST_URL="http://host.docker.internal:9000" -e SONAR_LOGIN="<TOKEN>" \
	-v "${PWD}:/usr/src" \
	sonarsource/sonar-scanner-cli \
	-Dsonar.projectBaseDir=/usr/src
```

CI: Add a secret named `SONAR_TOKEN` containing a token created in SonarQube and the workflow will pick it up.

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

## Learn More
## Architecture notes

Highlights:

- Tools emit overlay descriptors; model stores overlay; view passes overlay to the renderer; renderer draws descriptors.
- Model is the single source of truth for color schemes.
- UI observes the model for tool state and selection changes.


You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)
### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
# game-of-life
Simple Game of Life in react

## Additional project notes

This repository contains two main pieces:

- Frontend: a React (Create React App) app in the repository root `src/` folder.
- Backend: a small Express-based API inside the `backend/` folder used to store and serve predefined shapes.

### Configurable backend port

The backend server binds to a port chosen using the following precedence (highest to lowest):
1. `GOL_BACKEND_PORT` environment variable
2. `PORT` environment variable
3. default `55000`

Example (bash):

```bash
GOL_BACKEND_PORT=55000 node src/index.js
```

### Backend runtime & data

- Entry point: `backend/src/index.js`
- Persistent data file: `backend/data/shapes.json` (an array of shape objects)
- Simple filesystem-backed DB wrapper: `backend/src/db.js`
- Persistent storage: `backend/data/shapes.db` (SQLite DB). The legacy `backend/data/shapes.json` is kept as a local snapshot/backup only and is no longer used at runtime by the API.
- Simple filesystem-backed DB wrapper: `backend/src/db.js` (keeps compatibility for small tooling)

There are convenience start/stop scripts provided:

- `backend/start.sh` — starts the backend as a background process and writes a PID file to `backend/backend.pid` and logs to `backend/backend.log`.
- `backend/stop.sh` — stops the running backend using the PID file.

### Frontend development scripts

The frontend app is a standard CRA app. A small pair of scripts at the repository root can start/stop the frontend dev server and write `frontend.pid` / `frontend.log`.

- `./start.sh` — starts the frontend dev server (wraps `npm start`) and writes `frontend.pid`/
- `./stop.sh` — stops the frontend dev server using the `frontend.pid` file.

The repository `package.json` also contains convenience npm scripts:

```bash
npm run frontend:start
npm run frontend:stop
```

These simply invoke the root-level `start.sh`/`stop.sh` wrappers and are intended for development convenience. The start helper refuses to auto-switch ports; it checks that port `3000` is truly free before spawning CRA so all tooling can rely on a consistent URL.

### Backend API (developer-focused)

The backend exposes a small JSON API used by the front end and tooling:

- `GET /v1/health` — basic health check (200 OK)
- `GET /v1/shapes` — list shapes. Optional query param `q` filters names (case-insensitive substring match by default).
- `GET /v1/shapes/:id` — retrieve a single shape by id/name.
- `POST /v1/demo/load-glider` — demo route that returns a glider shape (used by tests and tooling).
- `POST /v1/import-rle` — (utility) accept RLE body and convert to a stored shape (used by import tooling).

Examples (curl):

```bash
# List all shapes
curl http://localhost:55000/v1/shapes

# Search shapes by partial name (3+ chars recommended from UI)
curl "http://localhost:55000/v1/shapes?q=rpent"

# Load the demo glider
curl -X POST http://localhost:55000/v1/demo/load-glider
```

### Importing shapes

Predefined shapes are maintained in the frontend source at `src/shapes.js`. The backend now persists shapes in `backend/data/shapes.db` (SQLite). The old `backend/data/shapes.json` is retained as a legacy snapshot for offline tooling only.

Import/migration tools in `backend/scripts/` now require the database and use the SQLite store at `backend/data/shapes.db` as the authoritative source. Deprecated JSON-backed scripts have been archived to `backend/scripts/legacy/`. To refresh or populate the DB from sources (`src/shapes.js`, `lexicon/`, or `all/`), run the canonical importers: `backend/scripts/import-lexicon-shapes.mjs` (for `lexicon/`) or `backend/scripts/bulk-import-all.mjs` (for `all/`). The one-time `migrate-to-sqlite.mjs` will still read `backend/data/shapes.json` if present to perform migrations.

### Notes & troubleshooting

- If you see `EADDRINUSE` when starting the backend, a local process is already bound to the configured port. Either pick a different port via `GOL_BACKEND_PORT` or stop the conflicting process.
- If `npm run frontend:start` prints that port `3000` is already in use, the guard script detected a conflicting listener (for example, a lingering CRA process or a Windows portproxy entry). Stop the process using that port (or run `scripts/windows/cleanup-gol-dev-network.ps1` as admin to remove the dev portproxy) and re-run the start command; the helper will not fall back to 3001 automatically.
- Previously this project used `lowdb`; to avoid runtime incompatibilities the backend now uses a simple fs-backed JSON store. If you reintroduce third-party DB adapters, pin the package versions in `backend/package.json`.
- **Memory telemetry**: the frontend samples Chrome's `performance.memory` every 60 seconds (development builds) and logs the results via the standard logger without opening DevTools. Adjust the cadence with `window.GOL_MEMORY_LOG_INTERVAL_MS` (milliseconds) or disable by setting `window.GOL_MEMORY_LOGGER_ENABLED = false`. Each sample is appended to `window.__GOL_MEMORY_SAMPLES__` *and* POSTed to the backend (`POST /v1/memory-samples`) so the data is persisted under `backend/data/memorySamples.json`. Query recent samples with `GET /v1/memory-samples?limit=200` or disable uploads via `window.GOL_MEMORY_UPLOAD_ENABLED = false` / `REACT_APP_MEMORY_UPLOAD_ENABLED=0`.

If you'd like a cross-platform replacement for the shell start/stop scripts (Node-based process manager), I can add a small Node script that uses `child_process` and `detect-port` to make lifecycle control work consistently on Windows/macOS/Linux.

## Controls & Tools quick reference

- Draw: Click to toggle a single cell. Click and drag to draw continuously.
- Line: Press, drag to endpoint, release to place; preview overlay shows the line.
- Rectangle: Press and drag to size an outline rectangle (not filled); release to place.
- Circle: Press and drag to size a circle; release to place.
- Oval: Press and drag to size an ellipse; release to place.
- Random Rectangle: Press and drag to size; on release, the area is filled with random live cells.
- Shapes Library: Open the palette to pick predefined patterns. When a shape is selected, a preview follows your cursor; click to place.
- Capture: Click and drag to select a rectangular region; on release a dialog opens to name/describe and save the captured pattern. The dialog previews the selection and autofocuses inputs. While typing, global shortcuts are suspended so spaces and normal text entry work.

Simulation controls:
- Start/Stop: Toggle simulation (Spacebar shortcut).
- Step: Advance exactly one generation.
- Clear: Remove all live cells and reset generation to 0.
- Population Chart: Show a chart of population over time.
- Settings: Change color scheme and other options. Color scheme changes immediately update grid and cell colors.

Navigation:
- Zoom: Mouse wheel zooms in/out; zoom snaps to device pixels for crisp rendering on high-DPI displays.
- Pan: Arrow keys pan; hold Shift for faster panning.
- Center: Press 'f' to focus the viewport on all live cells.

Rotation direction (shapes):
- The ⟳90 button on recent shape tiles rotates the shape 90° clockwise visually. Due to screen coordinates (y increases downward), this is implemented internally as a 270° mathematical rotation.

Notes on rendering cadence:
- The controller owns the simulation loop and render requests. The React app’s animation frame loop only flushes tool buffers (e.g., Random Rectangle) and does not step the world, ensuring consistent visual cadence.

## What changed recently

- Align rotate button behavior and icon: the ⟳90 action now rotates shapes clockwise (and the help text reflects this).
- Help content expanded: added detailed tool descriptions, capture flow, shortcuts (Space to Start/Stop, 'f' to Center), and clarified color scheme updates.

## Attributions

This project includes patterns from the **Life Lexicon** (Release 29, July 2018) by Stephen A. Silver, Dave Greene, and David Bell, used under the Creative Commons Attribution-ShareAlike 3.0 license (CC BY-SA 3.0).

- Life Lexicon home: http://conwaylife.com/ref/lexicon/
- License: https://creativecommons.org/licenses/by-sa/3.0/

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for complete attribution details and licensing information.

---

Happy hacking! If you want, I can also:

- Add documentation for the Shape Palette UI and how to select/place shapes from the dialog.
- Make the backend search behavior configurable (prefix vs substring) and wire it to the UI preference.

