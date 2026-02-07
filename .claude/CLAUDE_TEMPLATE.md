# [PROJECT_NAME] Development Guide

> **Template Version**: 1.0
> **Usage**: Copy this file to new projects as `CLAUDE.md` and customize for your project.

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Error Tracking | `ERRORFIX.md` (project root) |
| Database Design | `.claude/docs/02-DATABASE.md` |
| Full Schema | `.claude/tasks/[PROJECT]_DATABASE_SCHEMA.md` |
| API Design | `.claude/tasks/[PROJECT]_APPLICATION_DESIGN.md` |
| **API Flow** | `.claude/docs/[PROJECT]_API_FLOW.md` |
| **Function Docs** | `.claude/docs/api/*.md` |
| Diagrams | `.claude/diagrams/*.dbml` (DBDiagram.io format) |

---

## Workflow Rules

### Before Starting ANY Work

1. **Always enter plan mode first**
2. Write plan to `.claude/tasks/TASK_NAME.md`
3. Plan should include:
   - Implementation steps
   - Reasoning behind decisions
   - Task breakdown
4. Research external knowledge if needed (use Task tool)
5. Think MVP - don't over-plan
6. **Wait for user approval before proceeding**

### Error Fix Rules (CRITICAL)

Use `ERRORFIX.md` in project root as the **ONLY source of truth** for past fixes.

**1. BEFORE ANY CODE CHANGE:**
   - Read `ERRORFIX.md`
   - Quote the first 5 lines in your reply
   - List any fix # that touches files you plan to edit (or say NONE)

**2. NEVER** revert or overwrite any fix listed in ERRORFIX.md without explicit user approval

**3. AFTER fixing an error:**
   - Append a new section to ERRORFIX.md with:
     - Error message
     - Root cause
     - Files changed
     - Fix summary

### While Implementing

- Update the plan as you work
- **No emojis in code**
- Document changes so other engineers can continue
- Never read sensitive files that may contain credentials
- Store error fix details in ERRORFIX.md
- After completing tasks, update plan with detailed descriptions of changes

### Sensitive Information

- **Never ask for sensitive info in chat**
- Create sample files (e.g., `.env.example`) and ask user to add credentials
- Never read files that may contain credentials (`.env`, `credentials.json`, etc.)

---

This is the original template file. See CLAUDE.md in the project root for the customized version.
