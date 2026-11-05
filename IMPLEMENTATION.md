# Implementation and next steps

## Build 0.1 — foundation

This is an initial development increment, not a production-ready LMS. No cloud resources were created and no real accounts or records were imported.

### Written

- Responsive React/TypeScript interface with original CSS artwork, desktop/mobile navigation, synthetic overview, subject selection, timetable and all requested role previews.
- Explicit not-implemented states for attendance capture, projects and community. Role previews are presentation only; they cannot grant a live role.
- Optional existing-account Supabase password sign-in. Browser sessions stay in memory, survive client navigation, refresh through the provider and end on page reload. No service-role key is used. Recovery, admission activation, MFA enforcement and approved final sign-in provider still need implementation/review.
- Hono API: health, verified identity, active memberships, visible editions, class catalog, own enrollments and section claim. Caller-token Supabase clients preserve RLS; authentication uses provider `getUser`, not an unverified JWT decode. No cookie-authenticated mutations exist in this increment; future cookie support needs the documented CSRF work.
- Database migration: yearly membership assignments, subjects/sections, enrollments and minimal claim audit events, with RLS and no participant table-write grants. Membership administration is deliberately available only through trusted operator SQL for now.
- Transactional claim RPC: membership/department checks, annual core/elective limits, open-selection gate, per-user advisory lock and section-capacity row lock, duplicate-subject protection and idempotent retry. No participant overwrite/move/cancellation endpoint exists yet.
- Automated test sources for domain rules, API boundaries, PostgreSQL permissions/claims and browser preview flows.

### Verification on 2026-11-05

- `npm.cmd run test:domain`: PASS, 3 tests, no installed dependencies required (Node 24.13.1).
- TypeScript/TSX syntax parsing: PASS for 11 source/config/test files using the installed runtime's parser. This is not a TypeScript type check or build.
- Dependency installation: BLOCKED, outbound request to registry.npmjs.org rejected with EACCES in this session. No lockfile was generated. Dependency declarations are initial selections, not a successfully resolved/tested combination.
- Type checking, Vite/Worker build, API tests, PGlite database tests and browser tests: NOT RUN because dependencies could not be installed. Browser rendering and visual/accessibility QA remain unverified.
- No Supabase migrations have been applied to a real database. No multi-connection concurrency/load test, live Auth test, penetration test or deployment validation has run.

PGlite test code uses a PostgreSQL engine and an Auth shim; even when it passes it cannot replace actual Supabase policy/Auth testing or simultaneous multi-connection race tests. Browser tests use synthetic data only. The security acceptance register remains NOT RUN until each scenario has real evidence; the three domain tests provide only narrow supporting evidence.

## Run locally

Node 22.12+ (Node 24 recommended), npm, and registry access are needed. On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`; do not relax machine execution policy just for this project.

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL Vite prints, normally http://127.0.0.1:5173. The default experience uses bundled synthetic sample data. Selections are in memory and reset on reload; no real enrollment is made. There are no external fonts, image services or paid accounts needed for the preview.

After successful dependency resolution, review and commit `package-lock.json`. Use `npm.cmd ci` for subsequent reproducible installs. Resolve any compatibility/build issues before calling the foundation verified. Never fabricate a lockfile.

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright browser installation needs network access and disk space. Test tools are development dependencies, not production runtime services.

## Optional live foundation setup — use a separate development project

1. Have a continuing teacher/platform owner create an approved Supabase development project, or use the Supabase CLI locally with Docker. Do not use real applicant data for setup/testing.
2. Review and apply `supabase/migrations/202611050001_foundation.sql` through the project's migration process. It assumes Supabase's `auth.users`, `auth.uid()`, `anon` and `authenticated` roles already exist. The PGlite Auth shim belongs only in tests.
3. Copy `.env.example` to `.env.local` and `.dev.vars.example` to `.dev.vars`, then set the same project's HTTPS URL and public publishable key in both. These examples contain no credentials. Never substitute a secret/service-role key, especially in `VITE_*` variables.
4. Create an approved synthetic account in Supabase Auth and a synthetic edition. Using the trusted SQL operator, add its `edition_members` row with `role='trainee'`, the appropriate department, and `active=true`. Create offerings and sections; all editions default to selection closed. Review readiness before setting `selection_open=true`. There is no public signup, member-management UI or self-promotion path.
5. Start/restart Vite. Sign in with that test account and verify only assigned editions are visible. Test with a second identity and no membership as well. Use the documented API/database acceptance scenarios before adding real data.
6. Keep production callbacks, email, MFA, rate limiting, audit/monitoring, backups, privacy approval and launch gates as unfinished requirements. This prototype must not be exposed as a live intake system.

The UI currently supports one membership context display per edition; advanced multi-role switching and role-specific live tools remain future work. API/database authorization remains independent of the preview selector. Subject counts are annual configuration. More flexible specialization/eligibility mapping, dated scheduling and timetable collision policy need the recorded program decisions before implementation.

## Deployment

Cloudflare's Vite plugin is configured for Worker API plus static frontend assets; `wrangler.jsonc` is the source configuration. `npm.cmd run build` should produce client and Worker output. Verify plugin-generated Wrangler configuration and asset routing in `npm.cmd run preview` before deployment.

Only after code checks and the README launch gates pass: configure production public client variables at build time and Worker variables/secrets through the provider, then use the reviewed release process. `npm.cmd run deploy` builds and invokes Wrangler; it is not an authorization to purchase or publish a production service. No deployment was performed here.

Static response headers are specified in `public/_headers` and API headers in Hono. A deployment-specific enforced CSP, validated domain/HSTS strategy, distributed rate limiter, privileged MFA, operational backup and alert delivery are still pending; no comprehensive security claim is made for these initial headers.

## Next implementation sequence

1. Restore package access, install/review dependencies, commit the lockfile, run checks and fix any findings; perform desktop/mobile and keyboard QA.
2. Exercise migrations and claim races against isolated Supabase/PostgreSQL, including final-seat races across connections, quota races, closed-window transitions and membership revocation. Expand integration tests for configurable limits and affiliation rules.
3. Implement approved identity lifecycle, MFA, invitation/recovery, scoped administrator setup/readiness and a reviewed permission matrix before real intake. Add distributed abuse controls and baseline monitoring.
4. Build admissions and activation; dated classes, lessons/assessments; supervised attendance and leave workflows; certificates with reviewed eligibility.
5. Build independent teaching/project teams, scoped boards/mentoring and room allocation/booking after the remaining policies are decided.
6. Build versioned jury scoring, conflict checks, organizer-confirmed awards and cyber-team-backed voting. Obtain the real rubric and verification contract before enabling these features.

All originally requested workflows remain in the program plan. Shipping a foundation does not remove the remaining scope or resolve unanswered policy by assumption.

## Build 0.2 — admissions and repository handover

Added source for application forms, private receipts/status, reviewer queues, a form-version builder, MFA verification using an already-enrolled authenticator, verified-email activation and password setup. Submitted answers retain their question/version snapshot. Review requires an explicitly assigned edition capability plus `aal2`, with stale-version checks and audit history. Trainer passing means interview outcome; trainee passing means orientation outcome. No operator capabilities are granted automatically while the owner's permission matrix is unresolved.

The new migration is `202611050002_admissions.sql`. Public submission/status RPCs are executable only by `service_role`, through a bounded Worker bridge. Add the server-only `SUPABASE_SECRET_KEY` to the Worker environment, NEVER a Vite variable. Missing secret or `ADMISSIONS_LIMITER` configuration disables public writes. The proposed Cloudflare IP limiter is coarse/per-location, not a global person counter; test campus bursts before launch. Receipts use 32 random client-generated bytes and stored SHA-256 digests. Retries must use identical credentials/payload, and status responses contain no answers/contact details.

Passed applications queue invitations; the scheduled handler is disabled by default. No cron trigger or email configuration was installed and no email was sent. Before enabling it:

1. Apply both migrations in isolation and execute the integration tests. Standard Supabase Auth roles, `auth.jwt()` and email confirmation columns are required; test shims belong only in tests.
2. Through trusted operator SQL, grant approved active edition members `review_admissions` and/or `manage_recruitment` in `edition_capabilities`. Configure and enroll their authenticator first. Capability-management and MFA enrollment/recovery UI remain pending.
3. Configure school-approved Supabase SMTP, sender authentication and exact permitted redirect URLs. This app does not auto-consume URL fragment sessions. Configure/review the invitation template to link to the app with `?token_hash={{ .TokenHash }}&type=invite`, verifying current provider template syntax end to end. The callback removes token material from the URL, verifies with Supabase, then offers password setup.
4. Set an approved exact HTTPS `INVITE_REDIRECT_URL`, then `ENABLE_INVITATIONS=true` and a reviewed Cloudflare cron trigger only after delivery testing/approval. Jobs use bounded batches and expiring leases; existing identities are not recreated or silently activated. Failed/unconfirmed/mid-flight cases need operator reconciliation before retrying. Activation requires verified matching email and does not reactivate suspended membership.
5. Review privacy notices, form questions/closing times and all README launch gates before admitting real data. The current queue shows at most 300 latest applications; larger-volume pagination, application editing/resumption, appeals, decision corrections, draft publication management and full affiliation transfer workflows remain pending.

Latest verification: **9 dependency-free domain/validation tests PASS and 18 TypeScript/TSX files parse successfully**. Syntax checks found and corrected missing JSX-expression braces before handover. Full type checking/build, API/PostgreSQL/browser tests and provider invitation/MFA tests remain NOT RUN because dependencies cannot be installed. SQL has not been applied to a live database. The full security acceptance register remains NOT RUN.

GitHub workflow files now include issue/PR templates, acceptance criteria in BACKLOG.md and a CI definition using pinned actions/read-only workflow permissions. CI has not run; its application job intentionally fails without the real reviewed lockfile. Initial connector writes returned 403; after the user's access update, even reads return `Unknown tool`. Original workspace Git metadata is read-only. An isolated checkout at `tmp/git-handoff` has a local `feat/lms-platform-admissions` branch for the combined initial import. Local commits and remote pushes must be reported separately; see CONTRIBUTING.md and handover results.
