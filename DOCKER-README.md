# Game of Life – Docker Setup

This document explains how to run the Game of Life frontend together with the backend using Docker.

## Repositories

- Frontend: `game-of-life` (this repo)
- Backend: `game-of-life-backend` (sibling folder: `../game-of-life-backend`)

The `docker-compose.yml` in this repo assumes the backend repo is checked out one directory up at `../game-of-life-backend`.

## Services and Ports

Docker Compose defines two services:

- `backend`
  - Builds from `../game-of-life-backend`.
  - Listens on port `55000` inside the container.
  - Published on host as `http://localhost:55000`.
- `frontend`
  - Builds from `.` (this repo).
  - Production React build served by `nginx` on port `80` inside the container.
  - Published on host as `http://localhost:3000`.

Inside the Docker network, the frontend talks to the backend at:

- `http://backend:55000`

## Environment and URL resolution

The frontend resolves the backend base URL in the following order:

1. `REACT_APP_API_BASE` (preferred, used in Docker builds)
2. `REACT_APP_BACKEND_BASE` (legacy override)
3. `window.location` host + `REACT_APP_BACKEND_PORT` or `55000` (default)

In Docker, `docker-compose.yml` passes:

```yaml
frontend:
  build:
    context: .
    args:
      REACT_APP_API_BASE: "http://backend:55000"
```

The `Dockerfile` forwards this build arg into the React build via:

```dockerfile
ARG REACT_APP_API_BASE
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}
```

This ensures the compiled frontend uses `http://backend:55000` when running in containers, while local non-Docker usage continues to default to `http://localhost:55000`.

## One-time prerequisites

Make sure you have Docker (and Docker Compose) installed and running.

Ensure the backend repo exists at the expected relative path:

```text
<some-root>/game-of-life          (this repo - frontend)
<some-root>/game-of-life-backend  (separate backend repo)
```

## Build and run with Docker Compose

From the `game-of-life` repo root:

```powershell
# Build images
docker compose build

# Start both services in the background
docker compose up -d

# Follow logs (optional)
docker compose logs -f
```

Then open:

- Frontend: `http://localhost:3000`
- Backend (for debugging): `http://localhost:55000/v1/health`

## Stopping and cleaning up

To stop the containers without removing them:

```powershell
docker compose stop
```

To stop and remove containers, networks, and default volumes:

```powershell
docker compose down
```

If you need to rebuild after code changes:

```powershell
docker compose build
docker compose up -d
```

## Local (non-Docker) development

For reference, you can still run the frontend and backend directly on your host:

- Frontend dev server (from `game-of-life`):

  ```powershell
  npm install
  npm start
  ```

- Backend (from `game-of-life-backend`):

  ```powershell
  npm install
  npm start
  ```

By default, the frontend will call the backend at `http://localhost:55000` when these are run directly without Docker.
