## User outcome

Assigned trainers run dated theory/lab attendance sessions. Trainees scan a rotating QR or enter its code, receive a receipt and request leave. Explicitly assigned MFA reviewers handle leave; totals remain provisional while required sessions or reviews are unresolved.

Branch: `feat/attendance-sessions`, stacked on `feat/lms-platform-admissions` until the bootstrap merges.

## Acceptance criteria

- [ ] Schedule/cancel sessions with scoped permission, MFA and audit reasons; cancelled sessions add no penalty.
- [ ] Only assigned trainers start/snapshot/finalize delivered rosters; unrelated users cannot inspect or manage them.
- [x] Dependency-free HMAC tests confirm six-second rotation, twelve-second maximum validity and wrong session/generation/key rejection.
- [ ] Real camera scanning, manual entry and accessible fallback work on supported mobile/desktop browsers.
- [ ] Only verified active expected participants can check in during the first fifteen minutes and before session end; direct browser RPC bypass is denied.
- [ ] Retries, stale/NULL revisions and correction/finalization races preserve integrity.
- [ ] Leave notes are private; explicit permission and MFA are required for approval, with no self-approval.
- [x] Quarter-unit rule tests preserve two approved leaves = one absence, and unresolved records block a final attendance condition.
- [ ] Type check/build, API/PostgreSQL/browser tests and actual separate-connection races pass.

Evidence: 14 total dependency-free tests pass and 26 TypeScript/TSX files parse. Runtime integration/camera/build tests remain unrun because package installation is blocked. No migration or real attendance was applied. Full disputes/appeals, replacement-session links, late-enrollment roster amendments, certificate issuance/reconciliation and notification delivery remain pending. Attendance passing alone does not qualify for a certificate.
