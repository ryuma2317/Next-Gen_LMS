## Source-identified permission gap

The earlier migrations revoked function EXECUTE from PUBLIC only. Supabase/default ACLs can also assign EXECUTE directly to anon/authenticated/service_role; those named grants survive a PUBLIC-only revoke. This could expose server-only intake or attendance RPCs through a browser credential, bypassing Worker-only validation/abuse controls.

## Fix and acceptance criteria

- [x] Forward migration 005 explicitly revokes named/public grants for the application's known function signatures, then restores a narrow role allowlist.
- [x] Only the published-form read is anonymous. Intake/receipt/invitation functions and the expiry-bound attendance recording RPC are service-only. The legacy attendance recording signature stays disabled.
- [x] Unrelated provider functions/default privileges are not globally changed.
- [ ] Run tests after simulating direct default EXECUTE grants to anon/authenticated/service_role before migrations; browser credentials must fail direct server-only RPC calls.
- [ ] Verify actual deployed has_function_privilege results and Supabase advisories before any public intake/check-in.
- [ ] Review future function migrations for explicit named-role revocation, not PUBLIC alone.

Database regression sources cover this scenario but are not executed while dependencies are unavailable. Apply the complete migration set before enabling live features. Existing bootstrap/attendance branches remain unverified and must not be deployed alone as a completed secure system.

Primary reference: [Supabase function-permission advisory](https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable).
