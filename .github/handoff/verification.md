## Blocker

The current execution session cannot install npm dependencies (EACCES), write the original repository's protected Git metadata, or reach GitHub over port 443. The GitHub connector initially rejected writes with 403 and subsequently returned Unknown tool, including for reads. These are environment/integration blockers, not proof of incorrect repository selection or confirmed application bugs.

## Acceptance criteria

- [ ] Registry/network access is available in the execution environment.
- [ ] Resolve/review dependency compatibility and advisories; commit the real generated lockfile.
- [ ] Type checking, full tests and production build pass; fix any confirmed defects.
- [ ] Desktop/mobile, keyboard and real Supabase integration checks have evidence.
- [ ] CI executes and requires npm ci with a reviewed lockfile.
- [ ] GitHub issues, feature branch and draft PR are created, linked and verified.

The CI application job deliberately fails while package-lock.json is absent. Nine dependency-free tests and syntax parsing passed locally. Do not mark blocked checks as passed or claim the LMS is complete.
