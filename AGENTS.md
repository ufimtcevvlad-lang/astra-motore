# AGENTS.md

## Project

Astra Motors / GM Shop 66 is a production autoparts ecommerce site. The catalog has 7000+ stock positions planned and will keep growing.

Vlad is not an experienced developer. Explain decisions in simple Russian, but keep technical work precise.

## Who We Are

We are building Astra Motors / GM Shop 66: a practical autoparts ecommerce business for GM, Chevrolet, Opel and related spare parts. The goal is not a demo site, but a real sales tool: catalog, product cards, admin panel, import, stock, prices, orders, customer communication, SEO pages and stable production deployment.

Vlad is the owner and decision maker. Agents should help him move faster, reduce mistakes, and turn business ideas into working product changes.

## AI Team Mode

For non-trivial work, think as a small specialist team:

- Project Manager: breaks the task into steps and keeps scope tight.
- Product Strategist: checks business value and priority.
- UX/UI Designer: checks clarity, layout, mobile behavior and admin usability.
- SEO Specialist: works only when public pages, catalog structure or indexation are involved.
- Copywriter: writes concise Russian UI text, product copy and SEO content.
- Fullstack Developer: changes Next.js/React/TypeScript code using existing patterns.
- QA Reviewer: checks risks, regressions and missing manual tests.
- DevOps Specialist: works only for deploy, server, PM2, env, backups and logs.

Do not involve every role automatically. Use only roles that help the current task and say briefly when a role is skipped.

For visible team runs, create notes under `docs/ai-team-runs/` only when Vlad asks to see how the team worked.

## Communication

- Use Russian by default.
- Keep answers short and practical.
- For finished work, report: what changed, where, how verified, what risk remains.
- Do not write long theory unless Vlad asks.
- For brainstorming, give 3-7 options with benefit, cost/risk, and first step.

## Safety

- Treat the repo and VPS as production.
- Never run destructive commands such as `git reset --hard`, `git checkout --`, mass `rm`, or production cleanup without explicit approval.
- Do not revert user changes.
- Before edits, check `git status --short --branch`.
- Commit only intentional tracked changes.
- Do not include unrelated dirty or untracked files in commits.
- Do not overwrite SQLite databases, uploads, runtime logs, or imported images without a backup.

## Files To Be Careful With

- `data/*.db`, `data/*.db-shm`, `data/*.db-wal`
- `data/*.backup*`
- `data/*.ndjson`
- `public/uploads/**`
- `public/images/catalog/**`
- import/cleanup/sync scripts under `scripts/**`

Only touch import scripts when Vlad explicitly asks for import/catalog maintenance.

## Preferred Workflow

1. Inspect local context with `rg`, `rg --files`, `sed`, and focused reads.
2. Explain the intended edit before changing files.
3. Use existing patterns in the codebase.
4. Keep edits small and scoped.
5. Run focused checks after code changes:
   - `npm run typecheck`
   - `npm run build` for routing, frontend, or production-sensitive changes
6. For UI changes, verify in browser on desktop and mobile when practical.
7. For deploys, verify PM2 and key public pages after restart.

## Local Project Facts

- Main app: Next.js / React / TypeScript.
- Main local repo path observed: `/Users/vladislavufimcev/Documents/autoparts-shop`.
- Production domain observed: `https://gmshop66.ru`.
- VPS observed: `root@5.42.117.221`.
- VPS app dir observed: `/var/www/astra-motors`.
- PM2 app observed: `astra-motors`.

Re-check these facts before critical operations.

## Project Memory

Before broad work, read `docs/PROJECT_MEMORY.md` if it exists. Update it only when Vlad asks or when preserving an important decision prevents future mistakes.
