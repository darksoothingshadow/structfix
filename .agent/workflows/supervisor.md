---
description: Trinity Audit - Stage-gate PR review coordinating all three agents
---

# Supervisor Protocol (Trinity Audit)

Coordinates the three agents for comprehensive PR review.

---

## Stage 1: UX Audit (@ux-architect)
// turbo
```bash
grep -rE "#[0-9a-fA-F]{3,6}" src/components --include="*.tsx" 2>/dev/null | head -5
grep -r "style={{" src/components --include="*.tsx" 2>/dev/null | wc -l
```
- [ ] No hardcoded hex colors
- [ ] Minimal inline styles (< 5 occurrences)
- [ ] DaisyUI semantic classes used
- [ ] 250-line rule respected

---

## Stage 2: Safety Clearance (@safety-officer)
- [ ] `/pre-flight` completed before major changes
- [ ] `@safety-officer invert <plan>` performed
- [ ] No Negative Constraints violated:
  - [ ] No root deletion commands
  - [ ] No secret exfiltration
  - [ ] No infinite fix-loops

---

## Stage 3: Data Integrity (@struct-supervisor)
- [ ] TypeScript interfaces for all data structures
- [ ] Export functions tested for round-trip fidelity
- [ ] Docling API errors handled gracefully
- [ ] Sanity bounds enforced (depth ≤ 5, etc.)

---

## Stage 4: Technical Proof (/verify)
// turbo
```bash
npm run build 2>&1 | tail -5
```
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] Bundle size reasonable (< 500KB JS)

---

## Verdict

| Result | Condition |
|--------|-----------|
| **LGTM** | All stages green |
| **BLOCK** | Any auditor found critical issue |
| **WARN** | Minor issues, can proceed with notes |
