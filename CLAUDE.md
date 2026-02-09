# Pidy Tryon (Widget) Development Guide

## Source of Truth

All shared documentation lives in the **Backend repo (pidy)**.

| Resource | Path |
|----------|------|
| Database Schema | `../pidy/.claude/docs/02-DATABASE.md` |
| API Contracts | `../pidy/.claude/docs/09-REPOS.md` |
| DBML Diagrams | `../pidy/.claude/diagrams/*.dbml` |
| Architecture | `../pidy/.claude/docs/00-ARCHITECTURE.md` |
| Backend ERRORFIX | `../pidy/ERRORFIX.md` |

## Widget-Specific Docs

| Resource | Path |
|----------|------|
| Widget API Flow | `.claude/docs/PIDY-WIDGET_API_FLOW.md` |
| Widget Scripts | `.claude/docs/10-SCRIPTS.md` |

---

## This Repo's Error Tracking

Use `ERRORFIX.md` in THIS repo for widget-specific bugs only.

---

## Workflow Rules

### Before Starting ANY Work

1. **Always enter plan mode first**
2. Write plan to `.claude/tasks/TASK_NAME.md`
3. Plan should include: implementation steps, reasoning, task breakdown
4. Research external knowledge if needed (use Task tool)
5. Think MVP - don't over-plan
6. **Wait for user approval before proceeding**

### Documentation Update Rules

#### When to Update ERRORFIX.md (Bugs/Mistakes)
- Bug fixes that resolve unexpected behavior
- Workarounds for external issues (API changes, library bugs)
- One-time fixes unlikely to affect future development

#### When to Update Docs (Knowledge)
- Backend/API changes -> update `../pidy/.claude/docs/` (backend is source of truth)
- Widget-specific changes -> update `.claude/docs/` in this repo

#### Rule of Thumb
> **Docs** = Future developers need to KNOW this
> **ERRORFIX** = Future developers need to NOT REPEAT this mistake

### Error Fix Rules

1. BEFORE ANY CODE CHANGE:
   - Read `ERRORFIX.md` summary table (this repo)
   - Check `../pidy/ERRORFIX.md` for related backend fixes
   - List any fix # that touches files you plan to edit (or say NONE)

2. NEVER revert or overwrite any fix without explicit user approval

3. AFTER fixing a BUG:
   - Add entry to `ERRORFIX.md` in this repo

### While Implementing

- Update the plan as you work
- **No emojis in code**
- Document changes so other engineers can continue
- Never read sensitive files that may contain credentials
- If you fix a BUG, update ERRORFIX.md. If you change a FEATURE, update docs

### Sensitive Information

- **Never ask for sensitive info in chat**
- Create sample files (e.g., `.env.example`) and ask user to add credentials
- Never read files that may contain credentials (`.env`, `credentials.json`, etc.)

---

## Tech Stack

- React
- TypeScript
- Vite
- Embeddable widget/SDK
