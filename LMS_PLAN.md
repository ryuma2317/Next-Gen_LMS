# Next-Gen Engagement — LMS and Program Management Plan

Updated: 2026-11-05
Status: Discovery. Confirmed requirements, recommendations, and unresolved decisions are distinguished below. Do not implement an unresolved business rule by guessing.

Sources: the program owner's messages and the locally downloaded 56-page Trainee Orientation Day.pdf, reviewed in full on 2026-11-04. The original Canva URL remains inaccessible, but the PDF now supplies Batch III reference information. See [PDF_REVIEW.md](PDF_REVIEW.md) for page references, historical facts, and unresolved source conflicts. Historical slide settings are not automatically next-year requirements.

Reference: https://www.canva.com/design/DAHPJpyD2T8/4YHAB0vShjVZFIlm12N8CQ/edit

Detailed follow-up questions: [DISCOVERY_QUESTIONS.md](DISCOVERY_QUESTIONS.md). Current attendance defaults and competition rules: [PROGRAM_RULES.md](PROGRAM_RULES.md). User workspaces and scenario coverage: [UX_BLUEPRINT.md](UX_BLUEPRINT.md). Current sponsor-funded stack and cost assumptions: [STACK_AND_BUDGET.md](STACK_AND_BUDGET.md). Later owner clarifications supersede conflicting slide details.

## 1. Confirmed program context

- Program: Next-Gen Engagement, held annually at the owner's school.
- Teaching lasts five weeks and takes place in person. The owner confirmed pre-event preparation/recruitment, event teaching/project work, and post-event showcase. Pitching, jury scoring, audience voting, and awards are required; exact yearly dates and overall calendar duration remain configurable.
- Sophomores who have completed year 2 volunteer as **trainers**.
- Freshmen who have completed year 1 join as **trainees**, preparing for year 2.
- Initial owner estimate: 100–300 students per year; its scope remains unconfirmed. The Batch III slides separately list 240 expected trainees, 120 trainers, 36 mentors, and 20 advisors (416 across listed categories), excluding unspecified organizer/volunteer totals. These are reference expectations, not actual or approved next-year counts.
- English is the initial interface language.
- Tentative launch: April–June next year. Relative to this conversation date, that means April–June 2027; exact launch date and whether it means recruitment opening or classes starting need confirmation.
- Juniors and CS department teachers will maintain the system. Juniors likely know React; exact experience and availability are unknown. Teacher and AI assistance are available, but this does not remove the need for review and testing.
- Funding comes from sponsors the team finds; the school allocates no project budget. Low recurring cost is required. The exact sponsor ceiling is undecided; the revised estimate is in STACK_AND_BUDGET.md.
- Post-program access is undecided; the owner requests a recommendation and cost explanation.
- The owner explicitly requests questions for ambiguities instead of assumed business rules, with a later explicit exception delegating attendance-policy design to the assistant. Selected attendance defaults are documented in PROGRAM_RULES.md.

### Departments and specializations

| Department | Specializations described by owner |
| --- | --- |
| Computer Science (CS) | Software Engineering; Data Science |
| Digital Business (DB) | E-commerce |
| Telecommunication and Networking (TN) | Telecommunication and Networking Engineering; Cyber Security |

Confirm official spelling, abbreviations, and whether TN's first specialization is one combined specialization. Names above transcribe the owner's description, not school records.

Students can receive school-approved department or specialization changes between years 1 and 2. The system must support updates. Who records these changes and how they affect eligibility and existing enrollments remain open.

## 2. Confirmed teaching and scheduling rules

- Each department currently offers four subjects: two core and two elective.
- A trainee studies four subjects in total.
- Core subjects must come from the trainee's own department.
- Electives may come from the trainee's own department or another department.
- The described current distribution is two home-department cores plus two electives. Whether specialization additionally affects core eligibility remains open.
- Normal teaching days are Monday–Thursday; Friday may be used for exceptions such as holidays or seminars.
- Teaching occurs in the morning: a 90-minute theory session followed by a 15-minute break and a 90-minute lab session for that subject.
- The owner corrected the slides: teaching starts at 09:00. With the supplied durations, the derived timetable is theory 09:00–10:30, break 10:30–10:45, and lab 10:45–12:15. Weekday-to-subject mapping, class sections, timetable conflicts, and makeup rules remain open.
- Subject and eligibility rules may change in later years. They must be configurable per annual edition.

### Batch III subjects from the reviewed PDF

These are reference values from PDF pages 26–28, to be configured per edition:

| Department | Core | Elective |
| --- | --- | --- |
| CS | Algorithm C++; Database Design | JavaScript; Web Design (HTML + CSS) |
| DB | Introduction to Business; E-commerce | Marketing Strategy; UX/UI Design |
| TN | Network Essentials; Introduction to Cybersecurity | System Administration; Basic Electronics |

The roster uses a longer C++ course name; confirm the canonical label. Page 13 calls all twelve subjects elective, contradicting the detailed catalogue and the owner's explanation. Preserve the detailed six-core/six-elective reference and keep the terminology conflict recorded.

### Program phases and final events

The owner has now defined the three phases:

| Phase | Confirmed purpose |
| --- | --- |
| Pre-event | Preparation, recruitment, website maintenance and setup. |
| Event | Teaching and project work. |
| Post-event | Project showcase. |

There are two pitching days: semifinal, then final, with half of the total project groups advancing. The showcase follows the final and lasts one morning; audience voting runs during the showcase. All results are announced that afternoon. The platform must handle jury scoring and awards: first, second, third, Best Innovative Solution, Best Social Impact, and Best Audience Favourite.

This supersedes the slide's single-pitch-day variant. Each round has a different jury panel and independently configurable juror count. Jurors access without account registration; mentors/advisors cannot judge their own teams. The jury chooses the five distinct finalist winners for top-three, innovation and social impact; the LMS validates and records those decisions without imposing category priority. All projects stay on the audience ballot; skip those five winners in the vote ranking to select Audience Favourite, preserving raw votes and producing six distinct winning teams. The official rubric remains with the organizer. Dates, pitch-phase placement, scoring aggregation/carryover, ties/odd counts and decision-entry/sign-off permissions remain open. See [PROGRAM_RULES.md](PROGRAM_RULES.md).

## 3. Confirmed people and organizational structure

Requested access categories:

- Super admin
- Admin
- Organizer: school staff working on this program; use 'organizer' in the product
- Volunteer: belongs to a functional team, such as the trainer team overseeing trainers
- Trainer
- Trainee
- Mentor and advisor access is desired tentatively, especially for assigned project progress; exact distinctions and permissions remain open
- Jury access requires no account registration; recommend named, round-scoped guest invitations and limited sessions. Different day panels/counts and mentor/advisor conflict restrictions are confirmed.
- Anyone in the audience may scan and vote once per person. The owner expects cyber-student volunteers to handle verification; their lead, implementation and school-network integration remain to be confirmed. School Wi-Fi restrictions and per-attendee passes are options, not accepted designs. Browser MAC/SSID tracking is not a valid mechanism. The LMS still enforces ballot uniqueness, voting windows and tally integrity using the agreed verification integration.

Volunteer teams support different program functions. Their names, responsibilities, and permissions are not yet defined. Do not infer that every volunteer can see admissions or academic records.

The owner confirmed that external participant support must be ready if anyone signs up. CADT participants have school email, while external participants may use personal email. External roles, admissions and exact access remain open; do not infer class access from an email address. PDF pages 31–50 list ten CS, six TN, and four DB teaching groups with subject-specific trainer assignments; these do not establish trainee class counts or project team counts.

Only admin and super admin are explicitly identified as able to override participant selections. The exact approval, editing, and delegation powers of other roles are unresolved. Role names alone are not a complete permission hierarchy.

## 4. Confirmed requested modules

### Admissions and onboarding

- Replace the usual Microsoft Forms recruitment flow with forms inside this system.
- Record submitted answers for trainer and trainee recruitment.
- Provision trainer accounts after passing interview and trainee accounts after passing orientation.
- Trainer orientation supports access by QR or link and team assembly with friends.
- Selection authority, workflow stages, applicant login before acceptance, identity matching, application edits, and existing form migration remain undecided.
- Need to clarify trainer orientation timing relative to interview acceptance and account activation.

### Learning and teaching

- Lessons and learning materials.
- Assignments.
- Quizzes.
- Attendance.
- Certificates.
- Participant enrollment and class enrollment for both trainees and trainers.
- Exact assessment formats, grading, and submission rules remain undecided. The owner confirmed that attendance failure means no certificate and two approved leaves equal one absence, delegating the remaining attendance design. PROGRAM_RULES.md defines the selected three-day-equivalent threshold, half-session records, leave approval and correction handling. Other certificate conditions and certificate types remain open.

### Attendance

- The trainer displays a QR and attendance code for a specific session/class.
- QR refreshes every six seconds.
- Eligible trainees may scan the QR or type a code to check in.
- Only participants belonging to that session/class may check in.
- Under the delegated design, use separate theory/lab records, six-second QR/manual-code display refresh with twelve-second challenge validity, a fifteen-minute check-in window, supervised fallback, and organizer/admin leave review. These are selected defaults described in PROGRAM_RULES.md, not claims from the slides.
- Count full-day absence as 1 point and full-day approved leave as 0.5; at 3 points attendance fails and certificate issuance is blocked. Theory/lab each count half a day. Pending/disputed attendance requires resolution before final eligibility. Program removal is not automatic.

### Trainer teaching teams and project teams

- Teaching teams and project teams can have different members.
- Teaching teams are restricted by department; exact subject/specialization restrictions need confirmation.
- Trainers teach in the morning and work on projects in the afternoon.
- Project topics/themes are set by organizers.
- Project teams bring together participants from the three departments. The owner's example of five CS, one DB, and two TN members is illustrative, not a fixed rule.
- Team count, member count, department composition, trainer count per class, trainee capacity per class, and mentor/advisor count per team can change each year.
- A Jira-like Scrum workspace is requested so teams and mentors/advisors can follow progress within the platform. The exact Scrum features are unconfirmed.

### Competition, jury and awards

Confirmed scope: semifinal/final rounds, half-team qualification, jury scoring without signup, six awards to six different teams, showcase-morning voting and afternoon announcement. Panels differ by round; mentors/advisors cannot judge their own teams. The jury decides the five distinct finalist award winners; no category-priority algorithm is needed. All projects remain on the ballot; the highest-voted team outside that winner set receives Audience Favourite without changing raw votes. Official rubric/aggregation, ties, cyber verification and decision-entry/publication permissions remain open; see PROGRAM_RULES.md and UX_BLUEPRINT.md.

### Rooms

- Organizers enter the available rooms for each year; inventory is not yet known.
- Project teams receive room assignments; multiple teams may share a room.
- Historical example: four rooms for sixteen teams, plus two private meeting rooms. These numbers are not future defaults.
- The owner describes a private-meeting allowance of '2h/day only 1 per week per team'. Duration, weekly counting, cancellation, and booking approval need clarification before implementation.

### Controlled selection and readiness

- Admin/super admin should see whether the expected participants have joined before starting group/class assignment.
- Participant selection must be opened deliberately once readiness is confirmed. Exact count definitions and whether pools open independently are unresolved.
- A participant may claim their own slot. Another participant cannot overwrite or delete it.
- The owner expects participants may delete or move their own entry; permitted windows and move rules need confirmation.
- Admin/super admin can override; recommend recording the actor and reason.
- Simultaneous claims must not create duplicate occupants or exceed capacity.
- Apply the agreed ownership and concurrency rules to trainer and trainee selection flows.
- Preventing overwrite is confirmed. The tie-breaking/allocation method and treatment of slow connections are still open.

## 5. Architecture recommendation — not an approved specification

The requested recruitment, mixed-department teams, yearly rules, room allocation, and controlled enrollment justify recommending a custom program platform. Moodle remains an available alternative, but matching these program-specific workflows would need a separate fit assessment and likely customization. Do not claim a complete comparison has already been performed.

Use a **modular monolith**: one deployable application, with separate modules for admissions, identity/access, curriculum, scheduling, enrollment, learning, attendance, projects, rooms, competition/jury, voting/awards, and reporting. This keeps code boundaries clear for rotating student maintainers without requiring multiple independently deployed services.

Following the funding constraint, recommend React/Vite with a Hono API on Cloudflare Workers, retaining managed PostgreSQL/Supabase. This supersedes the earlier Next.js/Vercel baseline. No implementation exists yet, so this is a planning revision, not a code migration. See STACK_AND_BUDGET.md for the tradeoffs and cost controls.

| Layer | Recommendation | Why it fits |
| --- | --- | --- |
| Web application | React + TypeScript + Vite | Familiar React frontend for authenticated role-specific workspaces. |
| UI | Tailwind CSS and shadcn/ui | Reusable forms, dialogs, tables, and responsive layouts with source code the team can maintain. |
| Server | Hono + TypeScript API on Cloudflare Workers | A central place for permission checks and domain workflows in the same repository/deployment. |
| Database | Managed PostgreSQL through Supabase | Strong relationships, transactions, constraints, and reporting for enrollment and allocation. |
| Data access | Supabase client, generated types, versioned SQL migrations and narrow transactional database functions | Ordinary queries remain straightforward; high-contention operations have explicit atomic database logic. |
| Identity | Supabase Auth | Managed authentication and invitations; school SSO choice depends on school identity setup. |
| Authorization | Scoped role assignments plus server checks and PostgreSQL row-level security | A trainer may teach one class and join a separate project; permissions follow those relationships. |
| File storage | Private Supabase Storage | Materials and submissions use access-controlled downloads; file bytes are separate from database records. |
| Live updates | Supabase Realtime where useful | Update availability, attendance totals, and task boards. Live UI updates do not establish ownership; committed database state does. |
| Hosting | Cloudflare Workers with frontend static assets and API routes | Low starting cost; one deployment without an always-running application VM. |
| Email | Approved school service if available; otherwise Resend is a candidate | Invitations, recovery and selected notifications; size the plan for actual daily bursts. |
| Jobs | Database outbox plus bounded scheduled Worker tasks | Retry necessary work without duplicate side effects or an extra service subscription by default. |
| Verification | Type checking, focused unit/integration tests, PostgreSQL concurrency tests, Playwright browser flows | Especially important for permissions, allocations, attendance, grades, and bookings. |
| Maintenance | Git review, automated checks, migrations, setup guide, backup/restore runbook and teacher review of sensitive changes | Makes annual handover practical. |

Keep Hono as the small API layer; no additional backend service framework, Redis, Kubernetes or microservices are justified yet. React knowledge alone is not enough to safely maintain permissions and transaction logic: include teacher review and reproducible tests. Check runtime compatibility before selecting native/Node-specific dependencies.

References: [React/Vite on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/), [Hono on Workers](https://hono.dev/docs/getting-started/cloudflare-workers), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).

## 6. Proposed data boundaries

These are conceptual entities, not a finalized schema.

| Area | Candidate entities and boundaries |
| --- | --- |
| Program editions | Annual editions, phase windows, configuration versions, holidays, exceptions. |
| Identity | People, authentication identities, school identifiers, departments, specializations, affiliation history. |
| Access | Scoped role assignments for edition, volunteer team, class, and project; privileged overrides and audit history. |
| Admissions | Versioned forms and questions, applications, answers, review decisions, interview/orientation records, invitation/provisioning jobs. |
| Curriculum | Reusable subjects, annual subject offerings, core/elective eligibility rules, trainee subject selections. |
| Delivery | Class sections, trainer assignments, trainee enrollments, theory/lab sessions, timetable entries. |
| Formation | Assignment rounds, participant pools, capacity rules, slot claims, readiness approvals. |
| Teams | Separate teaching teams, project teams, memberships, mentor/advisor assignments, project themes. |
| Learning | Lessons, resources, assignments, submission attempts, quiz definitions/attempts, grading and publication records. |
| Attendance | Session challenges, accepted check-ins, status changes and correction history. |
| Projects | Projects and, if approved, backlog items, tasks, sprints, comments, attachments, and progress updates. |
| Competition | Events, rounds, eligible entries, independent jury panels, named guest-juror records, expiring invitations/sessions, conflict restrictions, rubric versions, scorecards and qualification decisions. |
| Awards and voting | Award definitions/eligibility and exclusions, voting events, optional per-attendee passes or verified network-identity integration, ballots, award decisions and controlled publication. |
| Facilities | Annual room availability, shared room assignments, exclusive booking intervals, booking quotas. |
| Certificates | Eligibility evaluations, issuance records, document references, verification and revocation if approved. |

Recommend one person record across years, with year-specific participation and role assignments. A trainee returning as a trainer should not need a disconnected identity. Confirm school identifiers and account policy first.

Keep current school affiliation separate from historical participation. A department transfer should be recorded with its effective date; determine explicitly whether it changes the current edition's eligibility. Never silently remove old enrollments or rewrite past certificates after a profile edit.

Yearly policies should be structured, validated settings: eligible departments, core/elective requirements, subject limit, capacities, team composition, booking quota, and selection windows. Keep executable logic reviewed in code; do not build an unrestricted rules language. Changing a published policy must surface conflicts and require an agreed resolution workflow.

## 7. Critical workflow proposals

### Atomic selection and booking

A claim must execute in a single database transaction: authenticate the participant, check the round is open, validate eligibility and any conflicting selections, lock the relevant allocation records, recheck occupancy and capacity, and commit the claim. Unique constraints provide a final guard against duplicate occupancy. A full pool requires locking its shared capacity record as well as an individual slot; otherwise simultaneous claims for different slots can exceed a total quota.

If the selected slot is occupied, return a conflict and refresh availability. Do not overwrite. A move should reserve the new position and release the old one atomically, retaining the old position if the destination cannot be claimed. Retry requests need idempotency; stale administrative edits need version checks. State transitions that close a round must coordinate with in-flight claims.

Room booking should similarly enforce both non-overlapping exclusive room intervals and per-team quotas inside the database, using interval constraints and appropriate locking. Shared project-room assignments are distinct from exclusive meeting bookings.

This prevents double allocation, but does not select a fair winner by itself. First server-accepted request, randomized allocation, and administrator assignment are different business policies. The owner must choose. PostgreSQL supports the underlying locking and constraints: [locking](https://www.postgresql.org/docs/current/explicit-locking.html), [constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

### Six-second attendance challenge

Use a server-authorized, session-bound, short-lived challenge. The QR is not an authentication credential: the participant must be identified, and the server checks class enrollment and the attendance window before recording one accepted attendance record per participant/session. Use server time, protect challenge generation, limit guesses for manual codes, and make repeated submissions safe.

The owner delegated attendance design: selected defaults keep a six-second display refresh and twelve-second challenge validity for QR and manual entry, allowing a brief overlap for typing or network delay. A supervised fallback handles failures. See PROGRAM_RULES.md for the full policy. Avoid writing a new database row every six seconds per student; the implementation can validate signed challenges and persist actual attendance events.

A rotating QR does not prove physical presence: someone can forward it live. Confirm whether trainer supervision is enough or additional presence checks are wanted before adding location/network restrictions.

### Admissions and activation

Preserve the exact form version and answers submitted. Record a human review decision and provision or link an account after the approved milestone. Repeating the action must not create another identity or resend an uncontrolled number of invitations. Failed deliveries need visible retry status.

Public application identity verification, application resumption, trainer orientation access, and returning participants are open questions. Do not implement automatic acceptance or infer that an application is permission to access classes.

### Annual preparation and closing

Recommend a preparation workflow that copies configuration and reusable materials into a new edition without copying participant records, grades, attendance, or bookings. Validate the new year's rules and timetable before opening recruitment or selection. Closing makes completed work read-only according to the retention policy chosen by the owner; later corrections should be explicit and audited.

## 8. Post-program access recommendation — awaiting decision

Recommended starting policy:

- Keep the same account for future editions, including a trainee returning as a trainer.
- After closing, provide 12 months of read-only access to the participant's materials, feedback, and project history.
- Keep personal completion records and certificate download/verification available while the school operates the platform, subject to a school-approved retention policy.
- Stop ordinary submissions, new bookings, and normal project edits after the agreed closing window.
- Choose separate retention periods for rejected applications, interview notes, raw submissions, and large project uploads. Keeping an account does not require keeping every uploaded file indefinitely.

This is a recommendation, not an approved rule. Exact archive visibility, staff correction rights, file retention, and certificate verification fields need answers.

Cost implication: under the proposed services, there is not a simple fixed LMS license charge for each alumni account. Active identity usage, database size, file storage, downloads, hosting, and email affect the bill. Retaining small profiles and result records may fit existing allowances; large project files and repeated downloads are the greater uncertainty. No incremental alumni cost can be guaranteed before file volumes and usage are known.

Illustration only: at 300 participants and 50 MB of retained personal uploads each, one year adds about 15 GB before shared materials, project files, and backup copies. Five such years add about 75 GB. At 500 MB each, one year adds about 150 GB. These are scenarios, not measured program usage or proposed file limits.

## 9. Sponsor-funded budget recommendation

The school allocates no project funds. Sponsor dependence now explicitly drives the infrastructure choice. The earlier $80–150/month reserve and Vercel Pro baseline are superseded, not additional requirements.

Use [STACK_AND_BUDGET.md](STACK_AND_BUDGET.md) as the current pricing reference: approximately **$30–55/month**, or **$360–660/year**, under its stated usage assumptions. The current base is approximately $25 for Supabase Pro plus $5 for Workers; email and independent file-backup needs determine the rest. Suggested infrastructure fundraising target: around $700/year, subject to actual quotes and donated resources.

Development can begin with local tools/free tiers. Avoid always-on paid staging by default; keep test data and production separate. Ask about a school subdomain, approved email service, backup storage or managed VM before buying duplicate resources. No school resources or discounts are assumed available.

This estimate excludes domain registration, tax, labor, paid AI tools, video hosting, premium recovery, extra services and usage beyond included allowances. No paid service has been purchased. Test peak workflows and size email for recruitment bursts before deployment. Keep backups and access checks even when trimming costs.

Year-round access requires year-round hosting. Seasonal shutdown would change alumni/application/certificate access and needs an explicit decision. Do not assume a five-week teaching schedule means only five weeks of infrastructure expense.

## 10. Delivery and quality gates

Tentative sequencing, not a promised schedule:

1. Resolve identity, annual rules, role permissions, admission stages, selection fairness, and launch milestones.
2. Prototype applicant, trainee, trainer, organizer, and administrator journeys; review with actual participants and maintainers.
3. Implement identities, annual configuration, admissions, and invitations.
4. Implement subject/class enrollment, team formation, and scheduling with database-level concurrency guarantees.
5. Implement lessons, assignments, quizzes, attendance, and certificates against agreed acceptance criteria.
6. Implement project collaboration, room assignment, meeting bookings, jury scoring, qualification, awards and audience voting against the agreed rules.
7. Pilot with representative users, run concurrent-selection and attendance tests, test restoration, train maintainers, and rehearse recruitment opening.

All requested modules remain in scope discussions. This sequence does not silently defer a requested feature beyond launch. Recruitment and interviews may require the platform before the first teaching day; establish both dates.

Important acceptance cases to turn into tests after rules are settled:

- Two participants claim the same final seat; exactly one succeeds and no one is overwritten.
- Two different claims compete for the last shared capacity; total capacity is respected.
- A failed move preserves the participant's existing place.
- Closing a selection round does not allow late in-flight claims to bypass the rule.
- A department change cannot silently leave invalid selections or alter a past year's records.
- An unrelated user cannot check in, read submissions, manage another team, or access applicant answers.
- An expired challenge or repeated attendance request behaves according to the chosen policy.
- Concurrent room bookings cannot violate room availability or the team's weekly quota.
- Repeated admission activation links the same identity without duplication.
- Every privileged override records who changed what and why.
- New-year preparation retains past records and does not carry participant activity into the new year.
- Backups restore both relational records and attachments in a documented rehearsal.

## 11. Current decision status

| Item | Status |
| --- | --- |
| English, five-week in-person program, trainer/trainee terminology | Confirmed |
| Annual flexibility, independent teaching/project teams, no participant overwrites | Confirmed |
| Attendance | Six-second refresh, certificate consequence and 2:1 leave conversion confirmed; remaining trainee policy selected under explicit delegation in PROGRAM_RULES.md. |
| Required module list | Includes jury scoring, both pitch rounds, six awards and audience voting; detailed competition policy unresolved. |
| React/Vite/TypeScript + Hono/Workers + PostgreSQL/Supabase | Current cost-conscious recommendation; supersedes Next.js/Vercel baseline |
| Sponsor-funded operation, no school project funds | Confirmed constraint |
| Approximately $30–55/month operating envelope | Revised estimate with assumptions in STACK_AND_BUDGET.md; spending ceiling not set |
| Alumni access and retention policy | Recommended above; awaiting decision |
| Subject selection, roles, admissions, room quotas, allocation fairness | Questions pending |
| Reference material | Local 56-page trainee orientation PDF reviewed; Canva URL itself not read. Later owner clarification resolves phase terminology, morning start and two-round pitching. Historical slide discrepancies remain documented in PDF_REVIEW.md. |

Latest validation scenarios: test attendance quarter-point boundaries, pending-leave handling, certificate/attendance correction races, jury completeness, qualification ties, duplicate ballots, and embargoed results. See PROGRAM_RULES.md.

## 12. Security delivery and handover

Implement the control requirements in [SECURITY.md](SECURITY.md) alongside each module, and execute the relevant scenarios in [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md). Applicable P0 controls block the affected feature from handling real data. Document implementation locations, deployment settings and test evidence; a plan or hidden UI control is not proof of enforcement.

The [README](README.md) contains the non-code operating procedures: ownership/MFA, school IT and cyber-team agreements, recovery, privacy/retention, incident response and annual handover. Assign actual owners before launch. These requirements add security work to the delivery plan without changing confirmed program rules or automatically authorizing paid services. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the initial code increment and unverified security status.
