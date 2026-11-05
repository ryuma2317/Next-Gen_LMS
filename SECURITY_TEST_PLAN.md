# Security Acceptance Scenarios

Updated: 2026-11-05. Companion to [SECURITY.md](SECURITY.md) and the [README operational runbook](README.md).

**Execution status: NOT RUN for every full scenario below.** Initial application and test sources now exist; see [IMPLEMENTATION.md](IMPLEMENTATION.md). The quiz feature increment passes 27 domain/validation/challenge tests, 52 API/PGlite tests and 24 synthetic Chromium browser tests (run 41994150546). These provide scoped supporting evidence, but do not complete these end-to-end security scenarios. No database deployment or full security test run has occurred. Passing regressions include named default function grants, grading draft privacy, attendance expiry checks and private leave-read visibility. Actual lock-wait concurrency and real Supabase/MFA/device tests remain separate requirements; see IMPLEMENTATION.md for the CI run.

## How to use this plan

- Map each enabled feature to the SEC control IDs below. Applicable P0 failures block that feature from handling real data. Handle P1 exceptions exactly as specified in SECURITY.md; unsupported features may be disabled, not silently exempted.
- Use an isolated test environment with synthetic people and documents. Test actual PostgreSQL policies/constraints and application routes, not only mocked success responses. Test direct Supabase access where exposed, including REST/RPC, Storage and realtime, as well as the normal UI.
- Exercise a legitimate permitted action beside each denial. A system that rejects everybody has not passed authorization testing.
- Assert response shape, returned fields, stored state, side effects, audit records and observable cache/realtime behavior. A hidden button or HTTP error after an unauthorized write is not a pass.
- Use a synchronization barrier to issue concurrent requests from separate sessions/connections. Repeat contentious cases enough to expose race failures; record counts and state. There is no assumed fixed throughput target yet: measure an agreed pilot load and realistic peak enrollment/voting bursts.
- Test only owned/authorized environments. Do not scan production, school networks or third-party systems without the responsible owner's authorization. Keep destructive recovery tests isolated.
- Security tests supplement ordinary functional, accessibility and usability tests. A security gate must not prevent approved accommodations, account recovery or supervised attendance corrections.

## Synthetic fixtures

Create two annual editions; several classes including two in the same department; two project teams; one teaching team; two rooms; and published/private materials. Include:

- Trainee A and B in the same class, trainee C in another class, a prior-edition trainee, an external trainee with personal email, and a suspended account.
- Trainer for one class, another department's trainer, volunteer with one approved function, organizer, admin and super admin with distinct approved permissions.
- Mentor/advisor assigned to project X, unrelated project Y, a named juror with that mentor relationship, and other jurors assigned separately to semifinal/final.
- Two guest invitations for distinct jurors, expired/revoked invitations, and a reissued invitation for the same juror.
- Two verified audience identities, replacement credentials for one identity, and an anonymous visitor. Use mock verification keys only in isolated tests.
- Unique sentinel strings in private answers, grades, notes, files and unpublished results so automated responses, exports and cache tests can detect leakage.

Freeze the approved role/action/scope matrix and yearly configuration for each run. Do not make every fixture an admin. For unresolved policy, record **BLOCKED — needs policy/configuration**, rather than inventing a pass condition or awarding a pass.

## A. Identity, roles and database access

| Test | Control | Scenario and required result |
| --- | --- | --- |
| ST-001 | SEC-01 | Missing, malformed, expired, wrong-issuer/audience and incorrectly signed tokens fail protected requests without returning private fields. A valid token for an active eligible user succeeds. Test supported signing-key rotation as part of deployment integration. |
| ST-002 | SEC-01/02 | Suspend an account or remove a scope while its session is active. Further protected actions fail according to the documented revocation design; refresh, another tab and a different endpoint cannot retain removed privileges. Verify any documented revocation delay against the approved requirement. |
| ST-003 | SEC-01/11 | Verify actual login, refresh, logout, expiry and session rotation. Where cookies are used, check Secure/HttpOnly/SameSite/path/domain settings and CSRF controls. Verify recovery links are scoped, expire and cannot be reused after completion. Session architecture must be decided before this test is implementable. |
| ST-004 | SEC-01/02/16 | Verify privileged MFA and recovery enforcement at the application and provider layers separately. A normal session cannot bypass required step-up authentication for configured sensitive actions. Recovery cannot silently promote a participant. |
| ST-005 | SEC-02/10 | Submit role, approval status, organization/edition ID, grade, certificate eligibility and ownership fields through profile/admissions JSON, form data, imports and alternate endpoints. Reject forbidden changes; approved editable fields still work. Ignore client-provided identity assertions. |
| ST-006 | SEC-02/03 | Change IDs in class, assignment, submission, applicant, project, room and export requests. Users can access only approved scopes and fields. Include same-department but unrelated classes and mixed teaching/project membership. |
| ST-007 | SEC-02/03/15 | Repeat scope tests against the prior edition, pagination, search, aggregates, batch IDs and exports. Counts, embedded relations and error details do not leak private cross-edition records. |
| ST-008 | SEC-03 | Call exposed tables, views, RPC functions, Storage APIs and realtime directly with anonymous and ordinary-user credentials. Default grants and RLS deny unauthorized reads/writes; approved own-scope requests work. Ensure a new table without reviewed policies cannot become publicly readable. |
| ST-009 | SEC-03 | Attempt insert/update/upsert that changes the owner, class or edition of an otherwise accessible row. RLS checks both existing-row eligibility and proposed values; SQL functions cannot accept an untrusted actor or bypass policy via unsafe search paths. |
| ST-010 | SEC-02/05 | Attempt self-promotion, peer-role assignment, unauthorized impersonation and removal of the final recovery administrator. Deny according to the approved delegation matrix; authorized scoped changes are audited. Ordinary organizers must not automatically gain platform-owner powers. |
| ST-011 | SEC-01/02/04/05 | Repeat admission acceptance/activation and orientation completion; the same verified identity is linked once. Editing email or replaying an old acceptance cannot claim another applicant's account. Pending/rejected applicants cannot self-activate through a direct call. Check verified email changes, safe identity linking and non-enumerating public recovery responses. |
| ST-012 | SEC-02/04/05 | Change a participant's department/specialization through the authorized flow. Preserve historical affiliation, review current invalid subject choices and audit the change. A participant cannot change eligibility directly or race the change to retain unauthorized core enrollments. |

## B. Concurrency, scheduling and attendance

| Test | Control | Scenario and required result |
| --- | --- | --- |
| ST-013 | SEC-04 | Several users claim the same final seat simultaneously. Exactly one succeeds, total capacity is respected, losers receive a recoverable conflict, and no existing occupant is overwritten. Verify database state independently of UI responses. |
| ST-014 | SEC-04 | Concurrent requests claim different seats under the same shared class/team capacity or four-subject limit. The shared limit still holds. Separate-row locks alone must not allow over-enrollment. |
| ST-015 | SEC-02/04 | Try to replace another participant's seat, delete their enrollment or move them using their record ID. Deny; an authorized admin override must require reason and produce an audit record. |
| ST-016 | SEC-04 | Move from a valid seat into a seat that another request wins. The failed move preserves the original seat. Duplicate retries cannot create two memberships or release another person's seat. |
| ST-017 | SEC-02/04 | Try selection before readiness/opening, after closing and at the close boundary. Server state/time govern eligibility; cached pages or client clock changes cannot reopen selection. Approved exception handling is separate and audited. |
| ST-018 | SEC-04 | Race room bookings for overlapping intervals and separate bookings that together exceed one team's configured quota. Prevent both overlap and quota violations. Verify the approved timezone/week boundaries, cancellations and any configured exceptions; unresolved quota policy blocks the relevant test. |
| ST-019 | SEC-04/09 | Repeat an attendance request after timeout, double-click and parallel submission. A valid check-in records once for the correct session; retries cannot multiply attendance credit or create conflicting states. |
| ST-020 | SEC-09/14 | Use QR/manual codes from another class, an expired challenge, a future challenge and forged challenge payloads. Deny. Test six-second rotation and selected twelve-second validity at boundaries using server time; bounded code attempts must still allow legitimate shared-campus users. |
| ST-021 | SEC-02/05/09 | An attendee cannot edit their own points or approve leave. The approved organizer workflow can correct attendance with a reason and audit history; unrelated trainers cannot alter the session. Supervised fallback remains available to authorized staff. |
| ST-022 | SEC-04/09/20 | Verify full/half-session and approved-leave quarter-point calculations, warnings and the certificate failure threshold from PROGRAM_RULES.md. Race leave approval/correction against certificate issuance; unresolved disputes cannot result in an incorrectly final certificate. |

## C. Guest jury, awards and audience voting

| Test | Control | Scenario and required result |
| --- | --- | --- |
| ST-023 | SEC-01/06 | A valid named guest can access assigned scoring without registering an account. Expired, revoked, malformed and wrong-round links fail. Guessing identifiers cannot discover invitation tokens; stored/logged token material is protected as designed. |
| ST-024 | SEC-06/11/15 | Email scanners and preview GETs do not consume an invitation or submit scores. After intentional redemption, remove sensitive URL material and establish the scoped session. Check browser history/referrers/logs/analytics for token leakage. |
| ST-025 | SEC-02/06/07 | A semifinal juror cannot access final scoring or another juror's draft through changed IDs, batch requests or direct database paths. Assignment changes and revocation take effect for an already-open tab. |
| ST-026 | SEC-02/06 | Assign a mentor/advisor as a juror for their own team and attempt scoring through every exposed path. Reject the assignment/action according to the approved conflict rules; unrelated team scoring remains possible. Verify duplicate emails/identity records cannot bypass known conflicts. Human discovery of undeclared relationships remains an operational limitation. |
| ST-027 | SEC-04/06 | Reissue a juror invitation. It addresses the same juror assignment, invalidates the replaced access as designed and does not count that juror twice. Competing tabs cannot silently overwrite a newer score version. |
| ST-028 | SEC-05/07 | Missing scores remain missing rather than zero. Validate configured rubric ranges and completeness; final submission/round locks prevent unauthorized edits. Authorized reopening records reason, actor and changes. Verify different jury counts and memberships on the two days. |
| ST-029 | SEC-02/04/07 | Attempt to publish awards for non-finalists, assign two jury awards to one team, or race conflicting award edits. Reject invalid state. Five distinct finalist jury winners must be organizer/jury-confirmed, without inventing an automatic category-priority algorithm. |
| ST-030 | SEC-07/15 | Before publication, inspect public endpoints, HTML, client bundles/preloaded data, realtime channels, caches, exports and certificate-related views. Unpublished scores/winners do not leak. A public cached page cannot expose a previous authenticated response. |
| ST-031 | SEC-08/13 | Submit fake verification flags, arbitrary identity headers, wrong-event/wrong-audience assertions, bad signatures, expired/revoked credentials and replayed verification callbacks. Reject; valid integration credentials succeed. Verify production cannot use mock/test keys. |
| ST-032 | SEC-04/08 | Submit simultaneous ballots from two browsers using the same verified event identity. Exactly one ballot is accepted; retries are idempotent. A replacement pass for that identity cannot add another vote. Any permitted vote-change behavior requires an explicit policy and separate test. |
| ST-033 | SEC-08/14 | Many distinct legitimate voters share campus public IP addresses. They can vote within tested capacity. An unverified second identity cannot become eligible merely by changing device, cookie or IP. Test direct-internet bypass if the chosen design requires the school network. |
| ST-034 | SEC-04/07/08 | Keep every eligible project on the ballot, including jury winners. With raw totals led by jury-winning teams, select the highest-voted remaining team for Audience Favourite. Preserve original totals and publish six distinct winners. Block publication when required ties/eligibility decisions remain unresolved. |
| ST-035 | SEC-04/08/14 | Race ballot submission with closing; server-time/transaction rules consistently decide acceptance. If verification becomes unavailable, fail closed for new unverifiable ballots, preserve accepted ballots and exercise the approved recovery process. Do not silently count anonymous votes. |

## D. Learning, files, browser and integrations

| Test | Control | Scenario and required result |
| --- | --- | --- |
| ST-036 | SEC-02/10/21 | A trainee cannot read another's submission or private feedback unless the approved collaboration policy allows it. A trainer can grade only assigned classes. Score/answer-key fields never arrive in the learner payload before permitted release. |
| ST-037 | SEC-04/10/21 | Tamper with quiz score, attempt count, deadline and client timer; retry submit/grade jobs. Server rules prevail and repeated requests do not duplicate outcomes. Future execution of uploaded code must remain disabled until separately sandboxed and reviewed. |
| ST-038 | SEC-02/15/21 | Project X member/mentor can use approved X boards/files and permitted shared information. They cannot read Y's private notes or modify its tasks via changed IDs, attachments, search, comments or notifications. Private mentor feedback follows its own permissions. |
| ST-039 | SEC-10/11/21 | Put HTML/script, malicious URLs and dangerous markup in forms, comments, rich-text lessons, filenames and imported content. Rendering prevents execution and unsafe navigation; server validation still permits required harmless text. Verify CSP on the real build without relying on it as the only sanitizer. |
| ST-040 | SEC-02/12 | Guess another user's Storage path, reuse a signed URL beyond expiry and request a URL without access. Deny unauthorized issuance/access. Check private buckets, object metadata, thumbnail/download endpoints and whether an issued bearer URL can remain valid after role revocation; document and minimize that exposure. |
| ST-041 | SEC-10/12/14 | Upload mismatched extension/content, oversized/empty files, path traversal names, active HTML/SVG, macros, archive bombs and excessive file counts. Reject/disallow or quarantine according to the approved format policy without processing dangerous content. Race uploads against quotas and expiry; verify finalization rechecks content and orphan cleanup preserves committed submissions. Confirm no file executes as application code. Use safe test samples in isolation. |
| ST-042 | SEC-12/13 | Pending/failed malware scans cannot publish quarantined files. Forged scan callbacks cannot mark them clean; correct callbacks bind to the exact object/version. If scanning is not enabled, verify the approved restricted-format/review process and display no false “virus-free” claim. |
| ST-043 | SEC-10/12/15 | Generate CSV exports containing formula-triggering values, delimiters, newlines and Unicode edge cases. Validate safe handling in the supported spreadsheet consumer, not merely CSV quoting. Verify export authorization, minimal fields and private expiration/cleanup. |
| ST-044 | SEC-10 | Injection payloads in filters, sort fields, search, forms and imports cannot alter SQL or escape query structure. Bound page sizes, nesting and field lengths; reject unknown dangerous fields. A partial import failure cannot silently grant roles or bypass eligibility. |
| ST-045 | SEC-11 | Cross-origin form and fetch requests (including multipart), missing/forged origin checks and unsupported methods cannot perform cookie-authenticated mutations. GET links are non-mutating. Test exact allowed CORS origins; a public origin or reflected origin cannot read private responses. |
| ST-046 | SEC-11/15 | Verify HTTPS, CSP, frame restrictions, content-type handling, referrer policy and permissions headers on actual HTML/API/error/download responses as appropriate. Test clickjacking, logout/back navigation and shared-device caching; unrelated third-party analytics cannot collect private content. |
| ST-047 | SEC-13 | If server-side URL fetching exists, test loopback/private/link-local targets, redirects, DNS changes, non-HTTP schemes and oversized/slow responses. Block unintended internal access and resource exhaustion. If no such feature exists, record not applicable with code review evidence. |
| ST-048 | SEC-04/13 | Reject forged/stale external callbacks; deduplicate valid webhook retries and bind them to the right event/record. OAuth callback/recovery redirects must match approved destinations and provider state/PKCE requirements. Jobs retry safely without duplicate invitations or certificates. |

## E. Operations, audit, recovery and certificates

| Test | Control | Scenario and required result |
| --- | --- | --- |
| ST-049 | SEC-14/19 | Exercise login, code guessing, invite recovery, voting, exports and uploads across multiple worker instances. Enforce appropriate distributed limits and bounded work; campus users can still complete legitimate actions. Confirm alerts route to an actual owner and do not claim they universally cap bills. |
| ST-050 | SEC-05/19 | Perform and deny representative role changes, grade/attendance overrides, award edits and exports. Record appropriate actor, scope, reason and outcome without passwords, raw tokens, full answers or unnecessary identity data. Ordinary app users cannot alter audit history; privileged corrections and their audit records commit consistently. |
| ST-051 | SEC-15/16/17 | Inspect tracked/staged files, build output, source maps, logs, examples, CI artifacts and preview configuration for secrets and private sentinels. Server/service keys must not enter `VITE_*` variables or frontend bundles. Verify secret detection with a safe synthetic marker and documented tool configuration. |
| ST-052 | SEC-16/17 | Attempt an untrusted pull-request build and unauthorized production deployment. It cannot read production secrets or publish changes. Exercise the reviewed release process, migration checks and dependency-advisory handling; verify the actual branch/account settings or recorded manual fallback. |
| ST-053 | SEC-18 | Restore a database plus Storage backup into isolation. Verify representative relationships, private files, auth integration, grades, attendance, ballots and awards. Disable outbound messages/jobs; record achieved recovery time and data-loss interval against approved targets. A successful database import alone fails this test. |
| ST-054 | SEC-04/14/18 | Simulate a failed migration, worker timeout after commit and provider outage. Retries do not duplicate business effects; approved rollback/recovery preserves authorization and records. Reconcile restored records against later accepted actions before reopening. |
| ST-055 | SEC-02/15/18 | Exercise the approved retention/deletion/export process with fixtures across editions, backups and audit requirements. Only authorized people can act; public verification and retained records follow the approved policy. If retention is undecided, mark this test blocked rather than deleting data by guesswork. |
| ST-056 | SEC-02/04/20 | Forge a certificate request, alter eligibility, race issuance with an attendance correction and request another's private certificate. Reject invalid issuance/access; valid issuance is idempotent and bound to the reviewed eligibility snapshot. Authorized revocation/reissue keeps a traceable version history. |
| ST-057 | SEC-14/15/20 | Public certificate lookup uses non-enumerable identifiers and returns only approved verification fields/status. It cannot reveal email, grade/attendance details or a participant directory. Revoked/superseded status is authoritative; rate limiting and safe caching do not preserve stale validity beyond the approved behavior. |
| ST-058 | SEC-01/02/05/16 | Rehearse handover using synthetic staff: replacement owner can deploy/recover, departed owner loses service and LMS access, recovery remains possible and no shared secret remains unnecessarily valid. Verify provider console and application permissions independently. |
| ST-059 | SEC-05/18/19 | Run a tabletop incident for a leaked key, forwarded jury link and suspicious ballot spike. Owners know how to revoke/pause, preserve evidence, assess impact, restore and communicate through the school. Record gaps and actions without performing a real destructive incident. |
| ST-060 | SEC-02/04/15/19 | Create a new edition from permitted configuration. Previous participants, juror links, open windows and privileges do not carry forward accidentally. Historical records remain readable only under approved archive permissions; yearly configuration changes have reviewer/audit evidence. |

## Evidence register template

Record one row per test run (or link to an access-controlled report containing equivalent fields). Do not change the global status to passed based on documentation review alone.

| Test IDs | Status | Environment / commit / migration | Date / tester | Evidence location | Reviewer | Remaining issue / owner / deadline |
| --- | --- | --- | --- | --- | --- | --- |
| ST-001 through ST-060 | NOT RUN | Foundation source only; no deployed test environment | Not executed as full scenarios | IMPLEMENTATION.md records narrow domain checks only | Unassigned | Implement and execute before affected feature release. |

Allowed statuses: NOT RUN; BLOCKED (state the missing decision/dependency); FAIL; PASS (with evidence); NOT APPLICABLE (with reviewed explanation that the relevant feature/path is absent). A test can require several cases and supporting checks; one successful request does not pass the whole row.

## Completion boundary

This plan covers important known risks, not every possible vulnerability. Add regression cases for real incidents, new integrations and newly discovered paths. Before real data is admitted, the supervising teacher must review critical auth/database workflows and operational readiness. An external assessment can be useful if a sponsor provides one, but it does not replace these implementation checks or become an assumed subscription expense.

## Quiz-specific evidence boundary

QUIZZES.md records passing choice validation, private-key projections, grading/report capability separation, stale/duplicate answers, deadlines, timed reveal, advisory signals and preview-browser tests. These do not complete live security scenarios. Test actual Supabase/PostgREST envelopes, provider MFA and revocation, unsupported/mobile fullscreen, suppressed/delayed signals, lost saves, re-entry after expired attempts, independent connections and peak game load before handling real scores. No browser flag is a cheating verdict or a certificate decision.
