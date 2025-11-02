# ADR: Overlay descriptors and observer-driven UI (2025-11-02)

## Context
- Overlays were previously rendered by view-specific classes and coupled to the controller/renderer.
- Tool state updates were observed in ad-hoc ways across layers.
- Color scheme selection was inferred in the renderer.

## Decision
- Introduce pure-data overlay descriptors (`src/overlays/overlayTypes.js`).
  - Tools return descriptors (e.g., `shapePreview`, `cellsHighlight`) from `getOverlay`.
  - Model stores the current overlay via `setOverlay` and emits `overlayChanged`.
  - View fetches overlay from model and passes it to the renderer.
  - Renderer draws descriptors; no controller/model imports.
- Normalize color scheme flow: model is the single source of truth. Renderer receives a concrete scheme.
- Observer pattern strengthened: model emits events for UI (`selectedToolChanged`, `selectedShapeChanged`, `cursorPositionChanged`, `viewportChanged`, `runningStateChanged`, and `toolStateChanged`).
- Tests now target the new architecture under `src/new-tests/`.

## Consequences
- Tools stay pure and easy to test; renderer is decoupled and focused.
- UI observes the model; fewer cross-layer dependencies.
- Migration notes:
  - Prefer descriptor-based overlays in tools; legacy `drawOverlay` may remain temporarily for back-compat.
  - Avoid importing the renderer from tools.

## Next Steps
- Continue converting remaining tools to descriptor overlays.
- Eliminate CommonJS `require` in favor of `import` (project-wide).
- Expand tests and gradually raise coverage thresholds.
