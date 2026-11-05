## Outcome

Establish a React/TypeScript, Hono/Workers and Supabase foundation for the annual Next-Gen program.

## Acceptance criteria

- [ ] Responsive preview, role navigation, subject selection and timetable pass desktop/mobile and keyboard checks.
- [ ] Verified-session API and caller-context RLS deny unauthenticated, cross-user and cross-edition access.
- [ ] Subject limits, eligibility, duplicate protection and capacity hold under separate-connection race tests.
- [x] Dependency-free attendance and audience-award rules pass locally.
- [ ] Generate and review a real dependency lockfile; pass type check, build, API/PostgreSQL and browser tests.
- [x] Record requirements, security controls, test scenarios and operational handover.

## Verification

The current combined increment passes 9 dependency-free domain/validation tests; 18 TypeScript/TSX files parse. Full build/integration/browser verification is blocked by npm network restrictions in the execution environment. No deployment or production-readiness claim. Keep this issue open until acceptance evidence is complete.
