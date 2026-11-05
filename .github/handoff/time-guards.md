## Source-identified timing gap

A QR can pass Worker verification, then expire while the database write waits for a row lock. The older recording RPC did not receive the verified challenge expiry, and PostgreSQL `now()` represents transaction start rather than the current wall clock after waiting.

## Fix and acceptance criteria

- [x] Worker derives the exact matched current/previous challenge expiry and passes it through a server-only RPC argument.
- [x] A forward migration revokes the legacy three-argument service RPC and creates a four-argument version that checks expiry, window, session generation and session end against wall time after acquiring the session lock.
- [x] Assignment timing and recorded receipt timestamps use the same wall-clock value after serialization locks.
- [ ] Service writes with expired/NULL expiry fail; browser callers cannot invoke either recording path.
- [ ] Reproduce a write delayed past expiry using separate PostgreSQL connections and verify no attendance mutation commits.
- [ ] Verify first-fifteen-minute and deadline boundary behavior under concurrent writes.

Native challenge tests cover exact current/previous expiry derivation. Database/API regression sources are written but not run while dependency installation is blocked. Apply migration 004 with the matching Worker; older attendance Workers fail closed after the old RPC execute grant is revoked. Do not regrant it as a casual rollback.
