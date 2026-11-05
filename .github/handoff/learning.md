## User outcome

Assigned, explicitly authorized teaching staff publish class lessons and assignments. Eligible trainees read released material and submit individual text/HTTPS-link work under the assignment's configured rules. Authorized graders draft feedback/scores and release them deliberately.

Branch: `feat/learning-assignments`, stacked on `feat/attendance-sessions` until its base is reviewed.

## Acceptance criteria

- [ ] Draft lessons/assignments are hidden from learners, including direct RPC calls.
- [ ] Access is scoped to active section membership/teaching assignment or explicitly assigned oversight.
- [ ] Editing/grading require explicit section capabilities and MFA; no authority is granted from role labels.
- [ ] Account TOTP enrollment/verification succeeds without persisting QR secrets; existing verified factors remain intact, incomplete setup is handled through approved recovery, and invalid codes/provider failures do not grant access.
- [ ] Publishing requires explicit opening/deadline/late-submission/attempt/format settings. No scoring weights, certificate rules or late penalties are invented.
- [ ] Submitted attempts retain content/configuration history; idempotent retries, concurrency, closed windows, stale/NULL versions and maximum attempts are handled transactionally.
- [ ] Graders cannot grade themselves. Unreleased scores/feedback do not leak; draft edits preserve the learner's last released snapshot until deliberate release.
- [ ] Text renders as text, HTTPS links are validated and never fetched/embedded by the server; files/group assignments remain disabled until their workflow is implemented.
- [ ] Validation tests and actual API/PostgreSQL/browser/build checks pass with evidence.

No production data or deployment is authorized by this issue. Full quizzes, file uploads, group submissions, grading appeals, weighted results and certificate issuance remain separate work dependent on the recorded program decisions.

Latest narrow evidence: 21 dependency-free tests pass, 33 TypeScript/TSX files parse and migration 005 explicitly covers all 50 existing function signatures. API/PostgreSQL/browser/build checks remain unrun because dependencies cannot be installed. New regression sources simulate provider-style named function grants before/after the forward permission fix. Class material lists currently cap at 100; work is paged at 50 records.
