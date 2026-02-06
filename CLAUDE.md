# Pidy Tryon Development Guide

> **Template Version**: 1.0
> **Usage**: Copy this file to new projects as `CLAUDE.md` and customize for your project.

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Error Tracking | `ERRORFIX.md` (project root) |
| Database Design | `.claude/docs/02-DATABASE.md` |
| Full Schema | `.claude/tasks/PIDY-WIDGET_DATABASE_SCHEMA.md` |
| API Design | `.claude/tasks/PIDY-WIDGET_APPLICATION_DESIGN.md` |
| **API Flow** | `.claude/docs/PIDY-WIDGET_API_FLOW.md` |
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

## Feature Documentation Index

| Feature | Doc File | DBML Diagram | Key Scripts |
|---------|----------|--------------|-------------|
| Architecture | 00-ARCHITECTURE.md | 00-full-schema.dbml | - |
| Authentication | 01-AUTHENTICATION.md | 01-auth-tables.dbml | - |
| Database | 02-DATABASE.md | 00-full-schema.dbml | - |
| [Feature 1] | 03-[FEATURE].md | 0X-[feature]-tables.dbml | - |
| [Feature 2] | 04-[FEATURE].md | 0X-[feature]-tables.dbml | - |
| ... | ... | ... | ... |
| Repositories | 09-REPOS.md | N/A | - |
| Scripts | 10-SCRIPTS.md | N/A | All scripts |

---

## Mandatory Reference Checks

### Before Modifying ANY Feature:

1. Check the feature's doc file: `.claude/docs/0X-FEATURE.md`
2. Check the feature's DBML diagram: `.claude/diagrams/0X-feature-tables.dbml`
3. Read `ERRORFIX.md` for related fixes
4. Check if feature has related scripts in `10-SCRIPTS.md`

### Before Modifying Database/Schema:

1. Read `.claude/docs/02-DATABASE.md` for current schema overview
2. Check relevant feature DBML in `.claude/diagrams/`
3. Check migration files for existing migrations
4. Check `ERRORFIX.md` for database-related fixes
5. Review RLS policies if applicable

### Reference Lookup Table

| Modifying... | Check These Files | DBML Diagram |
|--------------|-------------------|--------------|
| Authentication | 01-AUTHENTICATION.md, ERRORFIX | 01-auth-tables.dbml |
| [Feature 1] | 0X-FEATURE.md, ERRORFIX | 0X-feature-tables.dbml |
| [Feature 2] | 0X-FEATURE.md, ERRORFIX | 0X-feature-tables.dbml |
| Database Schema | 02-DATABASE.md | 00-full-schema.dbml |

---

## Repository Structure

### Multi-Repo Projects

| Repository | Purpose | Tech Stack |
|------------|---------|------------|
| pidy | Backend API, Edge Functions, Database | [Supabase/Node/etc.] |
| pidy-app-470 | Client Application | [React/React Native/etc.] |
| genses | Supporting Service | [TBD] |
| pidy-tryon | Widget - Embeddable component | [React/vanilla JS/etc.] |

### Interface Contracts

See: `.claude/docs/09-REPOS.md` for API contracts between repositories.

### Multi-Repo Workspace Setup

For projects with multiple repositories (Backend, Frontend, Mobile, Widget), use VS Code multi-root workspace:

**Create `pidy.code-workspace`** in parent directory:

```json
{
  "folders": [
    { "path": "pidy", "name": "Backend - SOURCE OF TRUTH" },
    { "path": "pidy-app-470", "name": "App" },
    { "path": "genses", "name": "Genses" },
    { "path": "pidy-tryon", "name": "Widget" }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/.git": true
    }
  }
}
```

### Source of Truth Pattern

**Backend repository (pidy) is the single source of truth for:**
- Database schema and migrations
- API contracts and types
- DBML diagrams
- Feature documentation
- ERRORFIX.md (cross-repo issues)

**Other repos reference Backend docs:**
```
# From Widget or Mobile repo, reference Backend docs:
../pidy/.claude/docs/09-REPOS.md      # API contracts
../pidy/.claude/docs/02-DATABASE.md   # Schema reference
../pidy/.claude/diagrams/*.dbml       # Database diagrams
```

### Cross-Repo CLAUDE.md

**Backend CLAUDE.md**: Full documentation (this template)

**Frontend/Mobile/Widget CLAUDE.md**: Minimal, with references

```markdown
# [Repo Name] Development Guide

## Source of Truth
All API contracts, database schema, and shared documentation live in the Backend repo.

### Key References (in Backend repo)
| Resource | Path |
|----------|------|
| API Contracts | `../pidy/.claude/docs/09-REPOS.md` |
| Database Schema | `../pidy/.claude/docs/02-DATABASE.md` |
| Full Schema DBML | `../pidy/.claude/diagrams/00-full-schema.dbml` |
| Authentication | `../pidy/.claude/docs/01-AUTHENTICATION.md` |

## This Repo's Error Tracking
Use `ERRORFIX.md` in THIS repo root for frontend/mobile-specific fixes.

## Workflow Rules
[Same workflow rules as Backend - copy from template]
```

---

## Directory Structure

```
project-root/
├── CLAUDE.md                    # Project-specific development guide
├── ERRORFIX.md                  # Error tracking log (source of truth)
├── .claude/
│   ├── CLAUDE_TEMPLATE.md       # This template (for reference)
│   ├── docs/
│   │   ├── 00-ARCHITECTURE.md   # System overview, repo map, tech stack
│   │   ├── 01-AUTHENTICATION.md # Auth flows, JWT, security
│   │   ├── 02-DATABASE.md       # MASTER schema reference (single source of truth)
│   │   ├── 03-[FEATURE].md      # Feature-specific documentation
│   │   ├── ...
│   │   ├── 09-REPOS.md          # Repository interfaces and contracts
│   │   ├── 10-SCRIPTS.md        # Script reference
│   │   ├── PIDY-WIDGET_API_FLOW.md # Main API flow document
│   │   └── api/                 # Function-level API documentation
│   │       ├── [function-1].md  # Detailed function doc with DB tables
│   │       ├── [function-2].md
│   │       └── ...
│   ├── diagrams/
│   │   ├── 00-full-schema.dbml  # Complete database (DBDiagram.io format)
│   │   ├── 01-auth-tables.dbml  # Auth tables only
│   │   ├── 0X-[feature]-tables.dbml # Feature-specific tables
│   │   └── ...
│   └── tasks/
│       ├── PIDY-WIDGET_DATABASE_SCHEMA.md
│       ├── PIDY-WIDGET_APPLICATION_DESIGN.md
│       └── [TASK_NAME].md       # Active task plans
├── scripts/                     # Scripts (organized by purpose)
│   ├── deploy/                  # Deployment scripts
│   ├── config/                  # Configuration & secrets scripts
│   ├── test/                    # Testing scripts
│   ├── dev/                     # Local development scripts
│   ├── debug/                   # Database & log inspection scripts
│   └── data/                    # Data import/export utilities
├── supabase/                    # Supabase project (if applicable)
│   ├── functions/               # Edge Functions
│   ├── migrations/              # Database migrations (timestamped)
│   └── seed/                    # Seed data (run after migrations)
└── [project files...]
```

---

## Code Standards

### General

- **No emojis** in production code
- Keep solutions simple and focused
- Don't add features beyond what was asked
- Avoid over-engineering
- Prefer editing existing files over creating new ones

### Security

- Never commit sensitive files (`.env`, credentials)
- Validate input at system boundaries
- Use parameterized queries for database operations
- Follow OWASP top 10 guidelines

### Documentation

Each feature doc includes:
- **Overview**: What the feature does
- **Database Tables**: With link to DBML diagram
- **API Specifications**: Request/response formats
- **Code Patterns**: Examples for each repo type
- **Scripts**: Related automation scripts
- **Related Fixes**: Links to ERRORFIX.md entries

---

## DBML Diagram Format

All database diagrams use DBDiagram.io DBML format:

```dbml
// Example: Feature Tables
// Paste into https://dbdiagram.io to visualize

Table example_table {
  id uuid [pk]
  user_id uuid [ref: > auth.users.id]
  name text [not null]
  status text [default: 'pending', note: 'pending, active, completed']
  data jsonb
  created_at timestamp [default: `now()`]
  updated_at timestamp

  indexes {
    user_id
    (user_id, status)
  }
}

Table related_table {
  id uuid [pk]
  example_id uuid [ref: > example_table.id]
  value text
}
```

### DBML Benefits:
- Paste directly into https://dbdiagram.io
- Export as PNG/PDF for documentation
- Share via dbdiagram.io links
- Version control in git

---

## Scripts

### Script Directory Structure

```
scripts/
├── deploy/           # Deployment scripts
│   └── deploy-[function].ps1    # Deploy specific function/service
├── config/           # Configuration & secrets
│   └── set-[service]-key.ps1    # Set API keys/secrets
├── test/             # Testing scripts
│   ├── test-[feature].ps1       # Test specific feature
│   └── test-[feature]-local.ps1 # Test locally
├── dev/              # Local development
│   └── serve-[service]-local.ps1 # Run local dev server
├── debug/            # Database & log inspection
│   ├── check-[resource].ps1     # Check database/schema/tables
│   ├── view-[service]-logs.ps1  # View service logs
│   └── get-test-data.ps1        # Get test data
└── data/             # Data import/export utilities
    └── import-[entity].py       # Generate SQL or import data
```

### Script Naming Conventions

| Prefix | Purpose | Example |
|--------|---------|---------|
| `deploy-*` | Deploy services | `deploy-api.ps1` |
| `set-*` | Set configuration/secrets | `set-openai-key.ps1` |
| `test-*` | Test functionality | `test-api.ps1` |
| `serve-*` | Run local dev server | `serve-api-local.ps1` |
| `check-*` | Verify state/config | `check-database.ps1` |
| `view-*` | View logs/data | `view-logs.ps1` |
| `get-*` | Retrieve data | `get-test-data.ps1` |
| `import-*` | Import data (Python/SQL) | `import-products.py` |

### Script Rules

1. **NEVER read `.env` files** - scripts handle credentials, Claude should not
2. **NEVER hardcode secrets** in scripts - use environment variables
3. **Always document** new scripts in `.claude/docs/10-SCRIPTS.md`
4. **PowerShell only** - no `.sh` or `.bat` files (unless CI/CD requires it)
5. **Place in correct folder** based on purpose (deploy/config/test/dev/debug)

### When Asked to Run Scripts

- Run scripts using: `powershell -File scripts/[folder]/[script].ps1`
- Do NOT attempt to read `.env` or credential files
- If script fails due to missing credentials, ask user to verify `.env` file
