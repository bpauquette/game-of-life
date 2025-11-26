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

-- Notes
- This is a prototype. Shapes are persisted in `backend/data/shapes.db` (SQLite). The legacy JSON export `backend/data/shapes.json` is kept as a local snapshot/backup for tooling, but backend runtime and scripts prefer the SQLite database.
- Deprecated or one-time scripts that previously used `shapes.json` have been archived to `backend/scripts/legacy/`. Use the canonical importers: `backend/scripts/import-lexicon-shapes.mjs` (for `lexicon/`) and `backend/scripts/bulk-import-all.mjs` (for `all/`).
- Memory telemetry samples are persisted in `backend/data/memorySamples.json`. Rotate or purge the file if you need to reset history.
- When ready, we can extract this into its own repo and add CI/CD.
