# Working on Next-Gen LMS

Read README.md and IMPLEMENTATION.md first. Use LMS_PLAN.md, PROGRAM_RULES.md and UX_BLUEPRINT.md for product scope; SECURITY.md and SECURITY_TEST_PLAN.md define controls and acceptance evidence. DISCOVERY_QUESTIONS.md distinguishes unresolved policy from owner decisions. Do not silently choose policy outside the attendance design the owner explicitly delegated.

The entire LMS is not finished. Default screens use synthetic data. Full dependency/build/integration/browser verification is blocked in the current session; report exact checks and limitations, and never mark a control complete from source presence alone.

## Development

- Keep the sponsor-funded React/TypeScript/Vite + Hono/Workers + Supabase architecture unless a concrete requirement justifies a reviewed change. Do not add subscriptions or deploy automatically.
- Enforce scope and workflow state in API/database paths, including direct exposed RPCs. Version comparisons must reject NULL/stale input. Use constraints/transactions for integrity and keep server secrets out of Vite/browser code.
- Preserve annual history and separate teaching/project memberships. No participant may overwrite another's seat. Do not invent jury scoring weights, tie-breaks, retention periods or an award-priority algorithm.
- Keep real applicants, private PDFs, extracted reference content, secrets and exports out of Git and public issue/PR evidence.
- Add forward migrations; do not rewrite deployed migration history. Run relevant checks and record PASS/FAIL/BLOCKED/NOT RUN truthfully.

## GitHub workflow requested by owner

- Track every feature/fix with an issue and acceptance criteria, use the respective feature/fix branch, and commit/push coherent increments and completed work. See CONTRIBUTING.md.
- Repository: ryuma2317/Next-Gen_LMS. Keep unfinished work in draft PRs and do not merge main automatically.
- When GitHub is unavailable, prepare issue bodies in .github/handoff and record the blocker; local issue text is not a remotely created issue.
- This session's original .git is read-only. Prepared checkouts are tmp/git-handoff (bootstrap) and tmp/attendance-handoff (attendance); each has separate writable Git metadata. Keep source snapshots synchronized deliberately. Never include tmp in commits or overwrite someone else's remote work with force-push.
- GIT_HANDOFF.md records actual commits/push status. scripts/publish-handoff.ps1 supports bootstrap and attendance publishing from an authenticated environment; it has not been executed remotely here.
