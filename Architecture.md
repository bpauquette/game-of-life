## Global Keyboard Shortcuts (UI Policy)

All global UI keyboard shortcuts must be handled via a dedicated React hook: `useGlobalShortcuts` (see `src/view/hooks/useGlobalShortcuts.js`).

- This hook is imported and used in the top-level UI shell (e.g., `HeaderBar.js`).
- The hook interacts with Zustand DAOs for all global UI state changes.
- Do **not** place shortcut logic in the app root, controller classes, or deeply nested components.
- When adding new shortcuts, update this hook and document them here.

**Current shortcuts:**

- `P` - Open palette
- `G` - Toggle chart
- `H` - Toggle UI controls

This approach is React-idiomatic, architecture-compliant, and ensures all side effects are managed in hooks/components, not in pure logic or model/controller layers.
# Architecture Contract

This application uses a strict MVC + Hooks architecture.

## Core Principles
- The React App is a **composition root only**
- Domain logic must never live in React components
- Side effects must be isolated in hooks or controllers
- All game behavior flows downward from the Model
- Avoid prop drilling for shared state; prefer DAOs + hooks or context so cross-cutting settings (e.g., tool options) are read/written from a single source of truth.

## Layer Responsibilities

### Model
- Owns all game state and rules
- Contains no React, DOM, or browser APIs
- Exposes pure APIs

### Controller (GameMVC)
- Orchestrates execution, stepping, timing, and performance
- Translates user intent into model operations
- Emits domain events

### Hooks
- Bridge React lifecycle to controller/model
- Own refs, effects, and subscriptions
- Contain no JSX

### View (React Components)
- Render UI only
- Forward user intent via callbacks
- Must not:
  - access GameMVC internals
  - mutate model state directly
  - manage long-lived side effects

### GameOfLifeApp
⚠️ **SEALED FILE**
- May only:
  - compose providers
  - invoke hooks
  - render layout
- May NOT:
  - define domain logic
  - create refs beyond wiring
  - add side effects

## DAO Usage Rules
- DAOs expose state only
- No cross-DAO logic inside DAOs
- Composition happens in hooks or controllers
- Non-React code may access DAOs via adapters only

[ DAOs ]        <- raw state
[ Hooks ]       <- lifecycle + composition
[ Controllers ] <- orchestration + invariants
[ Views ]       <- rendering only
[ DAOs ]        <- raw state
[ Hooks ]       <- lifecycle + composition
[ Controllers ] <- orchestration + invariants
[ Views ]       <- rendering only

## Support-Gated Community Publishing

### Decision Summary

1. Authorization is backend-owned; UI never assumes entitlement.
2. Frontend reflects capability state and explains blocked actions.
3. Public-sharing controls are disabled when support is not verified.
4. Private saves remain available for authenticated users across shapes, grids, and scripts.

### Backend Contract This UI Relies On

- Non-donor attempts to publish/share return:
  - HTTP `403`
  - `code: "SUPPORT_ACCESS_REQUIRED"`
  - explanatory `error` message

### Frontend Behavior

- Save flow (`saveCapturedShapeToBackend`) allows private saves and propagates support-required messages only for publish attempts.
- My Shapes dialog:
  - shows that private saves are allowed
  - prevents enabling `public` for non-donors
  - still allows changing public -> private
- Save Grid dialog:
  - allows private grid saves for authenticated users
  - disables public publish toggle for non-donors
- Script save dialog:
  - allows private script saves for authenticated users
  - disables public publish toggle for non-donors

### Why This Split

- Security and policy enforcement must not live only in browser code.
- UX should reduce confusion and unnecessary failing requests while still deferring authority to the API.
