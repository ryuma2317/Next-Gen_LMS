# Remaining LMS work

Updated 2026-11-12. Project boards, sprints and explicit assigned access are merged into dev through PR #22; exact-head and post-merge CI pass 143 tests, API checks, type checking and build. This is a delivery map, not a production completion claim. Detailed evidence belongs in IMPLEMENTATION.md, GIT_HANDOFF.md and the linked GitHub issues/PRs.

| Area | Existing implementation | Still needed |
| --- | --- | --- |
| Identity and workspaces | Supabase sign-in, activation, authenticator sources, verified API sessions, edition membership | Approved login/recovery provider setup; genuine multi-role/edition workspace selection; complete invitation/recovery behavior and live verification |
| Admissions | Versioned forms, private receipts, review, verified-mailbox activation and invitation queue | Approved question sets, interview/orientation operations, drafts/withdrawal/waitlists if required, notification delivery and full staff administration |
| Annual setup and people | Edition/course/section data and scoped capability model | In-app yearly configuration, department/specialization changes, role/capability assignment, readiness/finalization and audited admin selection overrides |
| Course selection | Transactional own-seat claims, annual limits and department core checks | Actual calendar/conflict rules, waitlist/move/cancellation policy, admin readiness tools, team formation and real simultaneous-connection testing |
| Attendance | Dated sessions, rotating code/QR, leave/correction/finalization, quarter-unit totals | Real camera/device/provider pilot, operational disputes/notifications and certificate evaluation integration |
| Learning | Text/link lessons, individual assignments, immutable work and released grades | Files/group work, content revision/withdrawal, appeals/rubrics and recovery requirements selected by the program |
| Quizzes | Exam and live-game choice quizzes, server grading/deadlines, advisory monitoring | Real device/network/load testing, accommodations and broader formats if selected; browser events never prove cheating |
| Projects | Initial private boards, sprints, task history/comments and explicit assigned access merged in PR #22 | Self-service team formation, department composition rules, finalization, rooms, attachments/notifications and live acceptance |
| Rooms | Requirements recorded | Annual inventory, shared assignments, configurable booking windows/quotas, overlap protection, cancellation/no-show/override policy and accessible booking UI |
| Jury and showcase | Confirmed two rounds, distinct panels, no own-team judging | Official rubric/aggregation/ties/odd-count rules, named guest invitations, conflict checks, scoring, finalist decisions and reviewed publication |
| Audience and awards | Confirmed six distinct winners; tested audience exclusion helper | Cyber-team identity/network integration, atomic ballots, verified voter recovery, jury-decided award recording, ties/approval and result release |
| Certificates and archive | Attendance rule and pending-state model | Approved full criteria/templates/signers/revocation, eligibility snapshots, issuing/verification, participant history and approved retention |
| Operations/security | Threat model, acceptance register, narrow automated tests, pinned CI | Actual provider configuration, complete security acceptance, accessibility/visual QA, concurrent load, alerts, backups/restore drill, budget owners and teacher launch sign-off |

## Delivery order

Continue with facilities/annual administration and team formation after their required decisions are available. Competition and certificates also need their required policy/configuration. Project development integration is complete for its initial scope; live acceptance is still pending. Keep incomplete actions closed. Do not invent rubric weights, award priority, audience identity, retention periods or final certificate eligibility to make a screen look complete.

Current questions ask the owner about project permissions and the intended private-room quota. No answer is assumed. The official jury rubric remains with the organizer and the cyber integration remains unconfirmed; do not repeatedly request credentials or collect private participant data in chat.

No subscription purchase, main merge or live deployment is authorized by this document. Continue issue-linked branches from dev and merge reviewed increments only after exact-head CI passes.
