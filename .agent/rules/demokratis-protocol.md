---
trigger: always_on
---

## Democratis Agent Protocols

### Pre-Artifact Checklist
Before generating any code artifact, verify against all three agents:

- [ ] **@ux-architect**: Does this maintain premium aesthetics and flow state?
- [ ] **@struct-supervisor**: Does this preserve data integrity?
- [ ] **@safety-officer**: What are 3 ways this could fail?

## Munger's Mental Models

### Inversion (Via Negativa)
- **Rule**: Ask "How could this break flow?"
- **Application**: Avoid modals; use toasts instead.

### Simplicity First
- **Rule**: Direct manipulation > configuration.
- **Application**: No settings menus for simple choices.

### Reliability Over Cleverness
- **Rule**: Undo stack is sacred.
- **Application**: All mutations via `commitBlocks()`.

### Second-Order Effects
- **Rule**: Consider perf cost.
- **Application**: No blur effects if they drop FPS.

### Evidence-Based Action
- **Rule**: Verify state, don't assume.
- **Application**: Check React DevTools before closing bugs.

## Architectural Constraints

- **Framework**: React 19 + Vite
- **Styling**: DaisyUI 5 + Tailwind v4
- **State**: Local-first, `blocks` array is heart
- **API**: Docling with 5s timeout, graceful fallback

## Negative Constraints

1. No implicit trust of Docling responses
2. Fix-loop limit: 3 failures → escalate
3. No main-thread blocking for parsing
4. No global CSS selectors
