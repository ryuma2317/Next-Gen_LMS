# Next-Gen Engagement — User Experience and Workflow Blueprint

Updated: 2026-11-05
Status: Proposed product design based on the owner's confirmed requirements and the reviewed orientation deck. This document maps all currently described areas; it is not a claim that every business rule or possible edge case is settled. Initial screen/API/migration sources now exist; see IMPLEMENTATION.md for the exact implemented slice and pending verification. Proposed workspaces below are not all working features.

Read with [LMS_PLAN.md](LMS_PLAN.md), [PROGRAM_RULES.md](PROGRAM_RULES.md), and [DISCOVERY_QUESTIONS.md](DISCOVERY_QUESTIONS.md). The owner's latest clarification is authoritative: the jury chooses five distinct winners; the audience winner is the highest-voted team outside that winner set. No automatic category priority is required.

Funding constraint: the school allocates no project funds; operation depends on sponsors. Keep all requested workflows in the design while controlling recurring service costs. Current recommendation is React/Vite/TypeScript with a Hono API on Workers and Supabase PostgreSQL; see STACK_AND_BUDGET.md. This infrastructure revision does not silently remove any role or feature below.

## 1. Product structure

One platform with shared identity and data, organized into workspaces appropriate to the person's assignments. Avoid separate databases or duplicated accounts for every role. Proposed navigation has an edition selector, an active-workspace selector for people with several roles, and clearly labeled class/project context. A workspace switch changes the visible tools; the server still enforces the person's actual scoped permissions.

Three configured program phases:

| Phase | Primary workflows |
| --- | --- |
| Pre-event | Annual configuration, recruitment, review, interview/orientation outcomes, activation, class/team preparation and controlled selection. Website maintenance is an operational task, not an automatic participant permission. |
| Event | Morning teaching, attendance, lessons, assignments/quizzes and grading; trainer afternoon projects, mentoring, room use and booking. |
| Post-event | Showcase and audience voting; result announcement and certificates/closure according to configured dates. Pitching days are scheduled explicitly; their exact phase placement is not assumed. |

Recommended presentation: English, responsive layouts; mobile-friendly scanning, applications, schedules and ballots; wider tables/boards for staff and project work. Every home screen emphasizes the person's next required actions, deadlines and current status rather than a generic dashboard of statistics.

## 2. Workspaces for each user type

The screens below are design proposals. Confirmed restrictions are identified; remaining permission boundaries need approval before implementation.

| User type | Proposed home and screens | Scope / unresolved boundary |
| --- | --- | --- |
| Visitor / applicant | Program overview, available pathways, trainer/trainee application, submission receipt and interview/orientation instructions. | Form access and application-status authentication remain open. Submitting a form never grants class access. |
| Trainee | Today, My Subjects, Class Selection, Timetable, Lessons, Assignments, Quizzes, Attendance and Leave, Results, Certificates, Announcements. | Own eligible enrollments and academic records. Cannot replace another participant's selection. |
| Trainer | Today, My Teaching, Class Rosters, Materials, Assessments/Grading, Attendance Display, My Teaching Team, My Project, Room Bookings, Announcements. | Teaching and project memberships are independent. Content/grade powers apply only to assigned classes and need a final permission matrix. |
| Volunteer | My Functional Team, Assigned Tasks, Check-in tools, relevant coordination queues and Announcements. | Scoped to functional responsibility. Trainer coordination and cyber coordination are examples, not broad admin access. Exact volunteer teams/powers remain open. |
| Organizer | Program Overview, Admissions queues, Curriculum/Calendar, Team/Project Oversight, Mentor/Advisor Assignment, Facilities, Competition, Certificates and Reports. | Proposed operations workspace. Actual decision/edit permissions remain open; do not infer admin override rights merely from the title. |
| Admin | Edition Setup, Participants, Eligibility/Affiliation Updates, Readiness, Selection Controls, Exceptions/Overrides, Access Assignments and Audit History. | Owner explicitly allows participant-selection overrides for admin/super admin. Other powers need a final matrix. |
| Super admin | Cross-edition administration, top-level access management, configuration oversight and audit/recovery tools. | Proposed distinction from admin; exact delegation and infrastructure access remain open. It is not a reason to expose secrets or fabricate jury decisions. |
| Mentor | My Assigned Projects, Progress Board, Milestones, Deliverables and Feedback. | Assigned teams only by proposed default. Exact comment/edit permissions open. Cannot judge own team. |
| Advisor | My Assigned Projects, Review Requests, Deliverables and Feedback. | Same assignment-based boundary proposed; differences from mentor duties remain open. Cannot judge own team. |
| External participant | Approved participation dashboard, with project/team tools if admitted for projects. | Personal email supported. External is an affiliation category, not an automatic permission role; course and certificate eligibility remain open. |
| Guest juror | Private invitation, assigned round agenda, team/project briefing, official scorecard, draft/submitted status and submission receipt. | No account registration. Named, limited guest session; own-team mentor/advisor conflicts blocked. Day-one and day-two panels are independent. |
| Audience visitor | Public showcase directory, ballot entry, verification step selected with cyber team, one-vote submission and receipt. | No general LMS access. All projects stay on ballot; winner selection skips the five jury winners after votes are counted. |
| Returning participant / alumnus | Previous edition results and materials according to retention policy; current-year participation in its own workspace. | Recommended identity reuse and read-only history; retention duration and annual reapplication rules remain open. |

An organizer who also teaches, or a former trainee who becomes a trainer, should not be modeled as mutually exclusive identities. Multi-role combinations and cross-year access require explicit scoped assignments; detailed permitted combinations remain to be confirmed.

## 3. Recruitment to activation

### Proposed screen flow

Public program page -> choose trainer/trainee application -> answer the edition's form -> submit -> receipt/status -> authorized review -> interview or orientation outcome -> invitation/activation -> appropriate workspace.

The owner confirmed trainer activation after passing interview and trainee activation after passing orientation. Trainer orientation/team formation is a separate step; its timing relative to activation is still open. Application resumption/status access may use a verified application link rather than creating a full participant account early, but that mechanism has not been selected.

Staff screens should show the exact submitted form version, answers, review state and permitted next action. Proposed states include submitted, under review, awaiting outcome, accepted/rejected and activation pending/complete. Drafts, waitlists, appeals and resubmission are optional states awaiting requirements, not confirmed features.

Handle duplicate applicants, existing identities returning next year, changed email, failed invitation delivery and repeated acceptance clicks without duplicate accounts. Keep school affiliation independent of the email address. Do not infer school-approved department transfer from an applicant editing a form.

## 4. Annual setup and readiness

Proposed setup checklist: edition dates and phase windows; departments/specializations; subject offerings and eligibility; class sections and capacities; trainer staffing; teaching/project team composition; room inventory and meeting quotas; forms; assessment and attendance policy; competition rounds and panels; certificates.

All numerical examples from the owner's year remain examples. New-year preparation can copy approved configuration/materials for editing but never carries forward submissions, attendance, bookings, scores or team membership as new activity.

The Readiness screen compares expected participants with actual admissions, invitations, activations and relevant orientation states, showing exceptions by pool. The owner has not yet specified which status constitutes 'joined'; keep these counts distinct. Admin/super admin explicitly opens selection after reviewing readiness. Independent departmental opening, thresholds, late arrivals and reopening rules remain decisions.

## 5. Subjects, classes and team selection

### Trainee course/class flow

Show the trainee's applicable department/specialization and the annual eligibility rules, required core subjects, eligible electives, selected total and class availability. The current described model is four subjects, home-department cores and cross-department electives; the precise enforcement and specialization mapping remain in discovery.

If a class section has a fixed timetable, show the actual sessions before confirming a selection. The distinction between a fixed trainee group and a subject-specific class section remains open. Do not design navigation around a guessed equivalence between the deck's trainer groups and trainee classes.

### Teaching-team flow

Show eligible department-based teams, subject assignments, members, capacity and the person's current selection. Restrict participation using that edition's approved rules. The 'join friends' interaction might be self-claim, invitation or group request; the owner has not chosen its mechanics.

### Project-team flow

Show project teams separately, including topic/theme, approved department-composition requirements, available positions, mentor/advisor assignments and room assignment. A trainer can belong to a different teaching team. Cross-department quota values remain annual configuration, not hardcoded 5-CS/1-DB/2-TN limits.

### Shared selection behavior

- Selection closed: show status and opening information, not editable cells.
- Available: show eligibility/capacity; participant requests their own claim.
- Submitting: indicate a pending request; do not claim success before the server commits.
- Claimed: show confirmed ownership and permitted leave/move actions.
- Lost race/full: explain that the place is unavailable and refresh alternatives. Never overwrite another person.
- Move fails: retain the old place through an atomic move transaction.
- Admin override: capture actor, reason and changes; notification behavior still needs agreement.
- Stale page, two tabs, retries and simultaneous final-seat requests must obey the same database constraints.

Race-safety is settled; the allocation policy is not. First-come, lottery and administrator assignment have different fairness implications. Waitlists, seat swaps, group reservations and post-close moves remain unresolved.

## 6. Daily learning and attendance

Trainee Today shows the assigned subject, room, theory 09:00–10:30, break to 10:45, and lab 10:45–12:15 using the owner's stated timings. Trainers see their teaching duties and separate afternoon project work. Friday replacements, holidays and seminars use scheduled event exceptions rather than another rigid weekday rule.

Class detail proposes tabs for overview, materials, assignments, quizzes, announcements and personal results. A trainer's version adds roster, grading and attendance controls. Initial exam/live-game quiz flows and supported settings are specified in QUIZZES.md; broader formats, grading appeals and certificate weights remain pending. Group submissions and broader assignment policies remain to be specified.

Attendance screen flow: trainer starts the assigned session -> displays rotating QR/code -> trainee authenticates and scans/types -> server verifies enrollment/window -> receipt -> trainer finalizes roster -> leave/correction review -> updated points and certificate-eligibility status.

Use the delegated defaults in PROGRAM_RULES.md: distinct theory/lab records, full unexcused day = 1 point, full approved-leave day = 0.5, certificate attendance failure at 3 points. Show each contributing session, pending requests and correction history so the result is understandable. No certificate is finalized from unresolved attendance. Avoid automatic account removal.

Support unavailable camera, poor connection, expired challenge, duplicate scan, wrong class, canceled session, missed scan with supervised verification, and approved leave replacing an absence. A rotating code is not proof that the person is physically present.

## 7. Trainer projects, mentoring and rooms

Proposed project workspace: Overview, Team, Backlog, Board, Milestones/Deliverables, Feedback and Rooms. A light Scrum design can include tasks, assignees, status, due dates, comments and sprints, but exact Jira-like features and edit rights remain unapproved. No unrelated Jira account is required for the requested internal workflow.

Team members see their own project's work and assigned mentors/advisors. Mentors/advisors see the projects assigned to them; organizers get a proposed program-wide progress view if permitted. Their ability to edit tasks, approve deliverables or grade is still open. Confidential feedback visibility must be defined before implementation.

Facilities distinguish two workflows:

- Shared project-room assignment: staff assigns teams to rooms with annual capacities and schedules; multiple teams may share a room.
- Private meeting booking: a team requests an available interval; server validates room availability and the approved team quota atomically.

Show availability, team allowance, existing reservation and cancellation state. The exact 'two hours/day, once per week' rule remains unresolved. Handle concurrent requests, quota races, cancellation, a withdrawn room and an organizer event conflict. Do not silently choose booking hours or cancellation penalties.

## 8. Competition and six distinct awards

### Guest jury journey

Private invitation -> named limited session -> assigned round/team -> official rubric -> save draft -> review -> submit -> receipt.

The juror never needs to register an LMS account. Each day's panel and count are independent. The organizer's score sheet is pending, so the design provides a versioned rubric/scorecard structure without invented scoring weights. Missing/recused scores are not zeros. Conflict checks apply to mentor/advisor relationships even when using a guest identity. Expired links, revocation, accidental link previews, connection loss and multi-tab edits need explicit handling.

### Competition operations journey

Configure semifinal -> assign conflict-free panel -> collect required scorecards -> review qualification -> publish finalists -> configure separate final panel -> collect final scorecards -> record jury's five award decisions -> validate five distinct finalist winners -> close audience voting -> determine sixth winner -> review/publish all results in the afternoon.

The owner confirmed half advance, but odd counts, tie rules and aggregation remain unresolved. These should appear as unresolved configuration, not be silently chosen by software. Precise permission to enter and sign off a collective jury decision remains open.

### Jury decision workspace

Provide five award slots: first, second, third, Best Innovative Solution and Best Social Impact. Show supporting scorecards and eligible finalists. The authorized recorder enters the jury's decisions. Prevent assigning the same team to two awards and prevent finalizing an incomplete/invalid set. The jury settles category decisions; the platform does not impose a ranking priority across categories.

### Audience journey and award calculation

Showcase QR -> all competing projects -> cyber-team-agreed voter verification -> select one team -> confirm vote -> receipt. No LMS account is required for the proposed public voting experience. Network verification details remain an external coordination item; the LMS owns window checks, unique ballot acceptance and accurate tallying.

All teams remain selectable, including the five jury winners. Preserve raw vote totals. Audience Favourite goes to the highest-voted team outside the finalized five-team jury winner set. If first and second in the vote ranking have jury awards, the next eligible team wins. Do not transfer votes or mislabel it as the overall vote leader. Ties require an agreed rule.

The final result must contain six distinct teams. Validate eligibility and completeness before publication. If too few eligible teams exist, raise an organizer decision instead of fabricating a winner. Later corrections require an audited review, not silent changes to announced awards.

## 9. Certificates, closure and next year

Proposed certificate screen shows per-person eligibility and the reasons for any blocked/pending state. Attendance is one condition; other conditions, signatures, formats, roles receiving certificates and revocation policy remain open. Audience/jury awards and trainee participation certificates are separate records and workflows.

Provide an archive view once an edition closes. The earlier recommendation of 12 months' read-only learning access and retained completion records is not yet accepted. Reopening records or issuing corrected documents should be explicit and audited. Future editions reuse identity if approved, while preserving historical department, role, team, course and result records.

## 10. Scenario coverage register

This maps the scenarios described so far; it is not an exhaustive guarantee about all possible real-world cases.

| Scenario | Design response | Status |
| --- | --- | --- |
| Recruitment formerly used Microsoft Forms | In-platform forms with versioned answers and review queues | Requested; form details pending |
| Trainer passes interview / trainee passes orientation | Controlled activation/invitation with duplicate prevention | Milestones confirmed; authority/timing details pending |
| Returning trainee becomes trainer | Reuse person identity with annual roles and archived history | Recommended; account policy pending |
| School versus external participant | Explicit institution/category, school/personal email support | Confirmed support; external access pending |
| Department/specialization transfer | Effective affiliation change, revalidate future eligibility, preserve history | Required; approval/conflict policy pending |
| Core and cross-department elective selection | Edition-specific subject eligibility and four-subject total | Required; specialization/section mapping pending |
| Wait until everyone has joined | Readiness counts and explicit admin opening | Required; readiness definition pending |
| Two students claim same position | Atomic server claim, one winner, no overwrite | Required; fairness allocation method pending |
| Participant moves to an already taken slot | Atomic move fails without losing original slot | Proposed technical behavior |
| Teaching team differs from project team | Separate memberships and screens | Confirmed |
| Yearly team/class/mentor/room counts change | Validated annual configuration | Confirmed |
| Trainer friend-group formation | Team-selection entry point at orientation | Required; invitation/reservation mechanics pending |
| Lesson/assignment/quiz learning | Class workspace with personal progress and trainer tools | Required; assessment mechanics pending |
| Six-second attendance code and missed scans | Session-bound check-in, supervised correction, transparent points | Required plus delegated defaults |
| Two approved leaves equal an absence | Exact quarter-point session accounting | Confirmed ratio, delegated counting policy |
| Holiday/seminar and Friday replacement | Calendar exceptions, replacement links, no duplicate absence | Required; authority/details pending |
| Morning training, afternoon trainer projects | Separate schedule items and workspaces | Confirmed |
| Mentor/advisor views progress internally | Assigned project board/deliverables/feedback | Requested; edit differences pending |
| Several teams share a project room | Shared assignment model | Confirmed |
| Team private-meeting allowance | Exclusive interval booking plus transactional team quota | Required; quota interpretation pending |
| Different jury panel/count each day | Independent round assignments and scorecards | Confirmed |
| Juror has no LMS account | Private named guest invitation/session | Requirement confirmed; technical design proposed |
| Mentor/advisor on jury | Exclude own teams from score access/submission | Confirmed |
| Half advance with odd count or tied scores | Configuration/decision gate before qualification | Open; no assumed rule |
| Jury chooses five winners | Decision entry and distinct-finalist validation | Confirmed authority; sign-off operator pending |
| Audience leader already has a jury award | Skip in award eligibility, preserve raw ballot total | Confirmed |
| One person tries repeated votes | Verified voter key plus unique atomic ballot | Required; cyber-verification contract pending |
| Voting ends before afternoon announcement | Server-close voting; internal review; explicit publication | Confirmed sequence; publication operator pending |
| Certificate fails attendance | Explain points and block issuance after review | Confirmed plus delegated defaults |
| Next year changes rules | Version configuration and preserve historical records | Confirmed need; detailed transition policy proposed |

## 11. Important design decisions still needed

These are not reasons to stop designing the shell and flows, but they block final behavior for the affected feature:

1. Role/permission matrix: admin versus super admin versus organizer; functional volunteer scopes; mentor/advisor differences; admissions and sign-off operators.
2. Class/group mechanics: fixed trainee cohort versus subject section, exact core/specialization restrictions, subject-day mapping, trainer assignments and selection fairness.
3. Formation rules: self-claim versus invites, reservations for friends, opening criteria, move/close/reopen behavior and incomplete-team resolution.
4. Learning details: lesson media, quiz types/timers, assignment/group submissions, grading and certificate criteria beyond attendance.
5. Room quota interpretation, booking authority, approval, cancellation and shared-room capacities.
6. Project feature scope and task/feedback edit visibility.
7. Organizer's official rubric, semifinal qualification/ties and scoring completeness; jury category authority itself is resolved.
8. Cyber verification integration and voting tie/self-vote/edit rules.
9. Launch milestone, sponsor spending ceiling, possible donated infrastructure, operational ownership, alumni access and retention. Sponsor dependence/no school funds is confirmed; exact budget is open.

Use DISCOVERY_QUESTIONS.md as the detailed backlog, not a questionnaire to demand all at once. Work through a few related decisions per round and update this blueprint as they settle.

## 12. Proposed next design deliverables

- Agree the role/permission matrix and the meaning of class/team selection first.
- Produce wireframes for the trainee Today/class view, trainer dual teaching/project view, admin readiness/selection view, guest jury scorecard, and public ballot.
- Map approved screen actions to domain services, database constraints and tests.
- Build a complete vertical workflow at a time: application to activation; selection to timetable; attendance to certificate status; then competition to award publication.

These are next steps, not claims that mockups, tests or implementation already exist. Keep testing focused on permissions, competing writes, identity, attendance arithmetic, jury conflicts and award/vote integrity as each workflow is implemented.
