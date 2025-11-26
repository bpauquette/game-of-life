// This script was used historically to bulk-generate SVG/PNG thumbnails
// for shapes in backend/data/shapes.json. That behavior has been moved
// into the runtime POST /v1/shapes handler so thumbnails are generated
// when a shape is saved from the UI (capture/import). To avoid confusion
// we keep a small deprecation stub here. If you need to re-run bulk
// generation, consider using one of the newer scripts in this folder
// (generate-thumbnails-all.js or generate-thumbnails-named.js) or re-run
// a custom ad-hoc script.

console.error('generate-thumbnails.js is deprecated and intentionally disabled.');
process.exit(1);
