# Security Requirements and Implementation Register

Updated: 2026-11-05
Applies to: React/Vite + Hono/Cloudflare Workers + Supabase PostgreSQL/Auth/private Storage.

## Status and scope

The workspace now includes initial application/API/migration sources; see [IMPLEMENTATION.md](IMPLEMENTATION.md). **The control register below is NOT VERIFIED.** Initial authentication, RLS, transaction and header sources cover part of the foundation, but dependencies/build/integration tests could not run because registry access was blocked. Do not treat the presence of code as completion. `.gitignore` reduces accidental commits of local secrets, generated output and private reference data; it neither scans secrets nor removes anything already tracked.

The owner explicitly requested comprehensive security and operational handover instructions. Security controls may be designed now; unresolved program rules still require their recorded decisions. No paid products, cloud settings, user permissions or school-network settings have been changed.

See [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md) for acceptance scenarios and [README.md](README.md) for non-code responsibilities, launch gates and incident procedures. Keep this register updated with implementation location, test evidence, reviewer and date. Never mark a control complete solely because it appears in this document.

## Priorities and owners

- **P0:** required before the affected feature handles real people/data. Missing controls block release of that feature.
- **P1:** required before the first live program unless a named teacher/owner records a time-limited exception with a concrete mitigation.
- **P2:** enhancement when threat, scale or funds justify it; not an automatic paid purchase.
- Application lead implements; teacher reviewer verifies sensitive boundaries; platform maintainer handles provider configuration; organizer owns business decisions; cyber lead verifies the agreed voting/network mechanism. Actual people must be named in README before launch.

An exception must specify affected data, risk, temporary mitigation, owner, expiry and retest. Do not accept a public student-data exposure, client-side privileged secret, unrestricted privilege escalation or unauthenticated jury write as a cost-saving exception.

## Threat model tailored to this program

Protect applicant answers/interview notes, participant identities, affiliation changes, class memberships, private submissions, grades/attendance, project feedback, guest jury credentials/scores, unpublished awards, voter credentials/ballots, certificates, service credentials and backups.

Potential adversaries include unauthenticated visitors, a participant accessing another class/year, a compromised volunteer/trainer account, forwarded jury/voter links, colluding voters, accidental administrator mistakes, malicious uploads and compromised dependencies. A legitimate role can still misuse access; log consequential actions without exposing more data.

Trust boundaries: browser to API; API to Supabase; browser to exposed Supabase endpoints/storage/realtime if enabled; guest token to session; school/cyber verifier to ballot API; webhook/job input to privileged processing; CI/developer environment to production. Document every bypass path, not just the frontend.

## Implementation register

All entries remain **PENDING / NOT VERIFIED** unless individual evidence explicitly establishes otherwise. IMPLEMENTATION.md records partial source work; completed controls must attach test evidence from SECURITY_TEST_PLAN.md.

### SEC-01 — Authentication and session lifecycle [P0; application/platform]

Use supported Supabase authentication flows; do not invent password hashing or password-reset protocols. Verify token signature, expected issuer/audience and validity on protected API calls; decoding a JWT is not validation. Support signing-key rotation safely. Email verification establishes mailbox ownership, not school enrollment or a privileged role.

Require MFA for privileged LMS roles and recent verification for account recovery, sensitive exports and authority changes according to the approved action matrix. Configure provider-supported password/abuse protections where applicable; allow password managers and accessible sign-in. Use consistent public login/recovery responses to reduce account enumeration without exposing whether an application was accepted. Reverify email changes and link identities only through supported verified flows; matching a submitted email or school domain alone must not merge accounts or grant a role.

Choose and document one supported participant session architecture before implementation. For cookie-authenticated API sessions, use Secure, HttpOnly, host-scoped cookies with an appropriate SameSite policy; refresh/logout/recovery must use the authentication provider's supported lifecycle. Guest sessions must also be revocable. Do not add duplicate homegrown token storage. If direct browser Supabase access is deliberately retained, document which scoped browser credentials exist and protect those paths separately; HttpOnly protection must not be claimed for JavaScript-readable tokens.

Adopt short-lived sessions appropriate to risk, idle/absolute expiry for guest/privileged sessions, and recent reauthentication for sensitive changes. Exact timeout values should be tested for a 90-minute class and jury draft work before rollout. Role suspension and guest revocation must take effect through a server-side active-membership/session check; token expiry alone is insufficient for urgent access removal. Remember browser tabs can retain old tokens.

### SEC-02 — Scoped authorization and role changes [P0; application/teacher]

Default-deny each operation. Check actor, action, resource, annual edition, class/project assignment and workflow state on the server. UI workspace switching is not authorization. Enforce field-level restrictions: participants cannot submit their own role, acceptance state, grade, award or attendance override as trusted fields.

Model permissions by explicit assignments rather than a universal numeric role hierarchy. Protect bulk endpoints, exports, nested resources, file metadata, reports and background jobs as carefully as single-record routes. A valid UUID or hidden button is not access control. Avoid exposing existence/counts of unauthorized records through inconsistent responses.

Only a specifically authorized operator may grant roles or alter affiliations; block self-promotion and grant-of-authority beyond the actor's scope. Record prior/new values and the approving actor. Re-evaluate future eligibility after a department change without silently rewriting past results. Prevent removal of all recovery-capable owners through an accidental bulk action; emergency recovery remains an operational process.

### SEC-03 — PostgreSQL/RLS and privileged paths [P0; database/teacher]

Enable RLS on exposed application tables and restrict grants for anonymous/authenticated roles. Test reads and writes directly against Supabase, not only through the Hono API. Policies must constrain both existing rows and proposed ownership/scope changes. Never trust user-editable profile metadata as authority for admin roles.

Use narrowly scoped transactional functions for seat claims, quotas, ballots and award finalization. Derive actor identity from verified context rather than trusting a supplied user ID. Prefer caller-rights functions where practical. Any privileged function needs fixed/qualified object resolution, explicit caller checks and restrictive EXECUTE grants; review function owner/search_path and avoid broad PUBLIC access. Inspect views for unintended owner-rights access and limit exposed schemas.

Supabase secret/service-role credentials bypass normal protections and belong only in narrowly authorized server operations. Never place them in Vite/browser variables, URLs or logs. Server code using them must repeat resource authorization deliberately; RLS cannot be claimed as a guard for a bypassing path. Keep ordinary reads/writes in caller context where feasible.

Migration 005 adds an explicit named-role EXECUTE allowlist for all 50 current application function signatures. Revoke from PUBLIC **and** named anon/authenticated/service_role roles before restoring intended access; provider default ACLs can grant named roles separately. Tests now simulate these defaults, but runtime execution is pending. Do not expose intake or attendance without applying/verifying the complete migration set. See the [Supabase advisory](https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable).

### SEC-04 — Atomic workflow integrity [P0; database/application]

Use constraints plus transactions for capacity, membership uniqueness, room overlap, per-team quota, one ballot per verified voter and one award per team/category. Lock shared capacity/quota records as well as the requested slot. A count-then-insert across two API requests is unsafe.

Make repeated writes idempotent with keys scoped to actor/operation and request content. Use version checks on editable records, retry transient transaction conflicts with bounds, and reject stale modifications. Moving seats must preserve the original if the new claim fails. Coordinate closing a selection/vote window with in-flight requests; server/database time is authoritative. Batch administrative changes must validate the whole set before commit.

### SEC-05 — Privileged actions and audit history [P0; application/database]

Track actor, scope, action, timestamp, outcome, reason and relevant before/after fields for admissions, roles, affiliation changes, seat overrides, grades, attendance corrections, jury score reopening, awards and certificate changes. Protect audit records from ordinary modification/deletion; redact unnecessary applicant answers and tokens. Transactional audit insertion should accompany consequential changes.

Logs in the same database are not tamper-proof against its owner. Independent restricted copies are an operational enhancement. Avoid claiming immutability without the infrastructure to enforce it. Exports and access reviews must be limited to assigned operators.

### SEC-06 — Guest jury access [P0; application/organizer]

Issue individual unpredictable tokens with at least 128 bits of cryptographic randomness, stored as digests and scoped to a named juror, edition, round and team assignments. Exchange for a revocable session through an explicit action; link-preview GET requests must not consume invitations. Remove tokens from URLs after exchange, use a no-referrer policy on token pages and omit third-party analytics there.

Check expiry/revocation/assignment and mentor/advisor conflicts on every score operation. Match the guest juror to their real internal identity/declared relationships so using personal email or a new link cannot bypass a conflict. Do not use a shared jury password or public score-entry QR. Prevent jurors from seeing another panel member's private scores. Reissuing access must not create a duplicate juror or extra voting weight. Draft conflict/version behavior must be explicit; submit-once does not mean lose drafts on a temporary outage.

### SEC-07 — Jury decisions and publication [P0; application/organizer]

Validate required score coverage using the organizer's rubric; never substitute zeros for missing/recused submissions or invent aggregation. Lock submitted records under the agreed reopening workflow. The jury decides the five awards; accept only five distinct finalist winners as a finalized decision set. Server-derived audience eligibility must use that versioned set.

Keep score/result fields out of public API responses, client bundles, preloaded state, realtime channels and shared caches until release. Publishing all six awards is an explicit authorized action. A correction produces a reviewed revision, not a silent historical overwrite. Ties/incomplete configuration block automatic finalization rather than triggering a hidden arbitrary fallback.

### SEC-08 — Audience verification and ballot integrity [P0; application/cyber]

The cyber team must supply an agreed trust contract: unique event-scoped voter identifier, credential issuer, signature verification/key rotation or server-to-server validation, expiry, revocation and reissue controls. Reject browser-submitted voter IDs, MAC addresses, SSIDs or claimed network status without trusted verification. Network access and person uniqueness are separate problems.

Enforce voting-open status and atomically consume a verified credential/create one ballot. Uniqueness spans devices/tabs/retries and credential replacement. Do not use campus IP as the only per-voter key. Untrusted forwarding headers must not establish identity or campus presence; bind to a verified ingress path with no public-origin bypass.

All projects remain selectable. Preserve raw votes and skip the five jury winners only when determining Audience Favourite. Do not delete/transfer their votes. Separate credential issuance records from ballot choice where practical; restrict tally access and avoid live public leaderboard leaks before agreed publication. Credential sharing and duplicate issuance also require event controls; the web app alone cannot prove one physical human.

### SEC-09 — Attendance integrity [P0; application/trainer]

Use cryptographically generated/authenticated session challenges, server time and enrollment validation. QR display refresh is six seconds; the delegated current design allows twelve-second validity. Tokens/codes are class-session credentials, not participant identity. A valid shared code cannot grant access to another class/year. Limit guessing for manual codes and protect the trainer display/start endpoint.

Keep one record per person/session. Compute points server-side in exact quarter units using the published policy; client-submitted totals and certificate flags are untrusted. Leave approval/correction is permissioned and audited. Pending disputes must not silently finalize certificates. Preserve a supervised fallback for a genuine phone/network failure. Live relay of a QR remains possible and requires trainer oversight or a separately approved presence mechanism.

### SEC-10 — Input, queries and exports [P0; application]

Use server-side schemas for body/query/path input with allowed fields, lengths, enums, numeric bounds and canonical identifier formats. Validate business state after parsing. Use parameterized SQL; allowlist dynamic sort/column names. Reject unexpected mutation fields and avoid mass assignment of request bodies to records.

Limit pagination, batch sizes, exported rows and filter complexity. Make CSV exports safe against spreadsheet formula execution, including leading formula/control characters; proper CSV quoting alone is insufficient. Import previews must identify conflicts/invalid identities and require an explicit commit. Treat imported names/comments/form answers as untrusted display data.

### SEC-11 — Browser defenses and request origin [P0; application]

Render user text as text. Sanitize any approved rich content with a maintained allowlist, restrict URL schemes, and do not render uploaded HTML/SVG inline under the LMS origin. Build and test a Content Security Policy that permits only necessary application/auth/storage endpoints; start in report-only for validation, then enforce before launch. Avoid unnecessary inline execution, wildcard connect sources and unsafe evaluation.

Set suitable content-type, nosniff, referrer, frame-embedding and permissions policies. Allow camera access only as needed for scanning; test headers against auth and uploads. Use HTTPS and validate deployment domains before HSTS choices. A header checklist is not a substitute for authorization.

For cookie-authenticated mutations, validate CSRF tokens and exact trusted Origin as appropriate; account for login/OAuth callbacks and SameSite behavior. Use exact CORS allowlists, never credentialed wildcard origins. GET/HEAD must not mutate business state. Check CSRF on form-encoded, multipart and JSON routes; do not assume one middleware covers every content type. Same-origin hosting simplifies but does not eliminate this work.

### SEC-12 — Uploads and file access [P0; application/storage]

Define allowed formats per workflow. Enforce per-file, per-user and aggregate quotas, validate actual content/type as well as extension, and use generated storage names. Authorize both upload creation and finalization; never trust a client-selected bucket, owner or path. Prevent overwrite of other users' objects. Large transfers should avoid buffering entire files inside the Worker.

Use private buckets and authorization before short-lived downloads. Signed URLs remain bearer links until expiry; do not claim they can undo files already downloaded. Serve risky documents as attachments or from an isolated content origin. Disallow executables, active HTML/SVG and macro-enabled documents by default unless a reviewed workflow needs them. Do not execute submitted source code or unpack arbitrary archives in the LMS runtime.

Bound signed upload permissions to the intended object and expiry. Recheck uploaded size/content and authorization before finalization; concurrent uploads must not bypass aggregate quotas. Clean up abandoned uploads through a scoped, auditable job without deleting committed submissions. Do not accept client claims that scanning or upload completion succeeded.

For allowed arbitrary documents, quarantine until the agreed malware-scanning process succeeds. Worker file upload acceptance is not antivirus scanning. If scanning infrastructure is unavailable, document a teacher-approved narrower file policy/controlled retrieval instead of labeling files safe. Handle archive bombs, path traversal and decompression limits if archives are ever enabled. Never upload private student work to public scanning sites without authorization.

### SEC-13 — External links, callbacks and webhooks [P0 when enabled; application]

Prefer storing/displaying user-supplied links over server fetching. If previews/imports fetch remote content, explicitly restrict destination/scheme/ports, redirects, response size and time; prevent private/internal/metadata targets and DNS-rebinding paths. Do not rely on client validation or presume a serverless runtime eliminates SSRF.

Allowlist auth redirect destinations; verify provider state/nonce/PKCE using supported flows. Webhooks need signature verification over the original payload, freshness where supported, deduplicated event IDs and transaction-safe application. Do not let an unsigned notification activate an account or publish a result. Jobs re-check authorization/state and use bounded retries/dead-letter reporting.

### SEC-14 — Abuse, availability and spending [P0; application/platform]

Budget-aware protection is required for login/recovery, application submission, guest redemption, attendance codes, invitations, uploads, exports and voting. Use account/credential/event controls and a tested distributed limiter; a Worker module variable is not a global counter. Campus IP is only an additional coarse signal. Give legitimate users retry guidance and accessible recovery rather than a permanent lockout attackers can trigger.

Set bounded request sizes, query limits, CPU/time/batch limits and upload quotas. Enforce rate/spend controls before costly email/storage work. Budget alerts are not guaranteed hard caps. Load-test enrollment and showcase peaks; add specific paid infrastructure only if measured requirements justify it. When a security dependency fails, reject or queue the affected mutation rather than silently skipping verification, while keeping unaffected read-only services available.

### SEC-15 — Data minimization and cache boundaries [P0; application/owner]

Collect only necessary admissions/identity information. Avoid storing detailed medical reasons for absence when an approval status suffices; restrict any required evidence to its reviewer. Separate public project descriptions from private feedback, applicant notes and member contact data. Voter-verification identifiers should be pseudonymous where possible and retained only as needed for the agreed audit.

Authenticated responses with personal data or private outcomes need private/no-store behavior as appropriate and no shared CDN cache. Include authorization/version considerations in any deliberately cached data. Realtime subscriptions require membership authorization and unsubscription/revocation handling. Browser source maps, logs, error responses and analytics must not contain credentials or private records.

### SEC-16 — Secrets and configuration [P0; developers/platform]

Keep secrets in provider secret stores or local ignored files, never Git or handover Markdown. Anything compiled into Vite frontend configuration is public. Publishable client configuration is distinct from privileged database/SMTP/signing keys; use clear names and separate types/clients. Validate required configuration at startup and fail safely if missing.

Use distinct development/test/production credentials, redirect URLs, storage and databases. Restrict CI tokens to needed deploy operations and keep fork/untrusted pull-request jobs away from secrets. Record secret names, owners and rotation procedures only. Rotating a leaked credential comes before removing its text from Git history; ignoring a file is not remediation.

### SEC-17 — Dependency and deployment pipeline [P1; developers/teacher]

Commit a lockfile, use reproducible installs, review dependency additions/install scripts, and run dependency/secret scanning before merges. Pin CI actions to reviewed immutable revisions if CI uses third-party actions. Routine updates require actual changelog/compatibility review, not blind audit-force upgrades.

Require type checks, targeted tests, builds and a teacher review for auth/RLS/transaction/result-publication changes. Test migrations against an isolated copy of the schema with synthetic data, including rollback or forward-recovery strategy. Back up before destructive migrations. Deploy previews against non-production data. Record which commit/schema is running and keep a working rollback procedure. Protect production branch/deploy access through provider controls where available.

### SEC-18 — Backups, recovery and deletion [P0 for launch; platform/owner]

Back up PostgreSQL records and required file objects separately. Encrypt/restrict backup access, separate backup credentials from ordinary application writes where feasible, and keep recovery material outside a departing student's account. Rehearse restore into an isolated environment and verify auth references, enrollment, attendance, files, ballots and awards.

Restored data must not automatically resend invitations, rerun award announcements or double-count externally delivered events. Record snapshot time and reconcile later activity. Adopt an owner-approved recovery-time/data-loss target and retention/deletion schedule; paid point-in-time recovery is optional only if the agreed requirement permits simpler backups. Deleting live data does not instantly remove it from backups; communicate the actual retention process.

### SEC-19 — Logging, monitoring and response [P1; platform/application]

Capture structured request IDs, errors, permission denials, rate-limit events and consequential state changes without raw passwords, session cookies, invitation links, answers or ballots in general logs. Validate/redact inputs in log messages to prevent injection and accidental personal-data exposure. Restrict log access and record retention.

Monitor failed auth bursts, repeated forbidden object access, jury/vote rejection spikes, unusual exports/role changes, storage/email spend, missing backups and pending jobs. Test alert delivery to a named person. Never assume an alert subscription equals incident handling; use the README runbook and rehearse it before the program.

### SEC-20 — Certificates and public verification [P0 when enabled; application]

Calculate eligibility from finalized authorized records. Race-proof issuance against attendance/grade corrections and record the evaluated policy/data version. Use an unpredictable public verification identifier with minimal public fields and rate limits; do not publish a searchable student database by sequential certificate number.

Verification must show the authoritative issued/revoked/replaced state under the approved policy; a downloadable PDF alone is not authoritative. Avoid exposed signer images or templates granting arbitrary issuance. Include explicit authorization for issuance, correction and revocation. Certificate retention and consent remain owner decisions.

### SEC-21 — Internal project and assessment safety [P0; application]

Apply class/team scope to task comments, attachments, rubrics and grading endpoints, not only the parent page. Do not send quiz answer keys or hidden grading fields to a trainee's browser before the permitted time. Timers/deadlines/attempt limits must be server-controlled, with autosave conflicts handled explicitly. Users cannot grade themselves by altering a submitted assignment/team identifier.

Uploaded project source is data, not executable server work. An online code runner, automated grading sandbox or AI document-processing feature would require a separate threat review, isolation and cost plan; none is implied by this LMS. User content supplied to future AI features must never be treated as authorization to access private records or change roles.

## Implementation order and evidence

1. Before public endpoints: SEC-01/02/03/10/11/14/16, baseline logs and isolated environments.
2. Before admissions/files: SEC-05/12/13/15 plus reviewed admission transitions.
3. Before enrollment/learning: SEC-04/09/21 and race/negative-permission tests.
4. Before jury/voting: SEC-06/07/08, signed-off cyber integration and rehearsal.
5. Before certificates/launch: SEC-18/20 and the README operational gates; complete SEC-17/19 evidence.

For every implemented control record: ID; source file/migration/provider setting; owner; test IDs and output location; reviewer; date; remaining limitation. Do not store real credentials or production student records as test evidence.

## Sources checked on 2026-11-05

The requirements above are an application-specific design. These primary references support baseline practices; they are not a claim of completed compliance or a verbatim checklist:

- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): deny by default and validate every request.
- [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): session cookies, expiry and lifecycle defenses.
- [OWASP uploads](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): layered validation, storage isolation and scanning.
- [Supabase security checklist](https://supabase.com/docs/guides/security/production-checklist): provider configuration and responsibility before production.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): exposed-data policies and privileged bypass considerations.
- [Cloudflare Request API](https://developers.cloudflare.com/workers/runtime-apis/request/): runtime request/context behavior to verify during integration.

Recheck provider behavior when code is implemented. No penetration test, security certification, live configuration audit or runtime verification has been performed in this documentation pass.
