# Game of Life — Backend (shapes catalog prototype)

This is a lightweight backend prototype for the Game of Life shapes catalog.
It provides a small REST API to list shapes and import RLE pattern text.

Quick start (backend folder):

```bash
cd backend
npm install
npm start
```

Environment / port
- The backend will use the port defined by the `GOL_BACKEND_PORT` environment variable if present.
- If `GOL_BACKEND_PORT` is not set, it will fall back to the common `PORT` env var. If neither is set, the default is `55000`.
- To start on a custom port (example 4001):

```bash
# from repo root
GOL_BACKEND_PORT=4001 bash backend/start.sh
# or from backend folder
GOL_BACKEND_PORT=4001 bash ./start.sh
```

APIs
- GET /v1/health — basic health check
- GET /v1/memory-samples — fetch the most recent memory telemetry samples (query `limit`, default 200)
- POST /v1/memory-samples — append one or more telemetry samples (`{ samples: [...] }`)
- GET /v1/shapes — list shapes (optional query `q` to search name)
- GET /v1/shapes/:id — get a single shape by id
- POST /v1/import-rle — import an RLE payload
  - Accepts JSON { "rle": "..." } or text/plain body containing RLE

Notes
- This is a prototype. We store shapes in `backend/data/shapes.json`. For production, use a proper database and add authentication, rate limits and licensing/attribution handling.
- Memory telemetry samples are persisted in `backend/data/memorySamples.json`. Rotate or purge the file if you need to reset history.
- When ready, we can extract this into its own repo and add CI/CD.
