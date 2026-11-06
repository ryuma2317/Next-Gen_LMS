# API guide for the Next-Gen LMS

An API is how the website asks the server to do work. For example, a trainee clicks **Join class**, the website sends a request, and the server checks eligibility and available seats before saving anything. API documentation explains which requests exist, what information to send and what the reply means. Your juniors will need it when changing the website, debugging errors or adding features.

**OpenAPI** is a standard file format for that documentation. **Apidog** is an optional app that can display the file, organize requests and help test them. The LMS runs without Apidog. This increment adds no paid service, deployment or package dependency.

## Your first request

Use Node 22.12+ in a development checkout with npm registry access. In Windows PowerShell:

~~~powershell
npm.cmd ci
npm.cmd run dev
~~~

Open http://127.0.0.1:5173/api/health in your browser. This is a public read-only request: GET /api/health. Expected HTTP status: 200. Expected JSON:

~~~json
{"status":"ok","version":"0.4.0"}
~~~

GET reads information; POST asks the server to perform an action. The path identifies the resource. JSON is the structured data in a request or reply. HTTP status tells you the outcome. A successful health response means the HTTP server answers; cloud accounts, migrations and participant workflows still need configuration and verification.

## Import into Apidog

1. Open an Apidog project you use for LMS development. Choose its OpenAPI/Swagger import option and select **public/openapi.json** from this checkout. Review the preview before applying it to an existing project.
2. Use the local server address **http://127.0.0.1:5173**. Start with the public health GET above. There is no production address in this file.
3. For authenticated tests, use an approved isolated Supabase development project and synthetic accounts. Obtain a user session through the implemented sign-in/MFA flow. Set Bearer authentication in a private local environment. Never put a secret/service-role key into the Bearer token field.

Apidog supports JSON file import for OpenAPI 3.0 and 3.1: [official import guide](https://docs.apidog.com/import-openapi-spec-635046m0). Our file uses OpenAPI 3.1.0 and includes requests, responses, errors and security requirements.

**Actual status:** the import artifact is generated and checked in the repository. Direct import into your Apidog workspace has **not been performed**: desktop automation failed to initialize. No Apidog login, project, environment or account setting was changed. Compatibility inside your installed version remains to be verified. You do not need to share credentials to use the file.

## Access and secrets

The four public operations are health, published recruitment form, application submission and receipt lookup. Receipt lookup has no sign-in requirement but needs its private proof in the JSON body. Keep that proof out of URLs and shared examples.

All other operations use a Supabase **user access token** in the Authorization header. The API validates the session with Auth. Active membership, enrollment/assignment, capability, workflow state and sometimes MFA (aal2) are checked separately. Read each operation's access description: owner/trainer/reviewer paths can have different MFA requirements. Sign-in and MFA use the provider SDK; this file does not invent LMS password/token endpoints.

Keep real tokens, passwords, MFA secrets/codes, applicant answers and grades out of Git, screenshots, shared Apidog environments, public mock servers and exported collections. Use synthetic data. Examples contain no working credentials or receipt proofs. The public OpenAPI file is interface metadata, not database access.

## Rules for clients

| Topic | Current behavior |
| --- | --- |
| IDs | UUID strings. Preview IDs such as demo-web do not identify live rows. |
| Bodies | Send application/json. Global limit: 32768 bytes; quiz definitions also have a 26000-byte bound. Relevant exact fields, length/byte/control-character limits apply. |
| Revisions | Use the current positive version for transitions/updates. Draft version 0 creates a new draft. NULL/stale input cannot overwrite state. Attendance corrections use the participant record revision; grade release uses the grade revision. |
| Retries | Retain request UUID and identical payload for supported idempotent retries. Applications also retain the same private receipt token. Not every POST is retry-safe. |
| 409 | May mean stale state, permission/MFA, closed window, workflow, capacity or another business rule. Preserve unsaved work, reload permitted state and resolve the cause; do not blindly repeat writes. |
| Times | Use ISO timestamps with UTC/offset. Attendance challenge times are epoch **milliseconds**. Display times in the appropriate local timezone. |
| Scores | Integer hundredths: 100 score units = 1 point. Attendance uses a separate quarter-unit ledger. Unreleased scores/feedback may be null. |
| Paging | Work returns at most 50 rows; quiz report at most 100, as bare arrays. offset defaults to 0, maximum 10000, text of 1–5 decimal digits. Increment by page size; stop on a shorter page. No total-count envelope. Other list limits are documented; not all lists are pageable. |
| Reads | Scope can return an empty array without disclosing other participants/classes. Some private quiz reads return 403. |
| Errors | JSON with an error string. No invented numeric application error code. Unknown routes return 404, but authentication/configuration may reject the request first. |
| Rate limits | Admissions POSTs share the configured IP limiter; attendance check-in uses a verified-user limiter. 429 includes Retry-After: 60. Not every endpoint has a limiter. |
| Caching | API replies use Cache-Control: no-store. Static OpenAPI is public metadata. |

Supported resource links are bounded HTTPS URLs without embedded credentials; the server does not fetch the target. Schemas describe structure. Cross-field rules, byte limits, stored data, scope, deadlines and transactions remain server/database responsibilities.

## Scope and verification

The contract covers account memberships, editions/classes, seat claims, recruitment/review/activation, attendance/leave/corrections, lesson/assignment publication, individual text/link work, separately released grading, exams/advisory signals, games and permitted quiz reports.

Exam/game grading runs in database paths. Learner questions exclude keys; teacher-only definitions include them. Fullscreen/visibility signals are client-controlled advisory events, not proof of cheating or device lockdown. They trigger no automatic penalty. See QUIZZES.md.

Projects, rooms, guest jury, voting, awards, certificates and complete administration remain unfinished. Planned endpoints are not presented as working operations. This file covers LMS HTTP, not every provider SDK endpoint, direct RPC or scheduled invitation job.

## Maintain the contract

Edit **api/operations.mjs** for operations/access/responses, **api/schemas.mjs** for HTTP payloads, and **api/openapi.mjs** for assembly. Do not hand-edit the generated JSON.

~~~powershell
npm.cmd run docs:api
npm.cmd run check:api
npm.cmd run test:domain
npm.cmd run check
npm.cmd test
~~~

Commit sources, public/openapi.json and affected tests together. npm run check and native domain tests reject stale JSON. Coverage tests compare registered Hono routes and concrete action/resource variants; adapt the checks if the routing style changes.

Tests resolve references, check security/path metadata, assert representative HTTP replies and validate actual quiz RPC results in PGlite. The fixture matcher supports the JSON Schema subset used here; it is **not a full independent OpenAPI conformance validator**. Mock responses do not prove database security.

Real Supabase/PostgREST/Auth/MFA, network recovery, device/fullscreen/camera behavior, separate-connection contention, load and full security acceptance remain separate checks. Appearing in Apidog does not establish production readiness. Record the actual environment, roles, result and remaining limitations.
