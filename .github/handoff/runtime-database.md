## Reproduction and impact

CI run 41982089448 installed dependencies and passed type checking, then failed six database tests (31 passed). The first admissions failure was an ambiguous `q` reference between a PL/pgSQL variable and a query alias. The first attendance failure was leave-read RLS querying `teaching_sessions`, whose direct reads are deliberately ungranted. Subsequent review/finalization tests cascaded from those failures.

## Acceptance criteria

- [ ] Migration 006 fixes intake answer-key validation without changing old migrations, receipt semantics or stored question snapshots.
- [ ] The intake RPC remains executable only by service_role, including projects with named default grants.
- [ ] Leave owners can read their own notes; assigned reviewers need MFA; unrelated participants and teaching-only staff cannot read private notes.
- [ ] Reading notes does not require granting direct access to teaching_sessions or widening class/edition permissions.
- [ ] Named-role ACLs are explicitly restricted for the new private policy helper.
- [ ] Relevant database regression tests and full CI pass; live Supabase and concurrency evidence remain separate requirements.

Fix branch: `fix/dependency-verification`, stacked on learning. No real records or production migrations were executed.
