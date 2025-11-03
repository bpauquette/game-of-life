# ADR: One-time MVC initialization in GameOfLifeApp

Date: 2025-11-02

## Status
Accepted

## Context

GameOfLifeApp creates the MVC stack (GameMVC) which:

- Binds DOM/canvas listeners (mouse, keyboard, wheel)
- Starts a controller-managed simulation/render loop
- Registers model observers to notify the React UI

Re-creating the MVC on UI changes (e.g., colorSchemeKey, selection handlers) would:

- Rebind listeners, causing duplicate events and unstable input handling
- Risk multiple game loops, frame contention, and jank
- Disrupt internal controller/model state and cached renderer resources

At the same time, we must still react to dynamic settings (e.g., color scheme changes) without tearing down the MVC.

## Decision

- Initialize GameMVC exactly once in a dedicated `useEffect` with an empty dependency array.
- Suppress `react-hooks/exhaustive-deps` for this effect with a localized ESLint disable/enable and an explanatory comment.
- Handle dynamic updates through targeted effects and model observers:
  - Color scheme is applied by a separate effect that calls `gameRef.current.setColorScheme(...)` and updates renderer options, then requests a render.
  - Tool/shape selection changes are observed via `game.onModelChange(...)` and mapped into minimal React state for display.
  - Performance/steady-state tracking hooks into model/controller callbacks without reinitializing the MVC.

## Consequences

Pros:

- Stable, single-binding of event listeners and controller loop
- Avoids duplicate stepping and rendering
- Clear separation: MVC lifecycle vs. dynamic render options

Cons:

- Requires a linter suppression for the one-time effect
- Contributors must understand that MVC creation is intentionally not reactive; updates must flow through the model/controller APIs

## Implementation Notes

- In `src/view/GameOfLifeApp.js`:
  - A block comment documents why the effect runs once and how updates are handled elsewhere.
  - `/* eslint-disable react-hooks/exhaustive-deps */` is scoped to just this effect and re-enabled immediately after.
  - A separate effect handles color scheme application and renderer option updates.

## Alternatives Considered

- Making MVC creation reactive (depend on colorScheme/handlers): rejected due to listener duplication, multiple loops, and flicker.
- Hoisting MVC to a higher-level singleton: would complicate tests and modularity; the current approach is sufficient with clear documentation.
