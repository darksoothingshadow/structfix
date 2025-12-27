---
description: Verification workflow - technical proof of work before PR
---
// turbo-all

# Verification Workflow

Provides technical proof before submitting changes.

## 1. Build Check
```bash
npm run build 2>&1 | tail -10
```

## 2. File Length Audit
```bash
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l 2>/dev/null | sort -nr | head -10
```
> [!WARNING]
> Files over 250 lines require decomposition.

## 3. CSS Hygiene
```bash
grep -rE "style=\{\{|#[0-9a-fA-F]{6}" src/components --include="*.tsx" 2>/dev/null | wc -l
```
> Target: 0 occurrences

## 4. Type Safety
```bash
npx tsc --noEmit 2>&1 | tail -10
```

## Troubleshooting
- **Build Fail**: Check TypeScript errors
- **Large Files**: Extract to hooks/sub-components
- **CSS Issues**: Replace hex with DaisyUI classes
