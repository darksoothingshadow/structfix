---
description: Design system setup and DaisyUI configuration workflow
---
// turbo-all

# Design System Workflow

## Setup DaisyUI (One-time)

1. Install DaisyUI:
```bash
npm install daisyui@latest
```

2. Add to `src/index.css`:
```css
@import "tailwindcss";
@plugin "daisyui";
```

## Usage Rules

| Element | DaisyUI Class | Avoid |
|---------|---------------|-------|
| Buttons | `btn btn-primary` | `bg-green-500 rounded...` |
| Cards | `card bg-base-100` | Custom border divs |
| Inputs | `input input-bordered` | Raw `<input>` styles |
| Modals | `modal` | Hand-rolled overlays |

## Verification
```bash
npm run build 2>&1 | tail -5
```
DaisyUI should compile without errors.
