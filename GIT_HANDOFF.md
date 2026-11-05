# Git handover result

Updated 2026-11-05. Repository: `ryuma2317/Next-Gen_LMS`.

The GitHub connector recovered and successfully published the prepared work through the Git data API. Shell Git still cannot connect to GitHub port 443. No force push, merge, service purchase, live-data import or deployment was performed.

## Published branch stack

| Branch | Draft pull request | Published source commit |
| --- | --- | --- |
| `feat/lms-platform-admissions` | [#9](https://github.com/ryuma2317/Next-Gen_LMS/pull/9), targets main | `b5d4c381f94c1b63115f8f10964a3e1a1d1639ea` |
| `feat/attendance-sessions` | [#10](https://github.com/ryuma2317/Next-Gen_LMS/pull/10), targets foundation | `f324175f20dbead813d46fb7e91fc5bafb1124a2` |
| `feat/learning-assignments` | [#11](https://github.com/ryuma2317/Next-Gen_LMS/pull/11), targets attendance | `6d7a08b7d0f4ee2d50b4653c66d86aad62d97cde` |
| `fix/dependency-verification` | [#12](https://github.com/ryuma2317/Next-Gen_LMS/pull/12), targets learning | `513e306742ec50e4434daf2910e3236699bb4e4b` (runtime fix; later evidence/docs commits may follow) |

`main` remains the original `1315aa449acd2174c0e1be8d264f261cd36bc3b2`. Review the stack in order. Earlier source branches are historical increments, not independent production-ready deployments. Current setup requires all migrations through 006 plus the matching Worker.

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

All issues remain open for acceptance review. Local issue bodies are retained in `.github/handoff`; they are now accompanied by verified remote issues. Unimplemented program epics remain recorded in BACKLOG.md and must receive detailed issue criteria before implementation.

## Checkouts and original commit preservation

The root checkout's protected `.git` remains untouched on main. Writable isolated checkouts:

- `tmp/git-handoff`: foundation branch.
- `tmp/attendance-handoff`: attendance branch.
- `tmp/learning-handoff`: learning branch.
- `tmp/verification-handoff`: dependency/runtime verification branch.

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

The fallback `scripts/publish-handoff.ps1` still supports bootstrap/attendance/learning when shell Git and gh access are available. Those branches, issues and draft PRs already exist, so inspect their current heads before using any publishing command. Publish the verification branch through its actual checked-out Git branch or the connector, and never force old local history over a remote branch. No GitHub CLI sign-in or global execution-policy change is needed for the connector path used here.

The latest verification branch is green; older draft PR heads retain their historical missing-lock failures. Review the whole stack and reconcile required checks before any future merge. Nothing has been merged automatically.
