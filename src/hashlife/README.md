Hashlife Prototype
===================

This folder contains a starting point for a Hashlife implementation.

Files:
- `node.js` - canonical node objects and memo tables
- `engine.js` - tree builders and a working (brute-force) advance fallback

Notes:
- The `advance` function currently performs a correct brute-force evolution
  and rebuilds the quadtree; this is intentionally conservative and keeps
  correctness while the memoized center-step is implemented.
- The node memoization tables are present in `node.js` and will be used by
  a future optimized center-step implementation to cache intermediate
  results and allow exponential skipping.

Next steps to complete full Hashlife:
- Implement the recursive center-step (result) computation and cache
  its outputs in `resultMemo`.
- Add a worker wrapper for large advances to avoid blocking the UI.
- Add LRU eviction for large memo tables and benchmarks vs the existing
  chunked stepper.
