# Next-Gen Engagement Platform

Development workspace for the yearly CADT Next-Gen Engagement program. Build 0.4 includes initial selection, admissions, attendance, lesson, assignment/submission, grading and initial exam/live-game quiz sources. Live configuration and verification remain pending; it is not ready for real participants.

## Start here

| Document | Purpose |
| --- | --- |
| [API_GUIDE.md](API_GUIDE.md) | Beginner API explanation, Apidog import and contract maintenance. |
| [LMS_PLAN.md](LMS_PLAN.md) | Program requirements, architecture and delivery plan. |
| [UX_BLUEPRINT.md](UX_BLUEPRINT.md) | User workspaces, journeys and scenario coverage. |
| [QUIZZES.md](QUIZZES.md) | Exam/live-game requirements, implementation bounds and monitoring limits. |
| [PROGRAM_RULES.md](PROGRAM_RULES.md) | Confirmed rules, delegated attendance defaults, jury and voting design. |
| [STACK_AND_BUDGET.md](STACK_AND_BUDGET.md) | Current cost-conscious stack and sponsor-funded operating estimate. |
| [DISCOVERY_QUESTIONS.md](DISCOVERY_QUESTIONS.md) | Answers received, remaining decisions and deferred integrations. |
| [PDF_REVIEW.md](PDF_REVIEW.md) | Evidence from the supplied orientation deck and later corrections. |
| [SECURITY.md](SECURITY.md) | Security requirements, threat model and 21 control groups to implement. |
| [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md) | Security acceptance scenarios and evidence required before release. |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Current code, setup commands, verification limits and next implementation steps. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Issue, branch, review, commit and push workflow. |
| [BACKLOG.md](BACKLOG.md) | Issue criteria, implementation queue and verified GitHub links. |
| [GIT_HANDOFF.md](GIT_HANDOFF.md) | Published branches, draft PRs, original local commits and verification evidence. |

Current development branch: **dev**. The reviewed stack was merged through [PR #12](https://github.com/ryuma2317/Next-Gen_LMS/pull/12); pre-merge and post-merge CI passed. Start new development branches from dev. See [DEV_REVIEW.md](DEV_REVIEW.md) for scope and remaining limits.

## Run the initial build

With Node 22.12+ and npm registry access, run `npm.cmd ci` then `npm.cmd run dev` on Windows (or `npm ci` / `npm run dev` elsewhere). The default interface uses synthetic sample data and needs no cloud account. See IMPLEMENTATION.md for checks, optional Supabase development setup and deployment boundaries.

Local package installation remains blocked, but GitHub Actions generated the reviewed dependency lock and has installed packages and passed type checking. Twenty-one dependency-free tests passed locally and in CI. The complete rerun on the verification branch passed 21 domain tests, 37 API/PGlite tests, the client/Worker build and 16 Chromium browser tests after migration 006 fixed two database defects. Evidence and remaining live-integration limits are recorded in IMPLEMENTATION.md.

Account settings include initial authenticator enrollment and verification sources; provider testing is pending. Initial learning sources now include lesson drafts, configured individual text/link assignments, immutable submissions and separately released grading. Initial exam/live-game quiz sources pass automated CI: 103 domain/API/PGlite/Chromium tests plus type checking and build. Actual provider/device/load/security acceptance remains pending; see QUIZZES.md. Broader quiz formats, file/group submissions, complete disputes/certificates, projects/rooms, jury/voting and administration workflows remain unfinished.

**Current setup requires every migration through `202611050012_quiz_report_scope.sql`.** The latest Worker and migrations 004/005/006 must be deployed together in the reviewed development/release process. Migration 004 replaces the attendance recording interface; 005 explicitly restricts named-role function grants. Quiz sources require the full set through 012 with the matching client/API, including timed reveals and private-report permission fixes. Earlier increment setup notes are historical and do not establish readiness to expose live intake or check-in.

## Current direction

- Sponsor-funded; no school-allocated project budget. Keep recurring costs low.
- Recommended stack: React + TypeScript + Vite, Tailwind/shadcn, Hono API on Cloudflare Workers, Supabase PostgreSQL/Auth/private Storage.
- Estimated initial production envelope: $30–55/month under the assumptions in STACK_AND_BUDGET.md. Development can start with local tools/free tiers. No services purchased.
- Three phases: pre-event preparation/recruitment, event teaching/projects, post-event showcase.
- Independent teaching/project teams and year-specific configuration.
- Jury chooses five distinct finalist award winners. Audience Favourite is the highest-voted other team; all projects remain on the ballot. Six awards go to six distinct teams.

## Reading the notes

Later owner clarifications supersede old slide details. Historical examples are not permanent yearly defaults. Proposed UI/permissions and unresolved rules are labeled; do not treat them as approved requirements. Attendance design is the explicit exception where the owner delegated policy choices.

The current React/Vite/Workers recommendation supersedes the earlier Next.js/Vercel baseline after the sponsor-funding constraint was clarified. All previously described program workflows remain in the planning scope.

## Security status — read before developing or handing over

Updated 2026-11-05. **The initial application is not ready for production.** Automated checks pass on the verification branch; live acceptance remains pending. The security documents describe required behavior; they are not evidence that the application already provides all of it. IMPLEMENTATION.md records the current increment and actual checks.

| Item | Current status |
| --- | --- |
| Requirements and security acceptance scenarios | Written; awaiting implementation and execution. |
| Repository exclusions | `.gitignore` added for local secrets, generated files, private exports/backups and the supplied orientation PDF. |
| Application, API, database policies and authentication | Sources cover foundation, admissions, attendance and initial learning. Automated type/build/API/PGlite/preview-browser checks pass on the verification branch; live integration remains pending. |
| Secret scanning, CI checks, MFA, alerts and backups | CI executes with pinned actions; scoped MFA sources are written. Provider setup, live security scenarios, alerts and recovery verification remain pending. |
| Runtime security tests / penetration test | Full acceptance scenarios not run. CI passes 21 domain, 37 API/PGlite and 16 preview-browser tests; real Supabase/device/concurrency and live security verification remain pending. |

`.gitignore` prevents some accidental additions. It does not remove already tracked files, detect secrets in other files, restrict access to files on a laptop, or erase Git history. The orientation PDF remains on disk; it should not be published with the application. Keep real student data out of the repository, including screenshots, issue attachments, test fixtures, extracted PDF material and AI prompts. Review what is staged before every commit.

## Handover owners and access

Assign actual people and record their approved contact channels in a private operations directory before launch. Do not put personal phone numbers, backup codes, passwords or tokens in this repository.

| Responsibility | Required owner | Current assignment |
| --- | --- | --- |
| Program rules, privacy/retention decisions, permission approval | Organizer with school authority | Unassigned |
| Security review and approval of critical changes | Supervising CS teacher | Unassigned |
| Application changes, migrations and release evidence | Junior development lead with teacher reviewer | Unassigned |
| Cloud accounts, domain, billing, backup and recovery | Continuing school/teacher platform owner | Unassigned |
| Audience identity verification and campus-network integration | Cyber volunteer lead with school IT supervisor | Unassigned |
| Operational incident coordination and communications | Organizer plus named technical deputy | Unassigned |

One person may hold several responsibilities, but critical access should survive a graduating student's departure. Prefer two designated continuing custodians for account recovery, subject to school policy. Do not make every volunteer an administrator just to avoid configuring permissions. Job titles alone do not authorize access; approve the permission matrix in SECURITY.md before implementation.

### Accounts and credentials — people must do this

- Use school-approved organization accounts and named individual collaborators for hosting, database, DNS, Git and email. Avoid sharing one student's login. Record who owns each service, its billing renewal and its recovery procedure.
- Enable provider MFA for privileged maintainers, preferably passkeys/security keys when supported. Protect the email accounts that can reset these services too. Application MFA for privileged roles must also be implemented and tested; cloud-console MFA does not protect LMS admin accounts.
- Keep recovery codes and emergency credentials in an approved password manager/vault. Give access only to designated custodians and rehearse recovery without exposing codes. Do not share secrets in chat, documents, source code or screenshots.
- Give collaborators the minimum service permissions they need. Review Git/deployment/database privileges separately from LMS roles. Maintain a revocable emergency-access procedure with an audit trail and review after use.
- At handover, transfer ownership and test the new owner's access first. Then revoke departing members' sessions, invitations, API/deployment tokens and service access, and rotate shared credentials they knew. Never delete the sole recovery owner before the replacement is verified.
- Review account access before each annual edition, when a role changes and immediately when someone leaves. Closing a program edition should end its operational privileges without corrupting retained historical records.

### Development and release workflow

1. Read the program rules and security requirements before choosing a shortcut. Record unresolved program rules as unresolved; do not invent policy in code. Security recommendations in these documents do not authorize extra access or change who wins an award.
2. Use synthetic participants and files for local development and previews. Separate production and development projects, secrets, storage and callback URLs. Never connect a public preview to the production service key or clone identifiable production data into it.
3. Commit database migrations, permission policies and a lockfile with the application. Record tool/runtime versions and exact setup, test, migration, deployment and rollback commands. Initial commands and their execution status are in IMPLEMENTATION.md; dependency installation must succeed before a real lockfile can be committed.
4. Configure CI for type checking, relevant tests, builds, secret detection and dependency review. Protect the production branch and require review for authentication, RLS, privileges, awards, votes and migrations. Where a provider plan cannot enforce a rule, use a documented teacher-reviewed release procedure and state the limitation.
5. Review third-party packages, install scripts and CI actions. Pin reusable actions to reviewed immutable revisions where supported. Do not give untrusted pull requests production secrets. Investigate dependency advisories rather than blindly applying breaking upgrades.
6. For each security control, attach the implementation location, test result, reviewer and date. Re-run affected tests after a change. A passing frontend test cannot establish database authorization; test direct API, database/RPC, storage and realtime paths too.
7. Apply production migrations through the reviewed release process. Back up before risky changes; check whether rolling back the application is compatible with the new schema. Do not treat a destructive reverse migration as a safe rollback.
8. Verify live environment settings after deployment, using designated synthetic accounts and a limited smoke test. Do not load-test, exploit-test or scan school networks or third-party services without the responsible owner's authorization.

## Before the first live intake — operational checklist

These tasks require both implementation evidence and human/provider configuration. All boxes are deliberately unchecked.

- [ ] Name the owners above, approve the role/action/scope matrix and record an incident contact route.
- [ ] Implement and pass applicable P0 controls and tests from SECURITY.md and SECURITY_TEST_PLAN.md. Disable unfinished features. Resolve P1 requirements or document a teacher-approved, time-limited mitigation as defined in SECURITY.md.
- [ ] Verify privileged MFA, account recovery, session revocation, database RLS, restricted storage and production-secret isolation on the actual deployment.
- [ ] Configure the real HTTPS domain and exact authentication redirect origins. Remove unused development callbacks from production. Verify security headers and origin/CSRF behavior in the deployed browser; decide HSTS scope only after checking affected domains.
- [ ] Configure approved email sending, invitation/recovery templates and sender-domain authentication with school IT (SPF/DKIM and a reviewed DMARC policy). Test delivery and bounces before sending a large recruitment batch. Do not overwrite existing school DNS records without the responsible administrator's review.
- [ ] Set storage, upload, request, email and job limits. Configure usage alerts and available spending controls with a named billing recipient. An alert is not necessarily a spending cap. Rehearse peak enrollment and attendance without locking out everyone behind campus Wi-Fi.
- [ ] Agree what application answers are necessary, who can see them, notices/consent where required, retention periods, correction/export requests and deletion responsibilities. Ask the school's responsible privacy/administrative owner to review applicable obligations, including any requirements for minors; this document makes no legal compliance claim.
- [ ] Confirm permission to publish project details, names, photos and certificate fields. Keep applicant answers, medical/leave explanations, individual votes and private assessment records out of public pages.
- [ ] Select a practical upload review/scanning process. Configure quarantine and safe download behavior before accepting risky files. A scanner is not a guarantee; if reliable scanning is unavailable, restrict formats and use the teacher-reviewed policy in SECURITY.md. Do not upload private submissions to public malware-analysis sites.
- [ ] Back up database records AND required Storage objects; verify encryption, access and retention. Restore into an isolated environment and verify selected accounts, attachments, grades, attendance, ballots and awards. Record the result and approved recovery targets.
- [ ] Rehearse guest-jury invitations, conflict-of-interest exclusions, round separation, result embargo and revocation. Confirm how organizers verify juror identities and mentor/advisor relationships.
- [ ] Have the cyber lead approve and rehearse the audience-verification contract below. Do not advertise “one person, one vote” merely because the code limits an IP, browser or device.
- [ ] Train organizers/trainers on attendance overrides, privacy, phishing, QR/link substitution, lost devices, suspicious votes and incident reporting. Review official links/QR displays before sessions and showcase voting.
- [ ] Confirm unresolved rules needed by the enabled features, including jury rubric, ties, odd semifinal counts, permissions and room quotas. Keep affected actions closed until their required configuration is complete.

For each checked item record **owner, date, environment, evidence location and remaining limitation**. Keep evidence redacted and access-controlled. Checking a box without a deployment/test/configuration record does not complete the gate.

## Audience voting: agreement with the cyber team

The LMS must integrate with the cyber team's chosen verification process; it cannot discover a voter's device MAC address or Wi-Fi SSID through an ordinary browser. A school-network restriction establishes network access, not unique human identity. MAC addresses, browser fingerprints, cookies and IP addresses must not be treated as proof of one person.

Before implementation, the cyber lead, school IT and organizer must agree and document:

| Item to agree | Required outcome |
| --- | --- |
| Verification method and operator | Who may receive a voting credential, how identity/eligibility is checked and who resolves duplicates. |
| Stable event identity | One verified person maps to one event-specific voter identifier, even if their pass is replaced or they use another device. Minimize retained identity data. |
| Credential verification | Signed assertions with reviewed key distribution/rotation, or a secure server verification interface. Define audience/event binding, expiry, replay protection and revocation. Never trust a browser-supplied “verified” flag or arbitrary proxy header. |
| Network restriction, if used | Trusted enforcement point and proof the application can verify. Include a direct-internet bypass test. Do not build the design around an unverified assumption about school Wi-Fi. |
| Lost pass, duplicate claim and outage | An auditable recovery process that preserves the same identity; who may pause voting and what approved fallback is available. A dependency outage must not silently allow unverified ballots. |
| Rehearsal and privacy | Load, shared-campus-IP, signature failure, replacement-pass and repeat-ballot tests; retention/deletion owner for any identity mapping. |

The database must atomically accept at most one ballot per verified event voter. That alone cannot prevent people sharing credentials; issuance, supervision and dispute handling remain human responsibilities. Do not invent a vote-change policy: resolve it before implementing updates. Preserve raw vote totals. The five jury awards take priority, and Audience Favourite goes to the highest-voted eligible remaining team as described in PROGRAM_RULES.md.

## Backups and recovery runbook

1. The platform owner chooses and records the approved recovery point objective (maximum acceptable data loss) and recovery time objective (acceptable downtime). **Recommendation to review:** automated daily database and file backups as a baseline, with extra backups before migrations and competition-result publication; consider a tighter schedule during voting/results if daily loss is unacceptable. These are proposed operating targets, not current capabilities.
2. Inventory database, Storage objects, relevant configuration, migrations, auth integration and encryption/recovery keys. Verify exactly what the selected provider's backups include. A database dump alone does not recover file bytes or every managed-auth capability.
3. Keep restricted, encrypted recovery copies under continuing school custody, with appropriate separation from the compromised/deleted primary account. Record retention, failed-backup alerts, key recovery and who can restore. Do not store copies in this repository or a departing student's personal drive.
4. Restore into isolation before the first launch, before each annual intake and after material recovery changes. Use a test that checks representative relationships and files, not just whether SQL imports. Disable outbound email, scheduled jobs and public endpoints during restoration.
5. For a real recovery, preserve incident evidence and recent authoritative exports where safe; compare backup time against accepted ballots, submissions, attendance and award decisions. Record what cannot be recovered. Never fabricate missing votes or attendance. Obtain organizer review of any reconciliation before publishing results.
6. Validate the restored service, rotate compromised credentials, control job replay using idempotency and get the responsible owner to approve production promotion. Record downtime, lost data, corrective actions and the next rehearsal date.

## Routine operations and annual handover

| When | What the responsible people must do |
| --- | --- |
| During active recruitment/program/showcase | Check actionable security alerts, failed jobs/backups and spending regularly; daily is the proposed baseline during live operation. Ensure someone is reachable during enrollment and voting windows. |
| Weekly during live operation | Review unusual role changes, bulk exports, guest invitation failures, attendance overrides, vote anomalies and unresolved incidents. Review relevant dependency/provider advisories; prioritize according to exposure and severity. |
| Before each edition | Review eligibility rules and permissions, remove stale privileged access, validate capacity/configuration, rehearse recovery and high-contention workflows, and retest jury/voting integrations. Use new scoped assignments rather than carrying last year's access forward automatically. |
| Before showcase | Verify final juror assignments and conflicts, credential issuance, voting times, result visibility, clock configuration, incident contacts and publication procedure. Arrange on-site support and an organizer-approved fallback. |
| After an edition | Close active windows, revoke guest sessions, expire temporary staff access, reconcile records, archive according to approved retention and document problems. Keep certificate verification and other promised services available according to the agreed policy. |
| Off-season | Assign a continuing maintenance owner. Check service health, renewals, backups and security notices; the app still needs care while students are not teaching. Record a cadence appropriate to enabled services. |
| When maintainers change | Transfer organization/domain/billing ownership, source and deployment access, runbooks, recovery evidence and outstanding risks. Verify replacements can deploy and restore; revoke departing access and rotate exposed/shared credentials. |

Handover package, stored in approved locations:

- Repository and deployed-environment inventory, service owners and cost/renewal estimates.
- Architecture, current schema/migration history, API/auth/session decisions and permission matrix.
- Environment-variable **names and purposes only**, with secret vault locations and rotation instructions; no secret values.
- Exact working setup/deployment/rollback commands once implemented, plus build/runtime version records.
- Security control/test evidence, outstanding defects, approved exceptions with expiry and remediation owner.
- Backup/restore instructions and last rehearsal result, incident contacts and dependency-update procedure.
- Annual configuration checklist, jury/voting integration contract, agreed retention and certificate correction procedures.

## Incident response — do not improvise alone

1. **Report and record:** tell the named technical owner and organizer through the private incident channel. Record time, affected feature, relevant request/audit IDs and symptoms. Do not paste student data or credentials into a public issue or group chat.
2. **Contain the affected path:** revoke a leaked invitation/session/key, suspend a compromised account, or pause the affected write/publication feature. Preserve useful logs and records. Avoid a blanket shutdown if unaffected safe functionality can continue, but do not keep accepting unverifiable votes or privileged actions.
3. **Assess with the supervising teacher:** determine exposed data, scope, integrity effects and whether other accounts or backups are affected. If a secret leaked, revoke/rotate it immediately; deleting the file or rewriting Git history alone is insufficient.
4. **Recover and validate:** patch the cause, re-run affected negative and positive tests and follow the isolated restore procedure if needed. Investigate suspicious grades, attendance and ballots with organizers; do not silently delete evidence, reset totals or invent replacements.
5. **Communicate through authorized owners:** organizers/school authorities decide participant/provider/regulatory notices under applicable rules. Juniors should escalate promptly, not promise confidentiality or independently issue breach statements.
6. **Close with evidence:** record the cause, timeline, data impact, fixes, owner and follow-up tests. Reopen the affected feature only after its responsible owner verifies the control works. Keep private incident details access-controlled.

| Example | Immediate handling |
| --- | --- |
| Service key committed or shown in a screenshot | Revoke/rotate, check deployments and access logs, remove the exposure and review history with the teacher. |
| Jury link forwarded or juror device lost | Revoke that guest session/token, verify the juror through the organizer and reissue access to the same assignment; review score changes. |
| Suspicious audience-vote spike | Preserve evidence, involve cyber/organizer owners, pause the affected flow if verification is compromised and reconcile using the approved dispute process. Shared Wi-Fi alone is not fraud evidence. |
| Private file accessible publicly | Restrict the object/bucket/path, address cached copies where possible, investigate access and notify the responsible privacy owner. An already downloaded copy cannot be remotely recalled. |
| Compromised privileged account | Revoke sessions and role grants, protect recovery access, review exports/changes and rotate any service secrets the person could access. |
| Backup failure, corrupted migration or provider outage | Escalate, protect current data, use the reviewed rollback/restore plan and communicate service limits. Do not bypass authorization to restore availability. |

## Budget and limits of protection

Use the existing stack's authorization, database constraints, private storage, validation and reasonable limits before adding services. Security code and tests need developer/reviewer time even when no subscription is required. Provider account settings, backup storage, reliable file scanning, email delivery and stronger recovery guarantees may need resources; verify availability and price before promising them. Paid enterprise tools and a dedicated monitoring platform are not assumed in the current estimate.

Software cannot establish physical attendance from a QR scan, independently verify a juror's relationships, prevent every shared voting pass, decide school policy or maintain itself after handover. The named people and procedures above are part of the system's protection. No application can promise complete security; record remaining limits honestly and keep reviewing them as features and annual rules change.
