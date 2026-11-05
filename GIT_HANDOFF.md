# Git handover result

Updated 2026-11-05. Repository: `ryuma2317/Next-Gen_LMS`.

Latest quiz continuation: [PR #17](https://github.com/ryuma2317/Next-Gen_LMS/pull/17), branch feat/quiz-modes from dev, contains exam/live-game modes with private server grading and advisory monitoring. [Run 41994150546](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41994150546) passes 103 tests, type checking and build on 87e6bd0a89dc7c439fb64d9960c27935e84b3e8e. Exact-head review/merge status is recorded in [#16](https://github.com/ryuma2317/Next-Gen_LMS/issues/16); report access hardening is [#18](https://github.com/ryuma2317/Next-Gen_LMS/issues/18). No live deployment is implied. Prepared feature checkout: tmp/quiz-handoff; the root Git metadata remains untouched. Apply all migrations through 012 for these quiz sources.

Original development integration: [PR #12](https://github.com/ryuma2317/Next-Gen_LMS/pull/12) merged the reviewed stack into **dev** at `07164d9dc2da8bef1adac0c0564d547ce10ca4ad`, using an expected head SHA and a merge commit that preserves history. Main remains unchanged. [Dev CI run 41984710266](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41984710266) passed both jobs after the merge. PRs #9/#10/#11 are closed as superseded, with their source branches retained. Integration tracking: [#14](https://github.com/ryuma2317/Next-Gen_LMS/issues/14).

The connector publishes through the Git data API; shell Git still cannot connect to GitHub port 443. No force push, service purchase, live-data import or deployment was performed.

## Original source stack (historical)

| Branch | Pull request status | Published source commit |
| --- | --- | --- |
| `feat/lms-platform-admissions` | [#9](https://github.com/ryuma2317/Next-Gen_LMS/pull/9), closed as superseded | `b5d4c381f94c1b63115f8f10964a3e1a1d1639ea` |
| `feat/attendance-sessions` | [#10](https://github.com/ryuma2317/Next-Gen_LMS/pull/10), closed as superseded | `f324175f20dbead813d46fb7e91fc5bafb1124a2` |
| `feat/learning-assignments` | [#11](https://github.com/ryuma2317/Next-Gen_LMS/pull/11), closed as superseded | `6d7a08b7d0f4ee2d50b4653c66d86aad62d97cde` |
| `fix/dependency-verification` | [#12](https://github.com/ryuma2317/Next-Gen_LMS/pull/12), merged into dev | `343bc58241f6195f2bdcee2b50dae8bc31f982d4` (reviewed integration head) |

`main` remains the original `1315aa449acd2174c0e1be8d264f261cd36bc3b2`. Use dev as the base for subsequent feature/fix branches. The old stacked PRs are historical and must not be merged into main separately. Earlier source branches are historical increments, not independent production-ready deployments. Current setup requires all migrations through 006 plus the matching Worker.

## Issues and acceptance criteria

- [#1 Dependency/build verification](https://github.com/ryuma2317/Next-Gen_LMS/issues/1)
- [#2 Foundation and atomic selection](https://github.com/ryuma2317/Next-Gen_LMS/issues/2)
- [#3 Admissions](https://github.com/ryuma2317/Next-Gen_LMS/issues/3)
- [#4 Attendance](https://github.com/ryuma2317/Next-Gen_LMS/issues/4)
- [#5 NULL review revisions](https://github.com/ryuma2317/Next-Gen_LMS/issues/5)
- [#6 Lessons, assignments and grading](https://github.com/ryuma2317/Next-Gen_LMS/issues/6)
- [#7 Post-lock attendance expiry](https://github.com/ryuma2317/Next-Gen_LMS/issues/7)
- [#8 Named function grants](https://github.com/ryuma2317/Next-Gen_LMS/issues/8)
- [#13 Runtime admissions/leave defects](https://github.com/ryuma2317/Next-Gen_LMS/issues/13)

Feature/live-acceptance issues remain open. Integration #14 records the completed development merge separately from production readiness. Local issue bodies are retained in `.github/handoff`; they are now accompanied by verified remote issues. Unimplemented program epics remain recorded in BACKLOG.md and must receive detailed issue criteria before implementation.

## Checkouts and original commit preservation

The root checkout's protected `.git` remains untouched on main. Writable isolated checkouts:

- `tmp/git-handoff`: foundation branch.
- `tmp/attendance-handoff`: attendance branch.
- `tmp/learning-handoff`: learning branch.
- `tmp/verification-handoff`: historical dependency/runtime verification branch.
- `tmp/dev-handoff`: current development checkout; use dev as the baseline and create new branches from it. The evidence update is prepared on docs/dev-integration-handoff before returning this checkout to dev.

GitHub API commits have different IDs from the original local commits because their commit metadata differs. The six uploaded feature-history trees were compared with their corresponding local Git tree SHA and matched exactly; verification fixes were checked the same way. Original local histories are retained on `archive/local-platform-admissions`, `archive/local-attendance-sessions`, `archive/local-learning-assignments` and `archive/local-dependency-verification`. Verified remote commit objects were imported into the isolated checkouts without overwriting the root metadata; branch heads and origin refs match the published histories. A separate local evidence commit is preserved when synchronizing the final documentation update.

| Original local commit | Equivalent published commit |
| --- | --- |
| `26322a6` requirements/security docs | `9d671349b778d14fb9c50c80d7ad1a96ee7f5d85` |
| `3471ed8` foundation/admissions | `e4454b94fc148c028841ac1eee02ae4207f48543` |
| `ecdb59f` publishing handover | `b5d4c381f94c1b63115f8f10964a3e1a1d1639ea` |
| `1d3ca9b` attendance | `9e6535ca8bec0ee404feab2c04917b123c0052a1` |
| `b2f33da` attendance evidence | `f324175f20dbead813d46fb7e91fc5bafb1124a2` |
| `3ade90b` learning/security fixes | `6d7a08b7d0f4ee2d50b4653c66d86aad62d97cde` |

Private PDFs, extracted orientation content, secrets, local temporary metadata and participant records are excluded from publication. Only reviewed text/code/configuration and the public dependency lock were uploaded.

## Verification and continuation

Twenty-one dependency-free tests and 33 TypeScript/TSX syntax parses passed locally. The learning domain job also passed on GitHub. CI generated the first real lockfile in run [41981534204](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41981534204); its reconstructed SHA-256 is `7176aabcf5cdf49f79e96cf08c3a5868e00270dbd648439287063b505fe36327`. Root manifest, registry URLs and integrity hashes were checked before committing. Resolution ran without install scripts and the workflow has read-only permissions and no secrets.

With the lock committed, run [41982089448](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41982089448) installed packages and passed type checking. It found two database root defects, producing six failed tests (31 passed). Forward migration 006 and the enhanced leave-privacy assertions address them; see #13. Rerun [41982401894](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41982401894) passed installation, type checking, 21 domain tests, 37 Vitest API/PGlite tests, production client/Worker build and 16 Chromium browser tests on `513e306742ec50e4434daf2910e3236699bb4e4b`. IMPLEMENTATION.md records the scope and remaining limits. The complete LMS and live security acceptance scenarios remain unfinished.

Use `npm.cmd ci` in a normal Windows terminal with registry access (or `npm ci` elsewhere). The existing main CI remains mandatory; the temporary lock-resolution workflow does not bypass it. Do not blindly approve dependency install scripts. Review the resolved packages and any provider/runtime requirements before release.

The fallback `scripts/publish-handoff.ps1` is a historical initial-publication helper for the old source stack. Do not use it to reopen the superseded PRs or merge them into main. For new work, branch from dev and open the feature/fix PR against dev. Never force old local history over a remote branch. No GitHub CLI sign-in or global execution-policy change is needed for the connector path used here.

The reviewed integration head passed [run 41984197821](https://github.com/ryuma2317/Next-Gen_LMS/actions/runs/41984197821) before the authorized merge; the resulting dev commit passed run 41984710266. Both runs include installation, type checking, 21 domain + 37 API/PGlite + 16 Chromium preview tests and client/Worker build. Older drafts retained historical failures, so their complete fixed descendant was merged as one reviewed integration. Main has not been merged or deployed.
