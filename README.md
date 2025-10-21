
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

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

These simply invoke the root-level `start.sh`/`stop.sh` wrappers and are intended for development convenience.

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

Predefined shapes are maintained in the frontend source at `src/shapes.js`. The backend data file `backend/data/shapes.json` is used at runtime by the API. There are small import scripts in `backend/scripts/` to help convert and merge shapes into the backend data file (deduplication is performed by name). Use those scripts from the `backend/` folder when you need to refresh the backend store from `src/shapes.js`.

If you prefer a manual approach, open `backend/data/shapes.json` and paste or edit shape objects as an array of JSON objects.

### Notes & troubleshooting

- If you see `EADDRINUSE` when starting the backend, a local process is already bound to the configured port. Either pick a different port via `GOL_BACKEND_PORT` or stop the conflicting process.
- Previously this project used `lowdb`; to avoid runtime incompatibilities the backend now uses a simple fs-backed JSON store. If you reintroduce third-party DB adapters, pin the package versions in `backend/package.json`.

If you'd like a cross-platform replacement for the shell start/stop scripts (Node-based process manager), I can add a small Node script that uses `child_process` and `detect-port` to make lifecycle control work consistently on Windows/macOS/Linux.

## Attributions

This project includes patterns from the **Life Lexicon** (Release 29, July 2018) by Stephen A. Silver, Dave Greene, and David Bell. The lexicon is used under the Creative Commons Attribution-ShareAlike 3.0 license (CC BY-SA 3.0).

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for complete attribution details and licensing information.

---

Happy hacking! If you want, I can also:

- Add documentation for the Shape Palette UI and how to select/place shapes from the dialog.
- Make the backend search behavior configurable (prefix vs substring) and wire it to the UI preference.

