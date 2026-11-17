# Server-held browser sessions

Owner-requested security work is tracked in [#26](https://github.com/ryuma2317/Next-Gen_LMS/issues/26). This replaces the earlier browser Supabase client. Read the issue/PR and IMPLEMENTATION.md for actual test/merge evidence. Source presence does not establish production security.

## What the browser receives

- A random 32-byte session handle in a Secure, HttpOnly, SameSite=Lax, host-only cookie named __Host-lms_session, with Path=/ and no Domain.
- The verified user's ID and a session-bound CSRF value in no-store JSON. That value is readable by JavaScript; it is not a provider token or privileged secret.
- Password/code input and, during explicit setup, the invitation proof or private authenticator QR material. These necessarily pass through the user's browser. Never log, export or commit them.

The browser receives no Supabase access/refresh token, service key, session encryption key or attendance signing key. It creates no Supabase client and stores no login data in localStorage/sessionStorage. Vite custom environment injection is disabled, including accidentally named VITE secrets. API URLs remain visible: authorization comes from server/database checks, never hidden names.

An opaque cookie is still a credential. HttpOnly prevents page JavaScript from reading it; device owners, browser tools, malware or a compromised browser may still access/use the session. XSS can send authenticated same-origin requests without reading cookies. Plain-text rendering, CSP, authorization, patching and operator/device practices still matter.

## Server and database boundary

Apply every migration through 202611120015_web_sessions.sql with the matching client/Worker, not just 015 on an old schema. The private vault stores SHA-256 handle hashes, user IDs, AES-256-GCM encrypted provider credentials and technical lifecycle/lease fields. Fresh random IVs and authenticated additional data bind each envelope to its hash and user ID. The AES key stays in Worker secrets, separate from the database and attendance key. All named roles lose direct table grants; only five service-role-only RPCs manipulate the vault after explicit default-grant revocation. Program data still uses a publishable-key client with the verified caller token and existing RLS/capability/MFA checks. The vault service key is not an application-data shortcut.

Login verifies identity through Supabase Auth, creates a new opaque handle and revokes that browser's old handle. It accepts email/password, never browser-submitted provider tokens or authority fields. Invitation acceptance requires an explicit POST; GET does not redeem it. The URL proof is removed from history before confirmation. Legacy implicit token-fragment links are scrubbed and rejected. Configure the provider email template to deliver the supported token_hash/type=invite link to the approved origin. The actual template/mail flow remains NOT VERIFIED.

Every protected browser request loads an unexpired server session and verifies the provider user. Near-expiry refresh takes a versioned 30-second lease and saves rotating encrypted credentials before any business operation. Competing requests receive a recoverable 409 instead of replaying refresh tokens. Lease IDs and versions fence stale completions; expired/revoked rows cannot be resurrected. Uncertain refresh persistence fails closed and requires sign-in. This favors credential safety over transparent recovery. Actual separate-connection/provider races remain NOT RUN.

Server-side MFA uses the same lease and rotates the CSRF value after verification. Program capabilities still govern access. Other tabs with an old CSRF value must reload. Enrollment refuses an existing TOTP setup, including incomplete setups; no factor-removal or recovery bypass is added. Lost-factor recovery remains an approved platform-owner operation.

Logout revokes the LMS vault record before clearing the cookie, preventing a leased write from reviving it. Provider local sign-out is best effort. LMS-handle revocation works through a provider outage, but full provider revocation needs live acceptance. Independently obtained Bearer credentials retain provider lifecycle; logout does not claim instant invalidation of every JWT/device.

## Origin, CSRF and abuse protection

Cookie writes require the exact configured HTTPS origin in both request URL and Origin, JSON, X-LMS-Request: 1 and session-bound X-LMS-CSRF. Login/invitations use origin/JSON/custom-header protection before a session exists. Cross-site Fetch Metadata is rejected for cookie access. Forwarding headers cannot establish application origin; no permissive CORS is introduced. Cookie/Bearer ambiguity is rejected. API-client Bearer access remains available for integrations/Apidog; the LMS browser never receives/sends that credential.

AUTH_LIMITER currently bounds login/invitation/account action/IP groups to 20 requests per minute. Verify trusted Cloudflare ingress, provider protections and shared-campus behavior in the pilot. A spoofable local header is not a deployed limiter test. APIs are no-store. Never log headers, cookies, passwords, proofs, codes, QR data or envelopes. Observability remains disabled in wrangler.jsonc; before enabling logs, redact auth URL queries and bodies at all proxy/provider/Worker layers. Never upload real-user auth traces or test artifacts to public CI/issues.

Static CSP permits same-origin scripts/connections, blocks plugins/embedding/base changes, and permits current inline styles and local data/blob images. Test actual deployed headers, cameras/QR, accessibility and devices before launch. Development HMR does not prove production CSP behavior.

## Operator setup and recovery

No service is purchased or deployed here. Use an isolated synthetic pilot:

1. Apply all migrations through 015; check real default ACLs, private-schema exposure, RPC grants and provider advisories.
2. Set server SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and exact HTTPS PUBLIC_APP_ORIGIN without a trailing slash. Configure matching provider URLs/templates. Never put credentials in VITE/browser configuration.
3. Generate a separate cryptographically random 32-byte base64url SESSION_ENCRYPTION_KEY in an approved secret manager. Keep it out of Git, screenshots and output. Changing it invalidates older encrypted sessions: coordinate sign-out/relogin. Backing up/restoring the key and encrypted vault needs controlled school recovery procedures.
4. Explicitly choose SESSION_IDLE_SECONDS and SESSION_ABSOLUTE_SECONDS. Technical bounds: 300 <= idle <= absolute <= 604800. No program timeout policy is guessed. Idle measures accepted API traffic, including background polling; absolute expiry never extends. Pilot a 90-minute lesson, exam autosave, invitation/password setup and shared devices. Missing/invalid settings keep live sign-in disabled. HTTP local development supports synthetic previews; use approved HTTPS for auth tests, with no insecure-cookie fallback.
5. Bind AUTH_LIMITER and verify edge/provider abuse controls. New logins perform bounded cleanup of already-expired credential rows, never program records. Provide operational cleanup even outside login periods. This adds no student-record retention period.
6. Verify real REST/RPC/table boundaries, password/invitation/MFA/refresh/logout, two tabs/separate connections, stale-CSRF recovery, cookie attributes, forced expiry, outages, key rotation and device/CSP/camera behavior. Record evidence in SECURITY_TEST_PLAN.md; these remain NOT RUN here.

Publication guards check tracked paths and bounded credential patterns without printing values. The client-build guard plus synthetic server/VITE sentinels detect accidental bundle inclusion. They are regression defenses, not a complete secret scanner, history/dependency audit or guarantee of detecting arbitrary private data. Review every staged file. If a real secret is published, revoke/rotate first and follow the README incident process, including history/artifacts; deleting the latest value is insufficient.
