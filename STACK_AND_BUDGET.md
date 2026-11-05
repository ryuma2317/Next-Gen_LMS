# Next-Gen Engagement — Technology and Sponsor Budget

Updated: 2026-11-05 (provider prices checked 2026-11-04)
Status: Revised recommendation following the owner's funding constraint. No services have been purchased or deployed.

## 1. Funding constraint

Confirmed by owner: the school allocates no project funding; the program depends on sponsors the team finds. Low recurring cost and affordable annual handover are design requirements. The spending ceiling is still unknown.

This recommendation supersedes the earlier Next.js/Vercel Pro baseline and the $80–150 monthly reserve. The user workflows and requested features remain in scope; this changes infrastructure and development choices, not the program's requirements.

## 2. Recommended stack

| Component | Choice | Purpose |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Responsive role-specific screens using familiar React patterns. |
| Styling/components | Tailwind CSS + shadcn/ui | Reusable forms, tables, dialogs, navigation and accessible UI foundations. |
| Backend API | Hono + TypeScript on Cloudflare Workers | Central authentication/permission checks and application workflows. |
| Database | PostgreSQL through Supabase | Relational data, constraints, transactions, historical reporting. |
| Data access | Supabase client, generated types, SQL migrations and narrow transactional database functions | Atomic selection, attendance updates, room quotas, ballot acceptance and award validation. |
| Participant authentication | Supabase Auth | Accepted participant identities, invitation/account recovery, school/personal email. Exact login provider remains open. |
| Guest jury access | Application-issued, named, limited invitations/sessions | No registration; scope by round/team, expiration and conflict checks. |
| Files | Private Supabase Storage | Documents and submissions with authorized access. |
| Live updates | Supabase Realtime only for active views that need it | Selection availability and boards where useful; committed database state stays authoritative. |
| Hosting | Cloudflare Workers serving the Vite static frontend and /api routes | One application deployment; no dedicated always-running app VM. |
| Email | Approved school email service if available; otherwise Resend as a candidate | Supabase Auth SMTP plus HTTP API for application notifications. Never assume a free-tier daily quota fits enrollment bursts. |
| Jobs | PostgreSQL outbox plus a scheduled Worker when required | Bounded batches for notifications and other retriable work. |
| Verification | TypeScript checks, focused unit/integration tests and Playwright | Core user flows, permissions and concurrent-write correctness. |
| Repository | Git with automated checks within included usage | Review and handover; no mandatory paid project-management SaaS. |

Architecture: one repository and one application deployment with feature modules, backed by managed data services. The frontend and API can share one origin. Keep the API independent of the UI so business rules do not end up enforced only in React.

An authenticated program portal can use a Vite client frontend without requiring Next.js server rendering. A small static public program page is sufficient for the presently described public information. This is a fit recommendation, not a claim that Next.js cannot be inexpensive. There is no existing application to migrate, so the change is currently a planning update.

Cloudflare documents [React + Vite deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/), and Hono documents [Workers support](https://hono.dev/docs/getting-started/cloudflare-workers). This avoids requiring a Next.js runtime adapter. Validate the chosen packages against the Workers runtime early, especially certificate/PDF generation and any native/Node-specific dependencies.

Use supported stable versions and a lockfile when implementation starts. Exact dependency versions, routing/form helper libraries and certificate tooling will be selected during implementation rather than expanding the paid service list now.

## 3. Cost model

USD starting prices checked on 2026-11-04. Published base prices are facts; the operating envelope and ancillary allowances are estimates. Recheck before launch.

| Item | Monthly amount | Basis |
| --- | ---: | --- |
| Supabase Pro, one production project at included starting compute | From $25 | Published starting plan price; usage/compute/add-ons can increase it. |
| Cloudflare Workers Paid | From $5 | Published minimum; dynamic requests/CPU and optional services can add usage charges. |
| Email | $0–20 initially | School provision if approved, or free/paid provider according to volume. Resend currently lists free 3,000/month with 100/day; Pro starts at $20/month. |
| Independent file-backup storage / small operational allowance | $0–5 estimated | Depends on data size and any donated school storage. Not a purchased or guaranteed backup service. |
| Initial operating envelope | **Approximately $30–55/month** | Assumes modest document traffic, included compute limits and no paid extra environment or add-ons. |
| Twelve months at this envelope | **Approximately $360–660/year** | Excludes the items below and excess usage. |

Sources: [Supabase pricing](https://supabase.com/pricing), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Resend pricing](https://resend.com/pricing).

Suggested fundraising target: **around $700 for one year of basic infrastructure**, subject to actual volumes, quotes and what the school can provide. This is a planning target, not an approved budget or a guarantee that every configuration fits. Domain registration, tax, paid developer/AI tools, development/maintenance labor, large backups/video delivery, optional extra services and unexpected overages are excluded. A school subdomain or sponsor-provided hosting/email/storage could reduce cash expenditure, but no such contribution is confirmed.

The paid database is the largest base item. Retain it in the managed-production recommendation because the team rotates and needs maintained infrastructure. A free prototype is not evidence that a large synchronized enrollment or vote burst is production-ready; test the actual workflows at launch scale.

## 4. Development, pilot and production

| Stage | Proposed spending approach |
| --- | --- |
| Discovery and local build | $0 mandatory cloud subscriptions; use local tools and synthetic test data. Existing developer hardware/internet costs are outside this estimate. |
| Shared prototype | Use eligible free tiers within their limits. Budget can remain near $0; upgrade only if a demonstrated need appears. |
| Pilot | Exercise realistic concurrency, invitations and file flows. Confirm recovery and network integration; pay for the production-sized setup when required for representative testing. |
| Production | Plan around the $30 base plus email/backup needs; reserve up to the $55 initial envelope before treating it as sustainable. |

Avoid an always-on paid staging database by default. Use a local Supabase environment and/or an isolated free test project with fake data where provider limits permit. Never point preview/development builds at the live student database to save money. If paid staging becomes necessary, price it explicitly; it is outside the baseline.

Supabase's free tier currently has smaller storage and may pause after one week of inactivity. It can support experiments but cannot be assumed to provide uninterrupted year-round alumni access. Do not use artificial keepalive traffic as the operating plan. [Supabase pricing](https://supabase.com/pricing)

## 5. Keeping the bill small

- Use one shared application and database with scoped access for all roles and editions; avoid one subscription/project per role, class or year.
- Ask whether CADT can provide a subdomain, approved email sending or backup storage even though it provides no cash budget. A server/VM is another possible contribution, not assumed available.
- Serve frontend static assets through the hosting platform and route only actual API requests to dynamic code. Cloudflare's pricing page documents free/unlimited static asset requests; dynamic work is metered separately.
- Prefer in-app announcements; send email for necessary invitations, recovery and selected reminders. Plan recruitment-day bursts: 300 invitations cannot all fit a 100-email/day free quota, before other messages.
- Choose a paid email month or school service if immediate invitation volume requires it; do not delay time-critical messages just to stay free. Returning to a smaller email plan later is a deliberate decision if usage permits.
- Keep PDFs/slides and submission files size-limited, with limits agreed before implementation. Store file bytes outside PostgreSQL.
- Link approved externally hosted videos if needed rather than including a video-processing service by default.
- Limit realtime subscriptions to visible, relevant classes/teams and unsubscribe on exit. Generate six-second attendance challenges without per-student recurring writes.
- Use database constraints/transactions for correctness rather than purchasing a separate coordination/cache service prematurely.
- Do not add paid AI features, SMS, analytics subscriptions, Redis, a separate search service, Kubernetes or microservices without a real requirement and cost review.
- Keep dependency and deployment documentation simple enough for juniors and teachers to maintain annually.

Set provider usage alerts and available controls before launch. Budget alerts do not universally stop charges. Choose sensible Worker CPU limits, upload limits, authentication/rate controls and bounded batch work, then verify peak enrollment, attendance and voting loads. Do not apply one blanket per-IP vote limit to a shared campus network.

## 6. Backups, continuity and school-hosting alternative

Do not remove backups to reach a price target. Supabase database backups do not include Storage file objects; independently back up required files and test recovery. The $0–5 backup allowance is a placeholder to validate against actual storage/retention and school resources. Higher recovery guarantees cost more and need separate approval. [Supabase backups](https://supabase.com/docs/guides/platform/backups)

If the school or a sponsor offers a reliable managed server, assess it before buying duplicate hosting. A donated VM can reduce invoices but requires someone responsible for patching, monitoring, backups, restoration and availability. Do not promise that self-hosting the complete application/auth/database is effortless or free of operating work. Compare it only when the resource and responsible maintainer are identified.

If alumni access, application forms and certificate lookup stay available year-round, fixed hosting charges also continue year-round. The five-week teaching period is not the whole hosting period. Do not silently pause production between events. A seasonal shutdown/archive model would change user access and needs a separate owner decision.

No sponsorship credits, nonprofit eligibility or education discounts are assumed in the budget. Investigate them when the relevant organization/account details are available.

## 7. Decisions and handover

- Confirmed constraint: sponsor-funded, no school-allocated project funds, keep recurring expenses low.
- Current recommended stack: React/TypeScript/Vite + Hono/Workers + managed PostgreSQL/Supabase.
- Current estimate: $30–55/month under stated assumptions; no recurring purchase authorized by this planning document.
- Asked in chat: can CADT provide a subdomain, email service, or server/VM?
- Still open: actual sponsor ceiling, billing owner, provider accounts, storage/email volumes, archive retention and infrastructure donations.
- Before any paid deployment: present the exact configuration and expected bill. Use actual usage measurements from the pilot to revise the estimate.

This file is the current stack/budget reference. Older larger estimates are superseded, not additional spending requirements.

## 8. Security resources and implementation gates

See [SECURITY.md](SECURITY.md), [SECURITY_TEST_PLAN.md](SECURITY_TEST_PLAN.md) and the [README operational handover](README.md). The chosen architecture must implement scoped authorization, RLS, atomic database operations, private files, bounded resource usage and secret isolation; these are not optional extras to remove for a cheaper launch.

The current estimate does not promise enterprise security subscriptions, a malware-scanning service, premium WAF features, continuous external penetration testing or point-in-time recovery. Verify current provider capabilities and actual needs before selecting any such add-on. File scanning/quarantine operations, backup storage and stronger recovery guarantees need a concrete implementation and cost check; use a reviewed restricted-upload policy where appropriate instead of pretending a scanner exists. No additional service was purchased or configured by writing these requirements.

Allow development and teacher-review time for security tests, provider setup, incident rehearsal and handover. The operating estimate excludes that labor. Scope or phase the launch if resources are insufficient for required controls; do not expose an unsafe feature to real applicants merely to meet the estimate.
