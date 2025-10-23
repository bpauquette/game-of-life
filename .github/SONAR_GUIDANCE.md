SonarQube guidance for automated edits
=====================================

Purpose
-------
This file gives concise, actionable rules for automated agents (and humans) to follow when making code changes in this repository. The goal is to reduce noise from SonarQube warnings and produce higher-quality, reviewable changes.

Quick rules
-----------
- Use the project's `logger` utility for runtime diagnostics. Do not commit `console.log`, `console.warn`, or `console.error` calls.
- Add or update unit tests for any non-trivial logic change.
- Avoid TODO/FIXME comments in committed code — create an issue instead.
- Keep functions small and single-purpose. Split large functions into testable helpers.
- Document exported functions with a short JSDoc (description, params, return value, thrown errors when relevant).
- Prefer early returns to reduce nesting and cyclomatic complexity.
- Always handle and log errors explicitly; don't silently swallow exceptions.
- When updating React state from async effects, guard with a mounted flag or cancel the effect to avoid "state update on unmounted component" warnings.
- Use stable keys for list rendering (use an ID or a stable fingerprint). Use index only as a last-resort fallback combined with a stable value.
- Remove unused variables and imports before committing.
- Avoid blocking or heavy work on the render path — move expensive tasks to workers, memoize results, or run them inside effects/hooks.

Patterns to avoid (examples)
---------------------------
- console.log(...)
- Leaving large, untested functions in a change
- Mutable module-level state used across requests or renders without clear lifecycle management
- Swallowing errors: try { ... } catch (e) { /* empty */ }

Examples (good vs bad)
----------------------
- Bad (console):
  - console.log('debug', value)
  - Good:
    - import logger from '../logger'
    - logger.debug('debug', value)

- Bad (state update in async effect):
  - useEffect(() => { fetch(...).then(data => setState(data)) }, [])
  - Good:
    - useEffect(() => {
        let mounted = true
        fetch(...).then(data => { if (mounted) setState(data) })
        return () => { mounted = false }
      }, [])

Verification checklist before opening a PR
-----------------------------------------
1. Run linters and tests locally: `npm test` and `npm run lint` (if present).
2. Run coverage: `npm run test:coverage` and ensure new code is covered by tests.
3. Search diffs for `console.` and `TODO`/`FIXME` tokens.
4. Confirm no new unused imports or variables (use `eslint` or `npm run lint`).

If you are an automated agent: include a brief explanation in your PR description of the specific Sonar guidelines followed (logger usage, tests added, complexity reduced).

Questions
---------
If a rule is unclear or you need permission to change core conventions (for example, adopting TypeScript or adding a new logger API), open an issue and ask the repo owner before making large changes.
