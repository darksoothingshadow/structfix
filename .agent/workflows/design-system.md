---
description: Design system setup and DaisyUI configuration workflow
---

# Design System Workflow

## Setup DaisyUI (One-time)

// turbo
1. Install DaisyUI:
```bash
npm install daisyui@latest
```

2. Configure Tailwind CSS (for v4, add to `src/index.css`):
```css
@import "tailwindcss";
@plugin "daisyui";
```

3. Define the `democratis` theme in `src/index.css`:
```css
@plugin "daisyui" {
  themes: light --default, dark,
  democratis: {
    "primary": "#7a9b7a",
    "primary-content": "#ffffff",
    "secondary": "#4a5568",
    "accent": "#68d391",
    "neutral": "#2d3748",
    "base-100": "#f7fafc",
    "base-200": "#edf2f7",
    "base-300": "#e2e8f0",
  }
}
```

## Usage Rules

- Use `btn btn-primary` instead of custom button styles
- Use `card` for block containers
- Use `input`, `textarea` for form elements
- Theme colors via CSS variables: `oklch(var(--p))` for primary

## Verification

// turbo
1. Run dev server:
```bash
npm run dev
```

2. Check browser - DaisyUI components should render with theme colors.
