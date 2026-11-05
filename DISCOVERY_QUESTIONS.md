# Next-Gen Engagement — Discovery Questions

Updated: 2026-11-05
Status: Unanswered unless explicitly recorded otherwise. These questions define the business rules. Attendance design has been explicitly delegated; its selected defaults are recorded in PROGRAM_RULES.md. Other unaccepted recommendations remain proposals.

## Answers already received

| Original topic | Recorded answer |
| --- | --- |
| Program | Next-Gen Engagement, yearly, five weeks, in person. |
| Participants | Year-2 completers are trainers; year-1 completers are trainees. |
| Language | English initially. |
| Launch | Tentatively April–June next year; calendar interpretation April–June 2027 pending confirmation. |
| Maintainers | Juniors, probably familiar with React, assisted by CS teachers and AI. |
| Budget | Sponsor-funded; no school-allocated project funds. Must keep recurring cost low. Exact ceiling unknown; revised $30–55/month estimate in STACK_AND_BUDGET.md. |
| Alumni access | Unknown; requested recommendation. |
| Features | Lessons, assignments, quizzes, rotating QR/code attendance, certificates, admissions, participant/class enrollment, team formation, project collaboration, and rooms. |
| Special requirement | Ask about ambiguous rules; attendance design is now an explicit delegated exception. |
| Competition | Two pitch days, half advance; first/second/third, innovation, social impact and audience awards; audience votes during showcase morning, results that afternoon. |

## PDF review update and next discussion

The 56-page local trainee orientation PDF has now been fully reviewed. See [PDF_REVIEW.md](PDF_REVIEW.md). Subject names, historical participant expectations, orientation dates, trainer group examples, and a historical absence threshold are available. Do not re-ask for facts already given in the slides; only ask about applicability, contradictions, and missing implementation rules.

The owner answered the PDF reconciliation questions on 2026-11-04:

| ID | Answer / remaining detail |
| --- | --- |
| P1 | Confirmed: pre-event = prepare/recruit/website work; event = teaching and projects; post-event = showcase. |
| P2 | Confirmed: semifinal day then final day, half the total groups advance; jury scoring and all six awards required; audience votes during showcase morning after the final, and all results are announced that afternoon. Exact dates and scoring policy remain open. |
| P3 | Confirmed: start at 09:00; slide is wrong. Previously supplied durations imply theory 09:00–10:30, break to 10:45, lab to 12:15. |
| P4 | Confirmed: attendance failure denies certificate; two approved leaves equal one absence. Remaining attendance design delegated. Selected day-equivalent threshold and session/leave workflow are in PROGRAM_RULES.md. |
| P5 | Confirmed: prepare for external signups, using personal email; CADT students have school email. External role/access and identity-provider details remain open. |

## Competition answers and remaining decisions

| ID | Question | Status |
| --- | --- | --- |
| J1 | Official score sheet exists with organizer; owner cannot access it yet. Do not invent weights/aggregation/carryover. Panels have different people and counts on the two days. | Rubric source answered; scoring rules deferred |
| J2 | Five jury awards are finalist-only. All projects remain on the audience ballot; the highest-voted team without a jury award wins Audience Favourite. Exactly one award per team, six distinct winners. | Eligibility, overlap prohibition and ballot behavior answered |
| J3 | Anyone may scan and vote once per person. Owner suggested specific school Wi-Fi and MAC tracking but is unsure of implementation. Browser MAC/SSID access is unavailable; network control plus per-attendee pass is proposed. | Audience goal answered; mechanism open |
| J4 | Owner is unsure about odd counts and ties. Round-up plus documented jury tie-break is a proposal only, requiring a policy before qualification. | Deferred |
| J5 | Each day's panel and count differ. Jurors need access without registration. Mentors/advisors cannot judge their own teams. | Access/panel/conflict rules answered; result approval authority open |

Next clarification batch:

| ID | Question | Status |
| --- | --- | --- |
| J6 | Owner confirmed one award per team, six winning teams in total. No overlap among jury categories or with Audience Favourite. | Answered |
| J7 | Owner confirmed every team can receive votes. Skip existing jury-award winners in the vote ranking to select the highest-voted remaining team; keep original vote totals. | Answered |
| J8 | Owner expects cyber-student volunteers to handle verification. Lead, method and school-network integration remain unconfirmed. | Coordination responsibility proposed; technical choice deferred |
| J9 | Jury decides the five distinct category winners; the LMS must not impose category order. Those five decisions take priority over Audience Favourite, which is awarded to the highest-voted remaining team. | Answered; no category-priority question remains |

See PROGRAM_RULES.md for guest-jury access, source-backed browser/network limitations and the proposed voter-control design. The organizer's unavailable rubric is deferred; do not repeatedly request it from the owner.

## A. Remaining priority decisions

| ID | Question | Status |
| --- | --- | --- |
| A1 | PDF page 12 lists 240 expected trainees, 120 trainers, 36 mentors, and 20 advisors. Are these representative for next-year capacity planning, and what organizer/volunteer and simultaneous-class counts should be added? | Historical breakdown answered; future sizing pending |
| A2 | Owner described four subjects: two home-department cores and two electives available across departments. Does specialization impose additional core restrictions? | Department-level rule recorded; specialization detail pending |
| A3 | Does each of the four subjects occupy one fixed weekday for all five weeks? Can different sections run the same subject at different times? | Asked in chat; pending |
| A4 | Should competing claims use first valid server-accepted request, a lottery after a preference window, or admin allocation? First-come prevents overwrites but favors faster connections. Are trainee class seats and trainer team seats governed by the same method? | Asked in chat; pending |
| A5 | Is April–June 2027 the recruitment launch, orientation, first class, or final deadline? When must each participant-facing phase open? | Pending |
| A6 | CADT school email and external personal email are confirmed. What school ID/domain/provider and login methods apply, and what access exists before acceptance? | Email categories answered; identity details pending |
| A7 | Who may see applications, record interview/orientation outcomes, accept/reject applicants, and activate accounts? Is orientation attendance enough to pass, or is another check required? When does trainer orientation happen relative to activation? | Pending |
| A8 | What does a selectable 'cell' represent in each workflow: subject/class seat, teaching-team membership, project-team department slot, or something else? Which are self-selected and which are assigned? | Pending |
| A9 | Does readiness mean all expected accepted participants have activated accounts, checked into orientation, or completed another step? Are pools opened separately by department/team type or all at once? Who can reopen or close them? | Pending |
| A10 | Does the private-room rule mean one booking of up to two hours per team per calendar week? Or up to two hours each day? Which week definition, hours, cancellation rules, and approval process apply? | Pending |
| A11 | Delegated defaults: separate theory/lab records, six-second display refresh for QR/code and twelve-second validity. Supervised fallback and correction workflow are in PROGRAM_RULES.md. | Resolved by delegated attendance design |
| A12 | Low recurring cost and sponsor dependence are confirmed; the old $80–150 reserve is superseded. What annual sponsor ceiling can be sustained? The revised $30–55/month estimate is not yet an accepted spending commitment. Alumni retention remains a separate decision. | Funding constraint answered; ceiling/access policy open |

## B. Roles, identity, and affiliation

| ID | Question | Status |
| --- | --- | --- |
| B1 | What distinguishes super admin, admin, and organizer? Which can configure years, change roles, approve admissions, override selections, edit grades, correct attendance, and issue certificates? | Pending |
| B2 | What volunteer teams exist and what may each view/change? Can a person simultaneously be a volunteer, trainer, mentor, or advisor? | Pending |
| B3 | Are mentors/advisors internal or external? What distinguishes the two roles? Can they comment, assign work, grade, manage members, and access multiple teams? | Pending |
| B4 | Who may record an approved department/specialization transfer, what evidence is needed, and when does it affect core eligibility? What happens to already-selected classes? | Pending |
| B5 | Are department/specialization names in LMS_PLAN.md correct? Is 'Telecommunication and Networking Engineering' one specialization? Can trainers teach only their department or also only their specialization? | Pending |
| B6 | Should an existing trainee account be reused when the person returns as a trainer? How should changed school emails or duplicate applications be reconciled? | Pending |

## C. Recruitment and orientation

| ID | Question | Status |
| --- | --- | --- |
| C1 | What fields/questions are on trainer and trainee application forms? Must organizers edit forms each year, use conditional questions, receive attachments, or export responses? Can we obtain the existing form questions? | Pending |
| C2 | May applicants save drafts, edit after submission, withdraw, or submit again? What determines duplicate applications? | Pending |
| C3 | Do interview scheduling, scores, notes, waitlists, acceptance notifications, and orientation check-in belong in the system? Which of these are launch requirements? | Pending |
| C4 | Who may use orientation QR/links, and how is identity checked before team assembly? Do trainer and trainee orientations use the same process? | Pending |
| C5 | Does the desired 'match with friends' flow mean each person claims a position, a team leader invites friends, a group application, or a group reservation? Can someone reserve for an absent friend? | Pending |

## D. Curriculum, scheduling, and formation

| ID | Question | Status |
| --- | --- | --- |
| D1 | Batch III subject names and core/elective designations are now recorded from PDF pages 26–28. Which change next year, are there prerequisites/specialization restrictions, and should the C++ subject use the catalogue name or the longer trainer-roster name? | Historical catalogue answered; future changes/eligibility pending |
| D2 | Does 'class' mean a section for one subject, a fixed trainee group attending all subjects together, or both? Can trainees choose different sections for different subjects? | Pending |
| D3 | Owner confirmed 09:00 start; derived end is 12:15 using supplied durations. Next-year dates, school timezone, exception handling, makeup scheduling, and conflict authority remain open. | Morning timing resolved; yearly calendar details pending |
| D4 | Does every trainer teach one subject or several? How many teaching teams/classes may they join? Are there lead-trainer positions? | Pending |
| D5 | For each team type, what minimum/maximum size and department/specialization quotas apply? Must every project team include all three departments? Are mentors/advisors counted in team size? | Pending |
| D6 | May participants move or leave after selecting a slot, until when, and can moves create an invalid team composition? Are swaps supported? Who finalizes teams and how are incomplete teams resolved? | Pending |
| D7 | Are classes/teams capped, is there a waitlist, and what happens if required subjects are full? Can admins exceed capacity or only reassign within limits? | Pending |
| D8 | May admin/super admin overrides affect any selection? Must the affected participant be notified and must a reason be recorded? Are organizers ever allowed to override? | Pending |

## E. Attendance, learning, and certificates

| ID | Question | Status |
| --- | --- | --- |
| E1 | Is attendance only for trainees, or also trainers, volunteer shifts, orientations, seminars, and project sessions? Who starts/closes attendance and corrects it? | Pending |
| E2 | Owner delegated attendance design with no certificate on failure and two approved leaves per absence. See PROGRAM_RULES.md for selected session/day weights, threshold, late/fallback handling and reviewed corrections; no automatic program removal. | Resolved by delegated attendance design |
| E3 | Is trainer supervision plus authenticated QR/code check-in sufficient, knowing that codes can be shared live? Any additional presence checks must be explicitly selected. | Pending |
| E4 | Which lesson formats are needed: text, PDF, slides, links, downloads, or video? What maximum upload size and approximate file volume should we plan for? | Pending |
| E5 | Are assignments individual, group, or both? File/text/link submissions? Resubmissions, late work, rubrics, grade appeals, and draft/published grades? | Pending |
| E6 | Owner confirmed exam-style fullscreen/tab-event reporting and Kahoot-style games; teachers author keys and results are auto-graded. Initial implementation supports single/multiple choice with explicit settings (QUIZZES.md). Preferred release/scoring/monitoring response, broader question types, accommodations, randomization and real concurrent exam load remain open. | Two modes and automatic grading confirmed; remaining policy/preferences pending |
| E7 | Page 29 promises trainees an e-certificate of participation; page 25 gives an absence-based exclusion. Do other roles receive certificates, what other criteria apply, and who approves/signs/verifies/revokes them? | Trainee certificate type supplied; broader policy pending |

## F. Projects and facilities

| ID | Question | Status |
| --- | --- | --- |
| F1 | Which Jira-like capabilities are required at launch: backlog, board columns, sprints, task assignment, subtasks, comments, attachments, estimates, deadlines, progress reports, or retrospectives? | Pending |
| F2 | Who creates projects/themes and assigns them? Can teams choose topics? Who creates/edits tasks, moves tasks, opens/closes sprints, and reviews progress? | Pending |
| F3 | Is project visibility limited to the team and assigned mentors/advisors, or can trainers, volunteer teams, and organizers browse other teams? | Pending |
| F4 | How are shared project rooms assigned, and what team/seat capacity applies per room? Can assignments change by day or session? | Pending |
| F5 | Who may book/cancel a private room on a team's behalf? Are bookings instant or approved? Do canceled/no-show bookings consume the weekly quota? Can an organizer block rooms for events? | Pending |
| F6 | Are room bookings and project work restricted to afternoons? What happens to a booking when the room is withdrawn or a school event overrides it? | Pending |

## G. Operations and delivery

| ID | Question | Status |
| --- | --- | --- |
| G1 | What should alumni retain: lessons, feedback, project boards, files, transcripts, certificates? For how long? Who can correct an archived record? | Pending |
| G2 | What retention periods apply to rejected applications, interview notes, submissions, attendance, and project attachments? Who at the school decides these? | Pending |
| G3 | School provides no project funds. Can it still provide a subdomain, approved email service, backup storage or server/VM? Who owns service accounts and handles sponsor-funded invoices? | Resource question asked in chat; pending |
| G4 | How many developers/teachers will contribute, with how much time, and who reviews releases and handles incidents? | Pending |
| G5 | What integrations are essential: Microsoft/Google sign-in, email, Telegram, calendars, school records, or existing spreadsheets? Are notifications in-app, email, or both? | Pending |
| G6 | What devices and campus connectivity are typical? Is offline use necessary? What accessibility or school data-hosting requirements apply? | Pending |
| G7 | How much data loss and downtime are acceptable, especially during selection and assessments? Do we need stronger recovery than daily database and file backups? | Pending |
| G8 | Who signs off on the pilot and launch? Which requested workflows must be ready before recruitment, orientation, and teaching respectively? | Pending |

## Reference status

The original Canva edit URL remains unread, but its locally downloaded Trainee Orientation Day.pdf has been reviewed in full. No repeat export is needed for this deck. The owner has now supplied the three phase definitions and corrected morning timing and the pitching process; these later clarifications supersede conflicting slide details.

## Answering workflow

P1–P5 and J1–J9 have been answered, narrowed or explicitly deferred as recorded above. Do not re-ask jury category priority: the jury decides. See UX_BLUEPRINT.md for the proposed user workspaces, workflow coverage and remaining design dependencies. Obtain the official rubric and cyber-integration details when available, and continue the other discovery questions in manageable batches. Unanswered questions remain unresolved; silence is not approval.
