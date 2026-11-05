## Outcome

Support versioned recruitment forms, private status receipts, authorized review, interview/orientation outcomes and controlled activation.

## Acceptance criteria

- [ ] Published forms accept valid trainer/trainee applications with original question/version snapshots.
- [ ] Private receipt status exposes no answers or contact information; retries cannot overwrite a different application.
- [ ] Explicit edition permission plus MFA protects review; stale/skipped transitions fail and changes are audited.
- [ ] Trainer interview / trainee orientation must pass before invitation queueing.
- [ ] Verified matching mailbox is required for activation; retries create one membership and cannot reactivate a suspension.
- [ ] Optional invitations are rehearsed with approved SMTP/template/redirect configuration; retries and failures are reconciled.
- [x] Six dependency-free admissions validation/receipt/transition tests pass locally.
- [ ] API, PostgreSQL and browser tests pass against the implemented workflows.
- [ ] Owner confirms permission assignments; real-data security/privacy gates are met.

## Current source / limits

Source is included in the combined initial branch. No email was sent, cron installed, production records imported or migrations applied remotely. Draft editing, decision appeals/corrections, queue pagination beyond 300, MFA enrollment/recovery and full affiliation-transfer tools remain pending. See IMPLEMENTATION.md for setup and limitations.
