## Reproduction and impact

CI run 41982089448 installed dependencies and passed type checking, then failed six database tests (31 passed). The first admissions failure was an ambiguous `q` reference between a PL/pgSQL variable and a query alias. The first attendance failure was leave-read RLS querying `teaching_sessions`, whose direct reads are deliberately ungranted. Subsequent review/finalization tests cascaded from those failures.

## Acceptance criteria

- [x] Migration 006 fixes intake answer-key validation without changing old migrations, receipt semantics or stored question snapshots.
- [x] The intake RPC remains executable only by service_role, including projects with named default grants.
- [x] Leave owners can read their own notes; assigned reviewers need MFA; unrelated participants and teaching-only staff cannot read private notes.
- [x] Reading notes does not require granting direct access to teaching_sessions or widening class/edition permissions.
- [x] Named-role ACLs are explicitly restricted for the new private policy helper.
- [x] Relevant database regression tests and full CI pass; live Supabase and concurrency evidence remain separate requirements.

Fix branch: `fix/dependency-verification`, stacked on learning. No real records or production migrations were executed.

Automated evidence: [run 41982401894](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41982401894) passes 37 Vitest API/PGlite tests, 21 domain tests, type checking, production build and 16 Chromium preview tests. Keep the issue open for acceptance review; live Supabase and concurrent connections are not established by this run.
