# GitHub issue queue

Issue bodies are prepared in `.github/handoff`. The connector recovered on 2026-11-05 and [verification issue #1](https://github.com/ryuma2317/Next-Gen_LMS/issues/1) now exists; see GIT_HANDOFF.md for the verified publication register as other issues/branches are created. Earlier 403/Unknown-tool failures are historical. The combined initial source import uses isolated local branch `feat/lms-platform-admissions`; attendance and learning use their respective stacked feature branches.

## Foundation: role workspaces, protected API and atomic subject selection

Planned branch: `feat/platform-foundation`. Status: source written, incomplete verification.

- [ ] Responsive synthetic preview works on desktop/mobile and with keyboard navigation.
- [ ] Session-verified API and RLS deny unauthenticated, cross-edition and cross-user access.
- [ ] Concurrent claims cannot overwrite a participant, exceed capacity or bypass annual subject limits.
- [x] Dependency-free attendance and audience-award rule tests pass locally.
- [ ] Review/commit a generated dependency lockfile; pass type checks, build, API/database and browser tests.
- [ ] Verify actual Supabase integration and separate-connection enrollment races before real data.
- [x] Record architecture, security requirements and operational handover.

## Admissions: versioned recruitment forms, review and activation

Planned branch: `feat/admissions-activation`, based on foundation until it merges. Status: in progress.

- [ ] Published versioned forms support trainer/trainee applications without precreating participant access.
- [ ] Store all submitted answers against the original question/version snapshot.
- [ ] Private receipt exposes only application status; prevent public applicant enumeration.
- [ ] Explicit per-edition permissions and MFA protect application review and outcomes.
- [ ] Record passing trainer interviews or trainee orientation before queuing account invitations.
- [ ] Activation requires a verified matching mailbox and is retry-safe; never reactivate a suspended membership silently.
- [ ] Invite retries and failures are tracked without leaking credentials or sending before email configuration is approved.
- [ ] Cover invalid input, duplicate submission, stale review, wrong email, suspension and permission denial with tests.
- [ ] Pass build, database, API and browser checks; document remaining program-policy decisions.

## Blocker: restore dependency installation and verify the build

Planned branch: `fix/dependency-verification`. Status: blocked by execution environment.

- [ ] npm can reach the approved registry.
- [ ] Review resolved versions, compatibility and advisories; commit the real generated lockfile.
- [ ] Type checking, full test suite and production build pass; fix confirmed failures.
- [ ] Desktop/mobile browser and keyboard checks run with evidence.
- [ ] CI uses `npm ci`; missing lockfile does not produce a misleading success.

## Remaining program epics

Create separate issues with detailed acceptance criteria before each implementation. Dependencies and confirmed rules are in LMS_PLAN.md, PROGRAM_RULES.md and UX_BLUEPRINT.md.

- Annual administration, readiness and scoped permission assignment.
- Dated class scheduling, lessons, assignments, quizzes and grading.
- Rotating attendance, leave/corrections and certificate eligibility.
- Independent teaching/project teams, project boards and mentoring.
- Shared room allocation and quota-safe private bookings.
- Guest jurors, official rubric, conflicts and two-round scoring.
- Jury-confirmed awards, verified audience voting and result publication.
- Certificate generation, verification, archive, privacy and recovery.

Each epic must cover authorized and forbidden actions, relevant race conditions, recovery behavior and evidence. Do not create automatic award, retention or fairness policies from unanswered questions.

## Attendance and direct-RPC revision hardening

Branch: `feat/attendance-sessions`, stacked on the initial bootstrap. Isolated checkout: `tmp/attendance-handoff`. Prepared full issue bodies and acceptance criteria are in `.github/handoff/attendance.md` and `.github/handoff/review-null-version.md`. They are not remotely created issues until GitHub confirms creation.

Attendance source now covers scheduling, scoped rosters, six-second QR/manual challenges, first-fifteen-minute check-in, leave review, corrections, finalization and provisional quarter-unit totals. Fourteen dependency-free tests pass; the integration checks remain blocked. A forward migration also rejects NULL revisions in the older review RPC; source/test evidence is recorded in IMPLEMENTATION.md. Keep all runtime-dependent acceptance criteria open.

## Learning and forward security hardening

Branch: `feat/learning-assignments`, stacked on attendance. Prepared issue bodies: `.github/handoff/learning.md`, `time-guards.md` and `function-grants.md`. Source covers lesson publication, explicitly configured individual assignments, immutable submissions, separately released grading, post-lock code expiry and named function-role grants. Latest narrow evidence: 21 passing dependency-free tests and 33 parsed TypeScript/TSX files. All runtime-dependent criteria remain open; the issue bodies are not remotely created issues yet.

Remaining learning work includes quizzes, file/group submissions, server autosave/resumption, content revision/withdrawal, appeals/rubrics, larger catalogue pagination and approved transcript/certificate policy. Real multi-role workspace switching and all edition/section assignment administration also remain unfinished; SQL authorization is independent of preview labels.
