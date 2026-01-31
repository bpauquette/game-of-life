## Feature Request

### Goal
<what the user experiences>

### Architectural Constraints (mandatory)
- Do not modify GameOfLifeApp
- Follow MVC strictly
- No new logic in React components (only rendering and prop wiring allowed)
- All side effects must live in hooks or controllers
- If unsure, reference ARCHITECTURE.md and ask for clarification

### Entry Point
<e.g. GameMVC.addFoo() or useFooController()>

### Expected Data Flow
UI → Hook → Controller → Model → Event → Hook → UI

### Related Issues/Context
<links to issues, discussions, or prior attempts>

### Deliverables
- API surface (interfaces first)
- Minimal implementation
- No unrelated refactors

### Testing/Acceptance Criteria
- [ ] Unit tests for new hooks/controllers
- [ ] Integration test for feature flow
- [ ] Manual test steps (if needed)
