🔒 GPT-4.1 Refactor Instructions for GameOfLifeApp.js
Prime Directive

You must reduce the size and responsibility of GameOfLifeApp.js.
You are not allowed to add new logic to this file.

If a feature requires new logic, it must be placed outside this file.

Step 1 — Discover Existing Structure (MANDATORY)

Before changing any code, scan the repo and list:

Existing folders (e.g. controllers, mvc, hooks, state, etc.)

Existing patterns already in use

Files that already encapsulate logic related to this app

Output a short summary:

Existing structure:
- /mvc/GameController.js
- /state/gameDao.js
- /hooks/useSimulation.js
...

You must reuse existing patterns instead of inventing new ones.

Step 2 — Classify Everything in GameOfLifeApp.js

Produce a table before refactoring:

Section	Lines	Responsibility	Can be extracted?	Destination
imports	1–40	wiring	no	stays
useEffect #1	120–180	simulation loop	yes	existing controller
handler fn	400–430	UI event	yes	hook
derived const	612–640	computed state	yes	selector

No code or file movement until this table is complete.

Step 3 — Allowed Responsibilities of GameOfLifeApp.js

After refactor, this file may ONLY:

✅ Import hooks/controllers
✅ Call hooks
✅ Render components
✅ Pass props

It may NOT:

❌ Implement simulation logic
❌ Contain orchestration logic
❌ Access multiple DAOs directly
❌ Contain complex useEffects
❌ Create domain-derived state

Violations must be extracted.

Step 4 — Extraction Rules (Repo-Aware)
4.1 Effects

Any useEffect that:

exceeds 10 lines

touches simulation state

coordinates timers / loops

➡️ Move to the closest existing abstraction
(e.g. controller, lifecycle hook, or mvc module)

If none exists, create one new file only and justify it.

Step 4 — Documentation & Review

- Update ARCHITECTURE.md if new patterns or responsibilities are introduced.
- Request a code review from a maintainer before merging.