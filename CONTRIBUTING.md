# Development and GitHub workflow

Owner instruction: track all development in GitHub issues with acceptance criteria, use the appropriate feature/fix branch, check for errors, and commit/push completed increments. This applies to future work as well as the foundation already written.

Repository: https://github.com/ryuma2317/Next-Gen_LMS

The connector now publishes branches/issues/PRs directly. Use the verified register in GIT_HANDOFF.md; earlier access failures are historical. Current verification fixes are isolated in `tmp/verification-handoff` on `fix/dependency-verification` (draft PR #12). Local npm/shell network restrictions remain separate from successful connector/CI access. Full live acceptance is still required even when the automated CI is green.

## Per change

1. Create or find an issue. Describe the user outcome, acceptance criteria, policy dependencies and validation. Do not put private participant data or credentials in issues.
2. Use `feat/<issue>-description`, `fix/<issue>-description`, or `docs/<issue>-description`. The initial import is planned as `feat/platform-foundation`; admissions builds on it in `feat/admissions-activation`. Use a stacked draft PR while the base feature remains unmerged.
3. Keep commits focused and refer to the issue number after it exists. Commit source, migrations, test updates and relevant handover notes together. Push each coherent increment and at the end of work; do not push secrets, reference PDFs, extracted material, dependencies or local exports.
4. Run `npm run test:domain`, `npm run check`, `npm test`, `npm run build` and affected browser tests as appropriate. Record actual results. Blocked checks remain blocked, not passed. The first successful dependency install must generate and commit a reviewed lockfile; thereafter use `npm ci`.
5. Review the diff for incorrect permissions, data leaks, race conditions, unhandled errors and unintended policy assumptions. Open separate bugs for confirmed defects that cannot be fixed in the increment. Record environment/access restrictions as blockers, not fictional application bugs.
6. Open/update a draft PR describing outcome, scope, tests and remaining limitations. Link the issue. Mark ready only after its acceptance criteria pass. Do not automatically close an issue or merge a PR merely because source code was uploaded.
7. After merge, verify the correct commit/schema reached the intended environment through the approved release procedure. A push is not a deployment.

## Historical connection failures (2026-11-05)

These earlier attempts are retained as history; the publication register above supersedes them.

- GitHub read access succeeds. Creating an issue and `feat/platform-foundation` branch both returned HTTP 403, `Resource not accessible by integration`. Neither remote mutation succeeded.
- Local Git metadata is read-only in this execution session. `git switch -c feat/platform-foundation` could not lock/create the branch ref. No local commit or branch was created.
- npm registry access returned EACCES. Full build/test execution and lockfile generation remain blocked.
- After the access update, GitHub connector reads/writes return `Unknown tool`. Plugin discovery reports GitHub installed/enabled, so additional repository selection has not repaired the current session's unavailable tools.
- The isolated checkout `tmp/git-handoff` is writable, and `feat/lms-platform-admissions` was created there for the combined initial import. The original checkout's `.git` remains unchanged. Report isolated local commits separately from actual remote pushes.
- Prepared issue descriptions and acceptance criteria are in BACKLOG.md. They must be created remotely after GitHub access is fixed; local descriptions are not GitHub issues.

The earlier troubleshooting concerned the GitHub app's contents/issues/pull-request write permissions; connector publication has now succeeded. Local Git metadata also needs writable access for local branching/commits, or use an authorized GitHub API workflow that checks the expected remote head before advancing a ref. Never force-push over another person's work. No push/commit/issue creation is claimed until confirmed by GitHub.

Update: two actual local commits were prepared in the isolated checkout (`26322a6` documentation and `3471ed8` application sources), followed by publishing-runbook/script work. Direct push failed before authentication because this session could not connect to GitHub port 443. No remote push or issue creation succeeded. See [GIT_HANDOFF.md](GIT_HANDOFF.md) for the reviewable publishing script and exact status. Future repository permissions need not be broadened merely to fix an unavailable connector or blocked network.

Attendance continues independently in `tmp/attendance-handoff` on `feat/attendance-sessions`, based on the bootstrap commit. Its draft PR should target `feat/lms-platform-admissions` until the base merges. Publish the bootstrap first using the default script invocation, then use `-Feature attendance` for the stacked branch and its issue/bug criteria. See IMPLEMENTATION.md for actual test evidence; new full integration checks remain pending.

Learning continues in `tmp/learning-handoff` on `feat/learning-assignments`, targeting `feat/attendance-sessions` until the stack merges. Publish it with `-Feature learning` after its base PRs. Its migration set includes timing hardening and explicit named-role function ACLs through 005; earlier feature branches remain unverified and are not complete production deployments.
