# Implementation and next steps

## Project boards increment (2026-11-06)

Issue #21, feat/21-project-boards from dev d9a318dabd51518abc377cca777c76e806592ecc (PR #20 merged; post-merge run 42163736922 passed 116 tests, type checking and build). New sources add separate project assignments, explicit capabilities/capacities, private kanban work, comments/history and sprint planning. See PROJECTS.md and REMAINING_WORK.md. Apply all migrations through 202611060013_projects.sql when preparing an isolated pilot; no migration/deployment occurred here.

Local native checks: 36 PASS, including contract discovery for 69 HTTP operations and project validation. HTTP, direct-RPC/PGlite and Chromium test sources are written; full CI is pending publication at this snapshot. Existing JSX/type/build tests must pass before dev integration. TypeScript permits .ts imports under noEmit so the native Node tests can run shared project validators directly. Live provider/MFA, separate-connection contention, devices, load and full security acceptance remain NOT RUN.

## API documentation increment (2026-11-06)

Issue [#19](https://github.com/ryuma2317/Next-Gen_LMS/issues/19), branch docs/api-contract from dev 7d3d4fa03e65fc3d6695db7297f5eecdab88982a. The quiz increment was merged through PR #17 and post-merge run 42056706944 passed its 103 automated tests, type checking and build. The older baseline/evidence sections below are historical.

API_GUIDE.md explains APIs, safe local requests and Apidog import for new maintainers. Sources in api/ generate public/openapi.json: 55 implemented HTTP operations, payload schemas, concrete action/resource variants, access/MFA descriptions and current error behavior. No dependencies, service subscriptions, migrations or runtime business rules change.

Evidence: 32 native tests PASS locally, including five contract/reference/route/security/fixture checks. [CI run 42162605308](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/42162605308) passed on f6b6ec677881eb40e5051024986a1729ce673a9a: artifact freshness, npm ci, type checking, 32 domain + 60 Vitest API/PGlite + 24 Chromium preview tests (116 total), and client/Worker build. Eight new HTTP tests and actual PGlite quiz projections check response shapes, null/private fields and errors. Follow-up review documents the existing public-submission 404 and discovers mounted Hono modules dynamically for route coverage; exact final-head CI remains required before merging [PR #20](https://github.com/ryuma2317/Next-Gen_LMS/pull/20).

Direct Apidog import was NOT RUN because desktop automation failed to initialize; the import file contains no credentials. No provider/deployment/account changes were made. See API_GUIDE.md for the bounded schema matcher's limits and outstanding provider/device/load/security work.

Current development baseline: **dev**, with the existing stack merged through [PR #12](https://github.com/ryuma2317/Next-Gen_LMS/pull/12) at `07164d9dc2da8bef1adac0c0564d547ce10ca4ad`. Pre-merge CI on the exact head and post-merge [dev CI run 41984710266](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41984710266) passed installation, type checking, 74 automated tests and the production client/Worker build. See DEV_REVIEW.md and GIT_HANDOFF.md. The historical notes below record each earlier increment; live acceptance and unfinished program modules remain pending.

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

## Build 0.3 — dated attendance, check-in and leave

Source added on `feat/attendance-sessions`, stacked on the bootstrap branch:

- Separate dated theory/lab sessions, scoped trainer assignments, enrollment snapshots at opening and finalization after the delivered session ends. Active eligible trainees enrolled by session start enter the snapshot. Future schedule/affiliation changes do not rewrite a past roster.
- Worker-generated HMAC codes and locally rendered QR; six-second rotation and at most twelve-second validity for the current/previous challenge. Codes are scoped to session/generation; signing keys stay server-side. Check-in uses the verified caller, a configured account limiter, expected roster membership, server time and a service-only recording RPC. Browser callers cannot directly invoke that RPC. Session cancellation/end/window checks are repeated transactionally in the database.
- A trainee screen for camera or manual code entry, session receipt and short leave requests. QR content is parsed as attendance data, not opened as arbitrary URLs. Camera code is loaded only when requested, stops on cleanup/read and offers manual fallback. The camera/QR packages still need installation and device testing.
- Trainer roster corrections require reasons and current record versions. Missing scans remain unverified until finalization. Private leave notes are hidden from trainers unless they independently have approved review access. Leave approval requires `review_attendance`, MFA and a different actor from the requester; supervised presence corrections supersede pending/approved leave instead of double counting it.
- Exact quarter-unit totals, warning thresholds, pending states and an attendance-only condition. Only trainee teaching attendance is assessed. A published annual policy is required before opening the first session and then freezes through the application workflow. Cancellation excludes the session. No complete certificate eligibility/issuance is implied.
- Explicit `manage_schedule` capability plus MFA for scheduling, policy configuration and cancellation. No new capability or trainer assignment is automatically granted. Initial trusted-operator assignment is still required.
- A forward migration also fixes the older admissions RPC's NULL-version comparison. Existing migration files are preserved, and direct-RPC regression cases are added. This is a source-identified defect; PostgreSQL runtime evidence is still pending.

### Setup and remaining validation

1. Apply migration `202611050003_attendance.sql` after the first two migrations in an isolated project. Verify the capability constraint update, RPC grants, RLS, NULL-revision checks and separate-connection races before real use.
2. Assign actual teaching responsibilities in `section_trainers(section_id,user_id)` through the approved operator process. The person must also have an active trainer role in that section's edition. Teacher labels on sample classes are not authorization assignments.
3. Grant `manage_schedule` and/or `review_attendance` only to approved active edition operators, enroll their authenticators and verify MFA. Review permission selection remains an owner decision. These functions never grant themselves authority from a role title alone.
4. Generate a 32-byte random signing secret as base64url and set `ATTENDANCE_SIGNING_KEY` in the Worker secret store or ignored `.dev.vars`. Never put it in `VITE_*` variables. Configure `ATTENDANCE_LIMITER` and the existing server-only Supabase secret. Missing configuration disables check-in. Cloudflare's proposed limiter is coarse/per-location, not an exact global counter; database uniqueness remains authoritative.
5. Publish/review the policy, schedule actual UTC timestamps and weights, and test the display/check-in window. UI displays Cambodia time (UTC+7); date inputs use the operator device's local time and convert to UTC. An ordinary theory/lab absence is 2 quarter-units and approved leave 1; the default failure threshold is 12, warnings 4/8. Nonstandard session weights must be positive even units to preserve the leave ratio exactly.
6. Rehearse with real supported devices over HTTPS, including camera denial, slow Wi-Fi, code expiry, late arrival, simultaneous claims/corrections, supervised fallback and session cancellation. QR relay remains possible; trainer oversight is required. No school-network or physical-presence claim is made.

Latest checks: **14 dependency-free tests PASS; 26 TypeScript/TSX files parse**. API/PostgreSQL/browser test sources now cover attendance and the older NULL-review defect. npm installation remains blocked by EACCES, so full type check/build, dependency compatibility/advisory review, camera rendering, database execution, runtime authorization and load/race tests are still NOT RUN. No migration, email, real attendance record or cloud deployment was performed.

Still pending: full lesson/assessment features; a complete dispute/appeal workflow; explicit replacement-session links; late-enrollment roster amendment/affiliation-transfer administration; dedicated policy/version recovery UI; notification delivery; certificate issuance/snapshot/reconciliation; projects/rooms; jury/voting. Queue limits and source-level controls are not evidence of a completed or secure LMS.

## Build 0.4 — class lessons, configured assignments and released grading

Source branch: `feat/learning-assignments`, stacked on `feat/attendance-sessions`; prepared checkout `tmp/learning-handoff`. No subscriptions or services were added.

- Lessons support plain text and optional validated HTTPS resources, draft saves and explicit publication. Published content is locked in this increment; revision/withdrawal workflows remain future work. HTML/source code is displayed as text, not executed. External resources are opened with isolation/referrer protections and are never fetched or embedded by the LMS server.
- Assignment drafts can leave policy undecided. Publication requires individual mode, response format, opening time, an explicit deadline/no-deadline choice, late-work handling, a total submitted-version limit and maximum score. No default late penalty, grade weighting, quiz rules or certificate criteria are invented. All timestamps are stored in UTC and displayed in Cambodia time; scheduling inputs use the device's local time.
- Individual text, HTTPS-link, combined or either-format responses are supported. Each accepted version is immutable and retains the assignment configuration snapshot. Actor identity, submission time, attempt number and late flag are server/database-derived. Row/advisory locks coordinate closing and submissions; request IDs make identical retries safe without consuming another attempt. At/after a configured deadline, work is rejected or flagged according to the published setting. Published configuration cannot silently change beneath a submission.
- Scores use exact integer hundredths (100 units = 1 score point), separately from attendance's quarter-point units. Graders draft score/feedback, then release deliberately with a reason. Draft edits preserve the last released learner snapshot; no unreleased feedback, draft counter or other learner's work is returned to a trainee. Only the latest submitted version may be graded; no self-grading. Maximum score, version checks and explicit permissions are enforced again in database RPCs.
- Submission reads are paged at 50 records with bounded offsets and server-provided latest-attempt flags. Class lesson/assignment lists currently cap at 100 records each; add pagination before a larger-content pilot rather than treating that cap as complete catalogue support. Content-size limits, stable API field projections and query indexes bound work. Files, rich embeds and code execution are not accepted.
- Explicit `section_learning_permissions` (`edit_learning`, `grade_work`) require an active, department-appropriate assigned trainer. Writes and reading another trainee's draft grading require MFA. Optional `review_learning` is an explicit edition capability plus MFA for oversight of material; it does not grant grading. No permissions/assignments are granted automatically. Mixed trainee/trainer identity uses separate student/teaching flags and still cannot self-grade.
- The interface adds a Learning workspace, lesson/assignment editors, submission history, paged grading queues, separate release reasons and authenticator verification. Account settings now support initial TOTP enrollment with a locally rendered QR and explicit code verification. Enrollment material stays in component memory, with no external QR service or raw SVG injection. Existing verified factors are never automatically removed. Token refreshes preserve class/draft selection. Work not saved/submitted is only local to the page; full server autosave/resumption is pending.

### Forward security fixes and rollout boundary

Migration 004 also changes attendance recording to a **four-argument server-only RPC**. The Worker derives the exact verified challenge expiry and the database rechecks wall time, expiry, generation, session end and the first-fifteen-minute window after obtaining its session lock. The old three-argument service grant is revoked. Assignment deadline/receipt time uses wall clock after serialization locks too. Deploy the matching Worker and complete migrations as a coordinated change; an old Worker fails closed and must not be “fixed” by casually regranting the legacy function.

Migration 005 explicitly revokes PUBLIC and named anon/authenticated/service_role grants for all 50 application function signatures, then restores only the intended role allowlist. PUBLIC-only revocation does not remove separate default grants to named roles. The migration does not broadly revoke unrelated Supabase/provider functions or change global defaults. New database tests simulate named default EXECUTE grants before applying migrations and assert server-only RPC boundaries. This responds to the [Supabase function-permission advisory](https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable); it remains unverified in a deployed project.

### Setup and evidence

1. Apply **all six migrations** to an isolated Supabase project and execute the complete tests, including named-default-grant simulation and function-privilege assertions. Check Supabase advisories on the actual project. Bootstrap/attendance sources alone are not a complete secure deployment.
2. Through the approved operator process, assign section trainers and explicit section learning permissions. Verify active trainer department/edition scope, set up MFA in Account settings, then verify the authenticator in the Learning screen when needed. Enable and test the provider's TOTP settings first. No public endpoint allows participants to grant these rights.
3. Have the responsible teaching/program authority select each assignment's publishing rules. Drafts preserve unresolved choices; group, quiz, rubric/appeal and certificate policy decisions remain in DISCOVERY_QUESTIONS.md.
4. Test deadlines, delayed/duplicate requests, grade draft privacy, permission revocation, token refresh, cross-class IDs, NULL/stale revisions, paging, keyboard/mobile behavior and separate-connection concurrency before real use.

Actual checks: **21 dependency-free tests PASS; 33 TypeScript/TSX files parse; all 50 earlier-created function signatures are covered by migration 005's explicit revocation list; publishing-script syntax passes**. These are narrow checks. TypeScript type checking, production build, API/PostgreSQL/browser/device tests and real provider integration remain NOT RUN because npm installation again returned EACCES. No SQL migration, live grade/submission, email or deployment was performed. The full security acceptance register remains NOT RUN.

Prepared feature/bug issue bodies: `.github/handoff/learning.md`, `time-guards.md` and `function-grants.md`. Remote issue creation/push must be confirmed separately. `scripts/publish-handoff.ps1 -Feature learning` prepares the stacked publishing workflow after its base PRs are published.

### Authenticator setup and recovery handover

The account flow uses the provider's [TOTP enrollment API](https://supabase.com/docs/reference/javascript/auth-mfa-enroll) and [challenge-and-verify API](https://supabase.com/docs/reference/javascript/auth-mfa-challengeandverify). Verification can revoke other sessions. Enrollment does not assign a program role or capability. Provider/browser integration has not run here; test initial setup, existing factors, invalid/expired codes, repeated clicks, refresh, sign-out and cross-account navigation before enabling it.

Leaving before verification can leave an unverified factor at the provider. The UI blocks another enrollment when such a factor already exists. A designated platform owner must verify the user's identity through the approved private recovery channel, inspect the exact account/factor and remove only the confirmed unverified setup using provider administration before the user retries. Do not remove verified factors as routine cleanup, run bulk factor deletion, or collect the user's QR/secret/code in an issue. Verified-factor loss requires the documented identity/recovery process and an audited provider action; this increment adds no self-service MFA reset or security bypass. Test and assign the recovery owner before launch.

## CI verification continuation

GitHub publishing recovered: foundation/admissions #9, attendance #10, learning #11 and verification #12 are published draft PRs. Main is unchanged. Actual issue links, commit mappings and isolated checkout details are in GIT_HANDOFF.md.

A read-only CI workflow generated package-lock.json with install scripts disabled. The reconstructed SHA-256 and root manifest/registry/integrity checks passed; 229 package records are locked. npm ci then succeeded and npm reported zero known vulnerabilities in that run; this is time-limited scanner evidence, not a guarantee of dependency safety. CI warned that esbuild/workerd install scripts were not approved by its npm policy; do not broadly approve scripts without review.

Initial full CI run 41982089448 passed type checking and 31/37 Vitest tests, while six failed. The root defects were admissions' ambiguous PL/pgSQL `q` alias and leave-read RLS depending on the deliberately ungranted teaching_sessions table. Migration 006 fixes forward: an explicit JSON alias in the service-only intake RPC and a tightly scoped private definer helper for leave reads. It preserves all old migrations, direct session-table denial and existing MFA/edition/owner restrictions. The helper and replaced RPC explicitly revoke named-role default grants before restoring their intended allowlist. Tests now apply all six migrations and check owner/reviewer/teacher/outsider leave visibility.

Latest rerun: [CI run 41982401894](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41982401894) **PASS** on source commit `513e306742ec50e4434daf2910e3236699bb4e4b`: npm ci, TypeScript type checking, 21 dependency-free tests, 37 Vitest API/PGlite tests, client/Worker production build, and 16 Chromium browser tests. Both domain and application jobs passed. Browser tests exercise synthetic previews; they do not establish real provider integration or visual/accessibility review. Local package installation is still blocked. A final documentation commit records this already-tested source; routine checks may run again on that commit. Live Supabase/provider/MFA/camera integration, real concurrency, device/accessibility/visual QA and full security acceptance remain unverified. The complete program LMS is unfinished; these checks do not implement the remaining projects/rooms/jury/voting/certificates.

## Quiz increment ? automated verification passed

Branch feat/quiz-modes, issue #16, based on dev 867da4bfc03e3a55b7f0b58800aa36f34f232cd2. New exam/live-game sources, teacher authoring, automatic choice grading, bounded advisory monitoring and server deadlines are documented in QUIZZES.md. Apply migrations 007/008/009/010/011/012 after the existing set; no migration was applied to a live provider. [CI run 41994150546](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41994150546) passes npm ci, type checking, 27 domain tests, 52 Vitest API/PGlite tests, client/Worker production build and 24 Chromium browser tests (103 tests total) on 87e6bd0a89dc7c439fb64d9960c27935e84b3e8e. Local parsing also passes for 44 TS/TSX files. Earlier runs found a false-positive privacy assertion and unclear select accessible names; both were corrected, not bypassed. Forward migrations 010/011/012 make the collection shape explicit, reveal game results at deadlines and separate authoring from private grade/event reports. Live Supabase/PostgREST/Auth/MFA, actual fullscreen/device behavior, network recovery, separate-connection contention and 100?300 player load remain unverified. PR #17 tracks this development integration; exact final-head CI must pass before merging. This is not production readiness or a completed LMS.
