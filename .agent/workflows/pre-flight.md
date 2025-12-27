---
description: Pre-flight checks before major operations - ensures stable starting state
---
// turbo-all

# Pre-flight Workflow

Run before any major refactor or dangerous operation.

## 1. Git Status Check
```bash
git status --short
```
> [!IMPORTANT]
> If uncommitted changes exist, commit or stash before proceeding.

## 2. Disk Space Check
```bash
df -h . | awk 'NR==2 {print $4}'
```
> [!NOTE]
> Ensure at least 1GB free before large builds.

## 3. Dependency Check
```bash
ls -d node_modules > /dev/null 2>&1 || npm install
```

## 4. Safety Scan
Invoke `@safety-officer scan-risk` mentally before proceeding.

## 5. Inversion Exercise
List 3 ways the upcoming task could fail:

1. [ ] Failure: ... → Revert: `git checkout .`
2. [ ] Failure: ... → Revert: `npm install`
3. [ ] Failure: ... → Revert: `rm -rf dist`
