# Next-Gen Engagement — Attendance and Competition Rules

Updated: 2026-11-04
Status: Program specification. Confirmed owner decisions are distinguished from delegated attendance defaults and unresolved competition rules. Initial attendance/admissions source exists; see IMPLEMENTATION.md for the exact scope and pending runtime verification. This file is not evidence that every rule is already implemented.

## 1. Confirmed owner decisions

- Pre-event: preparation, recruitment, website maintenance and related setup.
- Event: teaching and project work.
- Post-event: project showcase.
- Morning teaching starts at 09:00. The slide's 08:00 start is incorrect.
- Attendance failure means no certificate.
- Two approved leaves count as one absence.
- The owner delegated the remaining attendance-policy design to the assistant.
- Support external participants when they sign up. CADT participants have school email; external participants may use personal email.
- Competition has two pitching days: semifinal, then final. Half of the total groups advance to the final.
- The system must support jury scoring and awards.
- The official jury score sheet is with the organizer and is not yet accessible to the owner. Do not invent official criteria, weights, aggregation or round carryover.
- The two days have different jury panels and independently variable juror counts.
- Jurors must score without registering an LMS account.
- Mentors and advisors cannot judge their own teams.
- Top-three, Best Innovative Solution and Best Social Impact awards are for finalists only.
- One team may receive only one award: six categories must produce six distinct winning teams.
- The jury decides the winners of the five jury categories. The LMS records and validates those decisions; it must not impose a category-priority algorithm. Only Audience Favourite is selected by vote ranking after excluding the jury-decided winners.
- All competing projects remain on the audience ballot, including jury-award winners. After counting votes, skip teams already winning any of the five jury awards and select the highest-voted remaining team for Audience Favourite. Preserve all valid votes; do not transfer or delete ballots cast for jury-award winners.
- The owner expects cyber-student volunteers to handle voting/network verification. This is a tentative coordination responsibility, not confirmation of a specific implementation or its availability.
- Anyone in the audience may scan and vote, once per person. A specific school Wi-Fi restriction and MAC tracking were suggested, but the owner is unsure of the verification mechanism.
- Awards: first, second, third, Best Innovative Solution, Best Social Impact, and Best Audience Favourite.
- Audience Favourite is decided by audience voting during the showcase morning after the final. All award results are announced that afternoon.

The earlier requirement to ask about ambiguous business rules still applies outside the explicitly delegated attendance design. Exact dates and the assignment of pitching days to a named program phase remain configurable; the owner explicitly placed showcase in post-event.

## 2. Derived morning schedule

Combining the confirmed 09:00 start with the previously specified 90-minute theory, 15-minute break, and 90-minute lab gives:

| Segment | Time |
| --- | --- |
| Theory | 09:00–10:30 |
| Break | 10:30–10:45 |
| Lab | 10:45–12:15 |

12:15 is arithmetic derived from the owner's supplied durations, not a time copied from the slides. Normal teaching is Monday–Thursday. Five weeks normally gives 20 teaching days, but the calendar must use actual scheduled/delivered sessions, including approved Friday replacements and excluding canceled holidays.

## 3. Selected attendance policy

These are concrete planning defaults chosen under the owner's delegation. Keep them editable per edition before opening attendance; freeze a published policy version so later edits cannot silently change historical eligibility.

### Counting unit and threshold

Use **day-equivalent absence points across a trainee's required teaching sessions for the edition**. Record theory and lab separately, each representing half a normal teaching day. This avoids recording someone as present for a whole morning after attending only theory.

| Status for one scheduled theory/lab session | Absence points |
| --- | ---: |
| Present | 0 |
| Late, with attendance verified | 0; preserve the lateness flag/time |
| Unexcused absence | 0.5 |
| Approved leave | 0.25 |
| Canceled / not required | Excluded |
| Not finalized / excuse pending / attendance disputed | Pending; do not invent a final status |

Consequently:

- A full day absent without approval = 1 point.
- A full day of approved leave = 0.5 points.
- Two full-day approved leaves = one full-day absence = 1 point.
- The same 2:1 ratio holds for partial-session leave.
- **At 3 or more points, the trainee fails the attendance condition for a certificate.** This retains the slide's three-absence threshold while applying the owner's leave conversion.
- Examples reaching the threshold: three unexcused full days; two unexcused full days plus two approved full-day leaves; or six approved full-day leaves.
- Examples below the threshold: two unexcused full days plus one approved full-day leave = 2.5 points; one unexcused lab plus one approved theory leave = 0.75 points.
- Use exact quarter-point units in storage/calculation, not floating-point rounding.
- A trainee may still fail another certificate condition; attendance passing alone does not establish complete certificate eligibility.

This default is for trainee teaching attendance. Do not automatically reuse it for trainer employment-like duties, volunteer shifts, jury service, project work, orientation, or other certificate types; their policies remain unresolved.

### Capture, lateness and review

- Start a distinct check-in window for theory and lab, restricted to the enrolled class participants.
- Preserve the confirmed six-second QR display refresh. Choose a **12-second challenge validity** so the previous challenge remains usable briefly after the display changes; show its expiry clearly. The displayed manual code rotates with the same challenge, and the server uses the same expiry policy. This is a selected usability/security tradeoff, not proof of physical presence.
- Accept normal self-check-in during the first 15 minutes of a session. A check-in after the scheduled start is marked late but does not automatically earn absence points.
- After that window, require the trainer to verify attendance and record a reason for a manual correction/check-in. A technical failure must have a supervised fallback.
- The trainer finalizes each delivered session roster. Missing scans initially mean unverified attendance, not an immediately imposed final penalty. Finalization resolves missing entries into absences or pending review.
- Approved leave is a missed session with an accepted excuse, not a scan or a way to claim presence. A later correction to present replaces the leave/absence status for that session; never count both.
- Organizer/admin approves or rejects leave requests with a recorded reason. Trainers can review/request correction for their own classes; they cannot grant themselves privileged overrides.
- Permit leave requests for upcoming or missed sessions, retaining request time and decision history. Late requests are reviewed by organizer/admin rather than discarded by a guessed deadline.
- Corrections recompute the participant's point total and explain the change. Unresolved leave/disputes block final certificate eligibility publication, while dashboards show provisional totals.
- Display warnings at 1 and 2 points, and an explicit attendance-failed state at 3 points. Warn when pending items could affect eligibility. Notifications must not duplicate on retries.
- Attendance failure blocks certificate issuance but **does not automatically delete the account or remove the person from classes**. Whether to remove the participant from the program remains an organizer decision. This deliberately separates the owner's confirmed certificate consequence from the older slide's removal wording.
- Final issuance uses finalized attendance and a recorded eligibility snapshot. If a later correction affects an already issued certificate, mark it for organizer review; do not silently revoke it. Revocation policy is not yet settled.

### Calendar and scope correctness

- Count only required, delivered sessions during the person's effective enrollment. Do not count canceled sessions, sessions before admission, or classes the trainee was never enrolled in.
- A rescheduled lesson is counted once: cancel/replace the original obligation and link the makeup occurrence.
- Class or department changes must preserve historical attendance and explicitly transfer future obligations.
- Attendance records are unique per participant/session. Retries and QR refreshes cannot create additional attendance records or points.
- Lock certificate evaluation to a consistent policy and attendance version so a correction cannot race issuance unnoticed.
- Exceptional session lengths need an explicit configured attendance weight; the theory/lab 0.5-day weights are for the normal equal-length sessions.

## 4. External participant account support

Confirmed: external signups are possible rather than guaranteed each year; personal email must be supported alongside CADT school email.

Recommended identity design: keep institution and participant category explicit, independently of the email domain. Verify email ownership, link accepted applications to the correct person, and provision only the roles approved for that participation. A personal email does not automatically grant external project access, and a school-looking email does not automatically establish school enrollment.

Unresolved: CADT email domain/provider, permitted login methods, external admissions criteria, project-only versus teaching access, certificate eligibility, and permitted team roles. Do not mandate Microsoft/Google SSO until the school identity setup is known.

## 5. Confirmed competition workflow

1. Register the eligible competing project teams and prepare the semifinal pitching schedule.
2. Assigned jurors score semifinal presentations.
3. Select half of the total groups to advance, using the agreed scoring and tie-resolution policy.
4. Finalists pitch again on the final pitching day; jurors submit final-round scores.
5. After the final, hold the showcase for one morning. Audience voting for Best Audience Favourite occurs during that showcase.
6. Close voting, complete result verification/approval, and announce all award results that afternoon.

'Half' is confirmed; rounding an odd number, handling tied cutoff scores, withdrawals, disqualifications, and the exact definition of eligible total groups remain unresolved. Do not silently choose floor/ceiling or break a tie by team ID/submission timestamp.

## 6. Awards and scoring model

| Award | Confirmed selection basis | Open decisions |
| --- | --- | --- |
| First / second / third | Jury-scored; finalists only | Official rubric, round carryover, aggregation, ties and approval. |
| Best Innovative Solution | Jury decides; finalists only; one award per team | Official rubric and decision recording/sign-off workflow. |
| Best Social Impact | Jury decides; finalists only; one award per team | Official rubric and decision recording/sign-off workflow. |
| Best Audience Favourite | All projects on ballot; highest-voted team without a jury award wins | Cyber-team verification method, self-voting, edits and ties. |

Recommended technical structure, not a decision on unresolved judging policy:

- Separate competition rounds, team entries, jury assignments, versioned rubrics, criteria, scorecards, score submissions, qualification decisions, award definitions, award decisions, ballots, and publication records.
- Add named, round-scoped guest jury access without account registration. Panel members and counts are configured separately for each round. Being a mentor/advisor/organizer does not automatically assign someone as a judge.
- Distinguish draft, submitted, locked, reviewed, and published results. Jurors may save drafts; submitted-score changes need an agreed reopening rule and an audit trail.
- Never treat an unsubmitted or recused juror's score as zero. Detect incomplete panels before computing publishable results. Different panel sizes need an explicit aggregation/quorum rule.
- Keep semifinal and final scorecards separately. Whether final rankings use only final scores or a weighted carryover must be decided before scoring opens.
- Enforce the confirmed mentor/advisor conflict rule at assignment and score-access/submission boundaries. Match named guest jurors to their existing mentorship/advisory relationships so a guest invitation cannot bypass the restriction. Other conflicts and review authority remain open.
- Keep calculations reproducible with the exact rubric version and source scorecards. Avoid ad hoc spreadsheet totals that cannot be traced.
- Keep award winners and running audience totals unpublished until the authorized release. Voters may receive a receipt without revealing rankings. Public visibility policy is still to be confirmed.
- Enforce server-side voting windows and transactional ballot uniqueness according to the chosen voter identity and limit. A browser cookie or IP address alone is not a reliable one-person-one-vote identity.
- An audience QR may open the ballot, but a shared QR alone cannot enforce one vote per person. Choose the attendee identification method before implementing voting.
- Queue result publication as an explicit organizer-authorized operation. Internal finalized results and the afternoon public announcement are separate states.

### Jury access without registration — recommended implementation

An organizer prepares a named juror record with round/team assignments and privately distributes an individual high-entropy, expiring invitation link or QR. Exchange the token for a limited session on an explicit redeem action; do not consume it on a GET that an email security scanner might trigger. Store token digests, avoid secret-bearing logs, remove the secret from the resulting page URL, and use a secure session cookie. Invitations/sessions must be revocable with an organizer-assisted reissue path.

Jurors do not register profiles or create passwords. Internally, each score remains attributable to a named juror. A public/shared jury link is unsuitable. Forwarded private links can impersonate their holder, so handoff should be private and the organizer should confirm the juror's identity at the event. Exact delivery method remains open.

Restrict the session to assigned rounds, permitted teams and the official rubric. Re-check expiry, revocation and mentor/advisor conflicts on every submission. Keep drafts and version checks so two tabs cannot silently overwrite submitted work. Do not expose unrelated student data or other jurors' unpublished scores. Day-two assignments do not automatically inherit day-one permissions.

Different panel sizes mean raw summed scores are not inherently comparable. Preserve per-juror/per-criterion records, missing submissions and recusals. The official score sheet must define aggregation, required coverage and any semifinal carryover. Do not publish rankings under an invented formula or substitute zeros for missing/conflicted scores.

### Audience voting — network limits and recommended design

The goal is a public QR entry point with one vote per person. Normal browser pages cannot retrieve device MAC addresses or reliably check a specific Wi-Fi SSID. The Network Information API exposes limited connection characteristics rather than MAC/SSID identifiers. MAC addresses identify network interfaces, not people, and may be private/randomized; shared campus public IPs also cannot identify individuals. Sources: [MDN NetworkInformation](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation), [Apple private Wi-Fi addresses](https://support.apple.com/en-ie/102509).

The owner expects cyber-student volunteers to handle verification. Treat them as the proposed coordination point and confirm the responsible lead, school-network authority, supported mechanism and integration before implementation. No message has been sent to them. The following remain recommendations rather than accepted implementation choices:

1. **Network access:** school cyber/network staff verify an event-network route to the voting service. A dedicated public-egress IP allowlist may work, but cannot distinguish two SSIDs sharing the same public IP. An approved gateway or signed captive-portal identity assertion would require school infrastructure integration. The school team must verify available options. IP allowlisting is supported at an edge firewall, but that does not establish this school's configuration: [Cloudflare example](https://developers.cloudflare.com/waf/custom-rules/use-cases/allow-traffic-from-ips-in-allowlist/).
2. **Voter uniqueness:** issue one unique event voting pass per checked-in attendee. Anyone can scan the public ballot QR, but casting requires the pass. Volunteers use the agreed entry/check-in control to prevent duplicate issuance. No LMS account is required. Software can enforce one ballot per pass; one-person-one-vote also depends on preventing duplicate passes and sharing. This recommendation is not an absolute person-identification guarantee.

Consume the pass and insert the ballot atomically with an event-scoped uniqueness constraint and idempotent retries. Reissuing an unused pass invalidates the old one and cannot create another vote after use. Check voting closure and any agreed network condition on the server at submission. Apply network restrictions to the voting endpoint, not the entire LMS. Never trust a visitor-supplied campus-IP/MAC/SSID assertion or arbitrary forwarded-IP header.

If the school already provides one guest-network credential per attendee, assess that integration as an alternative. Availability and duplicate-credential controls remain unverified. Cookies, fingerprinting, shared QR, MAC claims and IP addresses alone do not fulfill the stated one-person-one-vote goal. Do not require guests to disable private Wi-Fi addresses as the proposed solution. Self-voting, ballot changes, shared-device assistance, network-failure handling and the check-in owner remain open.

### Confirmed award allocation and audience result

The owner confirmed exactly one award per team, with six distinct winning teams across the six categories. The first five winners must be finalists; the audience winner can be any competing team that has not won one of those five awards.

All competing projects remain visible and selectable throughout audience voting. Count all valid ballots normally. Once the five distinct jury winners are finalized internally, walk the audience vote ranking from highest to lowest, skipping those five teams. The first remaining team wins Audience Favourite, subject to the still-unresolved audience tie rule. Do not transfer, erase or relabel votes for jury winners.

Example: audience ranking is A:100, B:90, C:80 votes. A and B already have jury awards, so C receives Audience Favourite with its original 80 votes. C is the highest-voted eligible team, not the overall vote-count leader. Ballot instructions should explain that jury-award winners cannot also receive Audience Favourite, without revealing who those winners are.

Do not hide teams from the ballot based on private jury results. Results remain unpublished until the authorized afternoon announcement. Version the jury winner set, ballot tally and final award decision so calculation can be reproduced. A later jury change triggers reviewed recalculation rather than silently replacing published winners.

Recommended database invariants: each category has one finalized winner, and each team has at most one finalized award per edition/competition. Finalize the complete set transactionally so concurrent administrator actions cannot give a team two awards. Before publication, validate six distinct winners, five eligible finalists for the jury categories, and a sixth eligible audience winner. If there are insufficient eligible teams, unresolved ties or incomplete jury decisions, report the unresolved condition and require organizer resolution; never duplicate winners or invent a fallback.

The jury settles competing claims among the five jury categories. Do not automatically allocate innovation/social-impact awards by subtracting top-three winners from a computed category ranking. Provide a decision workspace showing the official scorecards and five winner selections, and reject a finalized set with duplicate teams or non-finalists. The precise person who records/signs off the jury's collective decision remains to be designated, but the business authority is settled: the jury decides. Scores support that decision under the organizer's rubric; the LMS does not invent it.

### Cyber-team integration boundary

Keep voter verification as an integration boundary pending the cyber team's design. Agree on the verified voter/pass identifier, event scope, duplicate-prevention controls, approved-network proof if required, expiry/revocation, accessibility/failure handling and who issues credentials. The LMS still owns atomic ballot acceptance, voting-window enforcement, tally integrity and the one-award-per-team allocation rule. Externalizing network work does not remove those application responsibilities.

## 7. Remaining decisions

- Official rubric, aggregation, quorum and round carryover: defer until the organizer supplies the score sheet. Do not repeatedly ask the owner for a document they cannot yet access.
- Odd team counts/ties: owner remains unsure. Proposed fallback for discussion is round up (15 teams -> 8 finalists), with a documented jury tie-break and authorized organizer review. This is not accepted; configure the rule before scoring and block automatic qualification while it is unspecified.
- Jury category priority is resolved by jury deliberation, not a software algorithm. Only the decision-entry and sign-off permissions remain to be assigned.
- Cyber/network verification: coordinate with the proposed cyber-volunteer lead when available; pass issuance versus network identity integration remains unselected. Do not repeatedly ask the owner to choose low-level network details they have delegated for coordination.
- Who approves, locks and publishes scores/results remains open.

## 8. Meaningful acceptance cases for later implementation

- Full and half-day attendance examples calculate exactly; 2.75 points passes the attendance threshold and 3 points fails it.
- Two approved leaves equal one absence at the same session/day granularity; no double counting after status corrections.
- Unfinalized sessions, pending leave and disputes cannot silently become final certificate failures or approvals.
- Canceled and replaced lessons do not create two attendance obligations.
- A correction concurrent with certificate issuance is detected; an already issued certificate is flagged for review if eligibility changes.
- Concurrent duplicate votes cannot exceed the agreed per-voter limit; ballots after closing are rejected by server time.
- Missing jury submissions cannot act as zero scores or silently alter qualification.
- Odd team counts and tied cutoff scores require the configured approved rule before qualification is published.
- Submitted scores, qualification overrides and published awards retain their change history.
- Audience totals and jury winners are not leaked through student-facing queries before the permitted release.
- Mentor/advisor conflicts cannot be bypassed by guest links or modified team IDs.
- Each round preserves its own jury panel, headcount and score records; missing scores are not zero-filled or aggregated under a guessed rule.
- Expired/revoked jury invitations and sessions cannot submit; email link previews do not consume invitations.
- No team receives two awards; the finalized result has six distinct winning teams, with the five jury winners drawn from finalists.
- All competing projects remain selectable on the ballot. Skipping jury winners changes audience-award eligibility only, not stored vote counts or ballot ownership.
- If the first two audience-ranked teams have jury awards, the next eligible team wins with its original vote total; tied eligible leaders require the agreed tie rule.
- Concurrent award finalizations cannot assign the same team two categories or publish fewer than six valid distinct winners.
- Two legitimate passes on one campus IP can vote; one pass used simultaneously on two devices yields only one accepted ballot.
- Private/randomized MAC addresses do not prevent legitimate guest voting, and no client-provided MAC/SSID claim authorizes a ballot.
