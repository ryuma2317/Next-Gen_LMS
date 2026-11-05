[CmdletBinding()]
param([ValidateSet('bootstrap','attendance','learning')][string]$Feature = 'bootstrap')
$ErrorActionPreference = 'Stop'
$repository = 'ryuma2317/Next-Gen_LMS'
$branch = switch ($Feature) { 'learning' { 'feat/learning-assignments' } 'attendance' { 'feat/attendance-sessions' } default { 'feat/lms-platform-admissions' } }
$baseBranch = switch ($Feature) { 'learning' { 'feat/attendance-sessions' } 'attendance' { 'feat/lms-platform-admissions' } default { 'main' } }
$checkoutName = switch ($Feature) { 'learning' { 'learning-handoff' } 'attendance' { 'attendance-handoff' } default { 'git-handoff' } }
$projectRoot = Split-Path -Parent $PSScriptRoot
$handoff = Join-Path $projectRoot "tmp\$checkoutName"
if (Test-Path -LiteralPath (Join-Path $projectRoot '.git')) {
    $currentBranch = & git -C $projectRoot branch --show-current
    if ($LASTEXITCODE -eq 0 -and $currentBranch -eq $branch) { $handoff = $projectRoot }
}
if (-not (Test-Path -LiteralPath (Join-Path $handoff '.git'))) { throw 'Prepared Git checkout not found. Run from the original project or the prepared checkout.' }
$actualBranch = & git -C $handoff branch --show-current
if ($LASTEXITCODE -ne 0 -or $actualBranch -ne $branch) { throw 'Unexpected checkout branch. Nothing was pushed.' }
$remote = & git -C $handoff remote get-url origin
if ($LASTEXITCODE -ne 0 -or $remote -ne "https://github.com/$repository.git") { throw 'Unexpected origin. Nothing was pushed.' }
$dirty = & git -C $handoff status --porcelain
if ($LASTEXITCODE -ne 0 -or $dirty) { throw 'Prepared checkout has uncommitted changes. Review and commit them before publishing.' }
& gh auth status --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'Sign in with gh auth login in this normal PowerShell window first.' }
if ($Feature -ne 'bootstrap') {
    $baseCommit = & git -C $handoff rev-parse --verify "refs/remotes/origin/$baseBranch"
    if ($LASTEXITCODE -ne 0) { throw 'Prepared bootstrap base ref missing. Inspect the branch stack before publishing.' }
    & git -C $handoff push origin "${baseCommit}:refs/heads/$baseBranch"
    if ($LASTEXITCODE -ne 0) { throw 'Base push failed. Inspect remote changes; no force push was attempted.' }
}
& git -C $handoff push --set-upstream origin $branch
if ($LASTEXITCODE -ne 0) { throw 'Push failed. No force push or merge was attempted.' }

function Get-OrCreateIssue {
    param([string]$Title, [string]$BodyFile)
    $query = '"' + $Title + '" in:title'
    $raw = & gh issue list --repo $repository --state all --search $query --limit 100 --json number,title
    if ($LASTEXITCODE -ne 0) { throw 'Could not check existing issues.' }
    $existing = @($raw | ConvertFrom-Json | Where-Object { $_.title -eq $Title })
    if ($existing.Count -gt 0) { return $existing[0].number }
    $createdUrl = & gh issue create --repo $repository --title $Title --body-file $BodyFile
    if ($LASTEXITCODE -ne 0) { throw "Could not create issue: $Title" }
    if ($createdUrl -notmatch '/issues/(\d+)$') { throw 'Unexpected issue URL; inspect GitHub before retrying.' }
    return [int]$Matches[1]
}
$bodyRoot = Join-Path $handoff '.github\handoff'
$foundation = Get-OrCreateIssue 'Foundation: role workspaces, protected API and atomic subject selection' (Join-Path $bodyRoot 'foundation.md')
$admissions = Get-OrCreateIssue 'Admissions: versioned forms, review and verified activation' (Join-Path $bodyRoot 'admissions.md')
$verification = Get-OrCreateIssue 'Blocker: dependency installation and complete build verification' (Join-Path $bodyRoot 'verification.md')
$attendanceIssue = $null
$revisionIssue = $null
if ($Feature -eq 'attendance') {
    $attendanceIssue = Get-OrCreateIssue 'Attendance: rotating check-in, rosters, leave and provisional eligibility' (Join-Path $bodyRoot 'attendance.md')
    $revisionIssue = Get-OrCreateIssue 'Bug: reject NULL revisions in direct review RPC calls' (Join-Path $bodyRoot 'review-null-version.md')
}
$learningIssue = $null
$timingIssue = $null
$grantIssue = $null
if ($Feature -eq 'learning') {
    $learningIssue = Get-OrCreateIssue 'Learning: lessons, assignments, submissions and released grading' (Join-Path $bodyRoot 'learning.md')
    $timingIssue = Get-OrCreateIssue 'Bug: enforce attendance expiry after database lock waits' (Join-Path $bodyRoot 'time-guards.md')
    $grantIssue = Get-OrCreateIssue 'Security: revoke named default grants on server-only RPCs' (Join-Path $bodyRoot 'function-grants.md')
}
$prRaw = & gh pr list --repo $repository --head $branch --base $baseBranch --state open --json url
if ($LASTEXITCODE -ne 0) { throw 'Could not check existing pull requests.' }
$existingPr = @($prRaw | ConvertFrom-Json)
if ($existingPr.Count -gt 0) { Write-Output $existingPr[0].url; exit 0 }
$body = @(
    'Initial LMS foundation and admissions sources for the annual Next-Gen program.',
    '',
    "References #$foundation, #$admissions and #$verification. These issues remain open until their acceptance criteria pass.",
    '',
    'Includes responsive synthetic previews, protected Hono API, Supabase RLS/transaction migrations, versioned applications, scoped MFA-required reviews, verified activation and disabled-by-default invitation jobs.',
    '',
    'Validation: 9 dependency-free tests pass; 18 TypeScript/TSX files parse; staged diff whitespace checks pass. Full type check/build, API/database/browser tests and provider integration remain unverified because dependencies could not be installed. No real data, email delivery or deployment was performed.',
    '',
    'Keep draft. Review the generated lockfile after installation, fix failing checks and satisfy the linked acceptance criteria before merge. This PR does not complete the entire LMS.'
) -join [Environment]::NewLine
$prTitle = 'Bootstrap LMS foundation and admissions workflows'
if ($Feature -eq 'attendance') {
    $prTitle = 'Add session attendance, rotating QR and leave review'
    $body = @(
        'Add dated theory/lab attendance, scoped rosters, rotating QR/manual codes, private leave review and provisional attendance totals.',
        '',
        "References #$attendanceIssue, #$revisionIssue and #$verification. Keep issues open until their acceptance criteria pass.",
        '',
        'Stacked on feat/lms-platform-admissions. Publish the bootstrap PR first with the default script invocation; do not merge this feature into main ahead of its base.',
        '',
        'Codes rotate every six seconds with at most twelve-second validity. Verified expected participants can check in only during the first fifteen minutes and before session end. Leave approval requires explicit permission and MFA; revision checks, corrections and finalization are audited.',
        '',
        'Evidence: 14 dependency-free tests pass; 26 TypeScript/TSX files parse. Full type check/build, API/database/browser/camera and multi-connection tests remain unverified because package installation is blocked. Keep draft. No real data/deployment; attendance passing alone is not certificate eligibility.'
    ) -join [Environment]::NewLine
}
if ($Feature -eq 'learning') {
    $prTitle = 'Add class lessons, configured assignments and released grading'
    $body = @(
        'Add scoped lesson drafts/publication, assignment policy configuration, immutable submitted versions and separately released grading.',
        '',
        "References #$learningIssue, #$timingIssue, #$grantIssue and #$verification. Keep issues open until acceptance criteria pass.",
        '',
        'Stacked on feat/attendance-sessions. Publish the bootstrap and attendance PRs first using their respective script options. This PR does not complete the LMS.',
        '',
        'Editing and grading require explicit section capabilities plus MFA; no permissions are granted automatically. Account settings support initial authenticator enrollment with local QR rendering and explicit verification; provider/recovery checks remain pending. Published rules stay fixed. Learners see only their own submissions and last released score/feedback, with draft revisions kept private.',
        '',
        'A forward migration also enforces verified attendance-code expiry at the database write after row-lock waits, and uses wall-clock receipt times for assignment deadlines. Deploy the matching Worker/migration together; old attendance recording fails closed.',
        'Apply all migrations through 005: its explicit function ACL allowlist removes named default-role grants that a PUBLIC-only revoke cannot remove. Provider-style defaults are simulated in the pending database regression tests.',
        '',
        'Evidence: 21 dependency-free tests pass; 33 TypeScript/TSX files parse. Full type check/build, API/PostgreSQL/browser/device and multi-connection tests remain unverified because installation is blocked. No deployment or real records. Keep draft.'
    ) -join [Environment]::NewLine
}
$temporaryDirectory = Join-Path $handoff 'tmp'
[System.IO.Directory]::CreateDirectory($temporaryDirectory) | Out-Null
$bodyFile = Join-Path $temporaryDirectory 'handoff-pr-body.md'
[System.IO.File]::WriteAllText($bodyFile,$body,[System.Text.UTF8Encoding]::new($false))
& gh pr create --repo $repository --base $baseBranch --head $branch --draft --title $prTitle --body-file $bodyFile
if ($LASTEXITCODE -ne 0) { throw 'Draft PR creation failed. The branch and any created issues remain available; rerunning reuses them.' }
Write-Output 'Published feature branch, issues and draft PR. Main was not merged or deployed.'
