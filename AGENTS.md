# Working on Next-Gen LMS

Read README.md and IMPLEMENTATION.md first. Use LMS_PLAN.md, PROGRAM_RULES.md and UX_BLUEPRINT.md for product scope; SECURITY.md and SECURITY_TEST_PLAN.md define controls and acceptance evidence. DISCOVERY_QUESTIONS.md distinguishes unresolved policy from owner decisions. Do not silently choose policy outside the attendance design the owner explicitly delegated.

The entire LMS is not finished. Default screens use synthetic data. Local npm access is blocked; use the available GitHub connector/CI and inspect actual workflow results. Latest quiz-feature CI passes type checking, 27 domain + 52 API/PGlite + 24 preview-browser tests and production build. Live provider/device/concurrency/security verification remains incomplete; report exact checks and limitations, and never mark a control complete from source presence alone.

## Development

- Keep the sponsor-funded React/TypeScript/Vite + Hono/Workers + Supabase architecture unless a concrete requirement justifies a reviewed change. Do not add subscriptions or deploy automatically.
- Enforce scope and workflow state in API/database paths, including direct exposed RPCs. Version comparisons must reject NULL/stale input. Use constraints/transactions for integrity and keep server secrets out of Vite/browser code.
- Explicitly revoke EXECUTE from PUBLIC, anon, authenticated and service_role on new application functions, then restore only intended roles. Provider default ACLs may grant named roles directly; PUBLIC-only revocation is insufficient. Migration 005 hardens the existing function register without changing unrelated provider functions; 006 fixes intake validation and the private leave-read policy, with explicit grants for its new helper. Quiz sources require all migrations through 012; 010 stabilizes the list contract, 011 derives timed game reveal, and 012 reserves private grade/event reports for grade_work plus MFA. Always apply the complete migration set.
- Preserve annual history and separate teaching/project memberships. No participant may overwrite another's seat. Do not invent jury scoring weights, tie-breaks, retention periods or an award-priority algorithm.
- Keep real applicants, private PDFs, extracted reference content, secrets and exports out of Git and public issue/PR evidence.
- Add forward migrations; do not rewrite deployed migration history. Run relevant checks and record PASS/FAIL/BLOCKED/NOT RUN truthfully.
- Keep the HTTP contract in api/operations.mjs and api/schemas.mjs synchronized with route/DTO changes. Regenerate public/openapi.json with npm run docs:api; check:api and native route/security coverage must pass. API_GUIDE.md explains Apidog import and verification limits. Never include live tokens/private receipt proofs in examples or exported API environments.

## GitHub workflow requested by owner

- Track every feature/fix with an issue and acceptance criteria, use the respective feature/fix branch, and commit/push coherent increments and completed work. See CONTRIBUTING.md.
- Repository: ryuma2317/Next-Gen_LMS. Target development work at dev. The owner authorized merging reviewed work into dev when the exact-head checks pass. Keep production acceptance separate and do not merge main automatically.
- When GitHub is unavailable, prepare issue bodies in .github/handoff and record the blocker; local issue text is not a remotely created issue.
- This session's original .git is read-only. The current writable development checkout is tmp/dev-handoff; start new branches from its dev baseline. Quiz feature work is isolated in tmp/quiz-handoff on feat/quiz-modes, tracked by #16/#17/#18; preserve its local history when syncing API-authored Git metadata. Historical prepared checkouts are tmp/git-handoff (bootstrap), tmp/attendance-handoff (attendance), tmp/learning-handoff (learning) and tmp/verification-handoff (dependency/runtime fixes); each has separate writable Git metadata. Keep source snapshots synchronized deliberately. Never include tmp in commits or overwrite someone else's remote work with force-push.
- GIT_HANDOFF.md records actual commits/push status. scripts/publish-handoff.ps1 supports bootstrap, attendance and learning publishing from an authenticated environment; it has not been executed remotely here.

Quiz safety: fullscreen/visibility signals are advisory and client-controlled. Never claim device lockdown, cheating proof or complete monitoring, and do not automatically penalize a participant from these signals. Published quiz settings are immutable; live answer keys and score calculations stay in database paths. Teacher authoring rights do not imply private report access.
