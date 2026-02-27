# Known Bugs & Issues

## Critical (High Priority)
- **PayPal SDK race condition**: If PaymentDialog is opened and closed rapidly, the SDK may still be loading when buttons are initialized. Mitigation: Added `pointerEvents: none` while loading.
- **Origin validation strict**: Payment endpoints reject requests from unexpected origins. If frontend URL changes, update `FRONTEND_URL` in `.env` and redeploy.

## Medium Priority
- **ESLint build failures on deploy**: Import path typos (e.g., `../AuthContext` vs `../auth/AuthProvider`) cause build failures at Docker build time, not locally. Mitigation: Pre-commit hook now catches these before push.
- **Missing PropTypes on complex components**: HeaderBar's AuxActions had undocumented props leading to bugs like missing `enableAdaCompliance`. All new props should be added to propTypes.
- **ADA compliance state recovery**: When toggling ADA mode off, preferred performance settings now restore correctly. Previously, caps were lost because preferred state wasn't separate.

## Lower Priority
- **Support status not refreshed on PayPal success**: Currently relies on `refreshMe()` on login. If user supports without logout, `hasSupported` won't update until next session. Mitigation: Call `refreshMe()` in PaymentDialog after successful support record.
- **Photosensitivity tester gated to ADA mode**: Checkbox disabled unless ADA on; button hidden unless both ADA and tester enabled. Works but UX could be clearer (add explanatory tooltip).
- **SQLite migrations manual**: If schema changes, need to manually run migrations on existing databases. No automated migration runner.

## Testing Gaps
- PayPal integration test added but Stripe webhook tests are minimal
- Canvas renderer edge cases (device pixel ratio, zoom levels) lack coverage
- Auth flow (login/register/reset) has some tests but edge cases exist (concurrent login attempts, expired token refresh)

## Architecture Debt
- Canvas rendering tightly coupled to React state; hard to test in isolation
- Multiple observer patterns (game loop, ADA compliance, auth context) could be unified into single state machine
- No TypeScript; prop drilling errors catch at runtime, not dev time

## How to Report New Bugs
1. Check this file first—your issue may be listed with known mitigations
2. Add a new entry with: **Title** (severity), **Description**, **Reproduction steps**, **Mitigation**
3. Run the test suite before filing: `npm test`
4. Check pre-commit hook is working: `git commit` should lint staged files

---
Last updated: 2026-01-09
