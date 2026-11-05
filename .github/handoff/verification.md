## Blocker

The current execution session cannot install npm dependencies (EACCES) or write the original repository's protected Git metadata; earlier shell pushes could not reach GitHub over port 443. Isolated local checkouts preserve the commits. The GitHub connector recovered on 2026-11-05 and successfully created this issue; branch/PR publication is tracked separately in GIT_HANDOFF.md. These are environment/integration blockers, not proof of incorrect repository selection or confirmed application bugs.

## Acceptance criteria

- [ ] Registry/network access is available in the execution environment.
- [ ] Resolve/review dependency compatibility and advisories; commit the real generated lockfile.
- [ ] Type checking, full tests and production build pass; fix any confirmed defects.
- [ ] Desktop/mobile, keyboard and real Supabase integration checks have evidence.
- [ ] CI executes and requires npm ci with a reviewed lockfile.
- [ ] GitHub issues, feature branch and draft PR are created, linked and verified.

The CI application job deliberately fails while package-lock.json is absent. Latest learning increment: 21 dependency-free tests and 33 TypeScript/TSX syntax parses passed locally. API/database/browser/build verification remains unrun. Do not mark blocked checks as passed or claim the LMS is complete.
