# Project boards and assigned access

Issue #21 implements the initial private project workspace. It does not complete self-service team formation, rooms, showcase, certificates or the full LMS.

## Implemented source

- Project titles/themes, 2–8 configured board columns and separately configured participant/mentor/advisor capacities. No yearly team size is assumed.
- Project membership is independent of section trainers and course enrollments. Each assignment explicitly controls task editing, comments and sprint planning; new permissions start false.
- Assigned members can read their project. Explicit edition manage_projects plus MFA grants scoped oversight/setup; a role label alone grants nothing.
- Plain-text tasks, configured column movement, participant assignment, optional sprint assignment, optimistic revisions and immutable version snapshots.
- Plain-text append-only comments, stable UUID retries and recent discussion/history reads.
- Planned/active/closed sprints, one active sprint per project and explicit reasoned transitions. Closing does not automatically move unfinished tasks.
- Project/task archive preserves history and makes work read-only. Archived projects still permit authorized membership revocation with active and all permissions false. Reopening is not implemented.

The UI uses column selectors that work with keyboard and touch. It retains task drafts during refresh/conflicts; loading the latest saved task is explicit. The live API/database remain authoritative. Synthetic previews do not prove live authorization or race handling.

## Database/API boundaries

Apply every migration through **202611060014_project_configuration_validation.sql** in the approved isolated environment. Migration 013 adds RLS-protected project tables with no browser/service direct table grants and narrowly exposed caller-checked RPCs. It explicitly revokes PUBLIC, anon, authenticated and service_role function grants before restoring intended authenticated RPC access. Forward migration 014 corrects a JSON alias ambiguity discovered in CI; do not stop at 013.

Mutations lock the project before task/sprint/member changes, serializing capacity, membership revocation, archive, column configuration and work updates. Version checks reject NULL/stale inputs. UUID create retries require the same initial stored fields; comments also match task/author/body. Actors are derived from Auth. Foreign project/edition assignments are denied.

An assignee must be an active participant of that project when newly assigned. An old inactive assignee or closed sprint can remain on historical work without enabling a new assignment. Edition suspension revokes project access even if a project assignment remains active. School operators must review explicit assignments when participation changes.

Read limits: 100 projects per edition, 50 tasks/candidates per page, 100 sprint plans, up to 1000 historical membership rows. Each project supports up to 10000 tasks and 100 assigned people per role. These are technical bounds, not yearly program defaults. The UI paginates tasks and candidates. Project creation/sprint creation enforce their list bounds; callers cannot silently create inaccessible later rows. Discussion returns the latest 100 comments and 50 change entries; earlier stored history is retained, not deleted.

No attachments, rich HTML, public project directory, realtime subscription or notification delivery is introduced. Project file uploads and activity exports need their own security/retention design. Authenticated abuse/load limits, monitoring and recovery still require live operational verification.

## Operator setup and unresolved policy

No account receives manage_projects automatically. Use the approved teacher/platform-owner bootstrap process to grant that capability to an active edition member; verify MFA and then refresh Projects. There is no browser endpoint to grant platform/edition capabilities. Do not give all volunteers this permission for convenience.

The owner has not yet approved the complete role matrix, self-service friend grouping, moves/finalization, department composition or mentor/advisor differences. This increment therefore supports explicit staff assignments, not automatic formation or final team approval. Assign participants only under the organizer-approved policy. Capacity is per project role; it does not prove department quotas or finalized composition.

Teaching-team formation, room quotas, guest-jury identity/conflicts and certificate criteria remain separate. Project mentor/advisor assignments provide a future source for conflict checks; jury implementation must match named guest jurors to the actual people, not just trust a new guest record.

Before use: approve and record project permissions, configure capacities/columns, assign named operators and synthetic pilot accounts, apply the complete migration set, then test direct Supabase/PostgREST/Auth/MFA, separate-connection contention, revocation, recovery, keyboard/mobile behavior and expected load. No real participant record or deployment was created here.
