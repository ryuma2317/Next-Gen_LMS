## Defect and fix

The older admissions RPC used `a.version <> p_version`. PostgreSQL comparison with NULL yields NULL; an otherwise valid direct RPC call could skip an IF rejection guard. API-only integer validation cannot protect a separately exposed RPC.

The new attendance migration replaces that RPC using `IS DISTINCT FROM` and explicit state/reason guards. Attendance revision checks use NULL-safe comparison too. Existing migration files are preserved.

## Acceptance criteria

- [x] New migration adds NULL-safe review and attendance revision checks.
- [ ] Direct otherwise-authorized/MFA RPC calls with NULL or stale revisions are rejected.
- [ ] Valid transitions, idempotent operations and audited corrections still succeed.
- [ ] PostgreSQL/API regression tests pass with all migrations applied.

Regression sources: tests/admissions.database.test.ts and tests/attendance.database.test.ts. Runtime database execution remains blocked by missing dependencies; this is a source-identified logic defect with pending runtime evidence.
