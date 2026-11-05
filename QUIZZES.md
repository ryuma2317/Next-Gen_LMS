# Exam and live-game quizzes

Owner request: two varieties, an exam-style quiz with fullscreen/tab-exit reporting and a Kahoot-style game. Teachers create questions, specify correct answers and receive automatic grading/results. Tracking: [issue #16](https://github.com/ryuma2317/Next-Gen_LMS/issues/16), branch feat/quiz-modes from dev.

This is a new source increment, pending its own CI/live verification. The entire LMS remains unfinished. No new subscription, service purchase, deployment or real assessment data is involved.

## Shared behavior

Assigned trainers need the existing explicit section edit_learning capability plus MFA to author/publish/host; Only grade_work plus MFA can read private reports; authoring/hosting alone does not grant private grade or monitoring access. Class enrollment and active trainee membership are required for participation. People with editing/grading privileges in that class cannot take its scored quizzes; synthetic preview remains available. Role labels alone grant nothing. The school still needs to approve and provision real permissions.

Drafts may retain unresolved settings. Publication requires explicit settings and complete questions/keys. Published questions/configuration cannot be edited silently. Closing and releasing scores require the current version and a reason; audits contain action/reason, not answers or monitoring screenshots. All direct participant table access is denied; projected RPC responses enforce scope and withhold answer keys.

The initial question formats are single choice and multiple choice, with teacher-selected points. Exact-set grading is shown in the editor: all correct options and no extra options earn full question credit; other selections earn zero, with no negative marks or implicit partial credit. Open-text/manual grading, uploads, coding tasks, question banks, randomization, accommodations administration and weighted certificate rules remain separate work.

Implementation bounds are 15 questions per quiz, 2–6 options per question, 1–100 points per question and a bounded definition payload. These are storage/verification limits for this increment, not permanent annual program policy. Adjust API, validation, database and tests together before raising them.

## Exam mode

Teachers choose the opening/closing window, duration (30–10,800 seconds), maximum attempts (1–5), result release, monitoring and warning/report response. Draft settings begin undecided. Result release can be immediately after submission, after closing, or deliberately by the teacher. Automatic grading and release are separate: unreleased scores do not leak through trainee requests.

The server starts attempts and derives deadlines as the earlier of the configured close time and attempt duration. One active attempt resumes instead of consuming another attempt; start retries carry a stable request ID. Answers save with optimistic versions, retain unsaved local changes during failed requests and offer explicit recovery from the server-saved version. Final submissions cannot be overwritten. At expiry, only previously accepted saves count. The browser tries to submit at its displayed deadline; database enforcement remains authoritative.

Expired/closed attempts are finalized when the learner resumes/reads/saves or a permitted teacher reads that report page. This is lazy server finalization, not a deployed background scheduler. An abandoned attempt may retain active storage status until such a request; it still cannot accept late answers. A future scheduled worker can finalize promptly without changing the stored accepted answers or inventing penalties.

Teacher reports are paged at 100 attempts, with separate bounded event-detail reads. The initial report uses participant identifiers where a richer roster/profile view is not implemented. No quiz pass threshold or certificate consequence is selected automatically.

## Fullscreen and visibility limits

A browser exam can request fullscreen from a user action and observe fullscreenchange/visibilitychange. Users can exit fullscreen; the website cannot lock their operating system, prevent every tab/app switch, detect second devices, or establish cheating from an event. See the primary [Fullscreen guide](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide) and [Page Visibility documentation](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

The initial monitored flow requests fullscreen before starting/resuming an active exam. Unsupported or denied requests stop that browser flow with a message to contact the teacher; no new attempt is consumed. This client preflight is not server-verifiable device attestation, and a modified client can bypass it. Test the actual school devices and agree an accessible accommodation process before real exams. No escape-key trapping, browser-history inspection, screen/camera/microphone recording or clipboard surveillance is added.

Signals are a bounded list of hidden/visible, fullscreen enter/exit and unavailable events. The server derives actor/receipt time and limits each attempt to 200 events. Client delivery retries use stable UUIDs; no tab URLs, external app names or keyboard data are collected. Signals are self-reported and can be suppressed, lost offline, delayed or duplicated by browsers. An event is an advisory observation, and missing events do not prove continuous presence. The UI's warning is separate from score calculation.

Teachers explicitly choose report-only or warn-and-report. There is no automatic zero, failed certificate, cheating verdict or forced submission for leaving fullscreen. Automatic disciplinary actions require a further owner-approved policy and review/appeal design. School privacy/retention owners must decide access, retention and correction processes for these records.

## Live game mode

Teachers select per-question time (5–300 seconds), correct-only or speed-bonus scoring, and leaderboard timing. Correct-only uses the question's points. With speed bonus, an entirely correct answer earns base points plus a linearly decreasing bonus up to the teacher-selected percentage; receipt time after database locks determines remaining time. Scores are exact integer hundredths. This formula is visible before publication; network latency can affect speed-based scores, so it is a deliberate teacher choice.

The teacher opens/resumes a lobby; enrolled participants join with their own accounts. This increment closes joining when the first question opens. The teacher advances questions, can close/reveal a question early and finishes the game. Results reveal automatically at the server deadline when the game is read; calculations and standings are automatic. Server deadlines stop answers even if the teacher's browser disconnects. Advancing to the next question remains teacher-controlled; another authorized teacher can resume control. Late-join/team/public-guest rules remain future work.

Each participant locks one answer per question. Identical deliveries are retry-safe; changed payloads cannot replace a locked answer. Current correct options are returned only at reveal/finish; future keys never enter participant responses. Standings use per-run participant labels and appear at the selected reveal/end point. Equal scores share a rank; no program award or disciplinary tie-break is invented.

The first live transport polls every two seconds with a single in-flight poll per client. It uses the existing stack, but 100–300 simultaneous players, latency and provider usage still need an approved load/device test. Do not promise free-tier capacity or real-time performance from source/tests alone. Private realtime channels can replace polling later after equivalent authorization tests.

## Verification and handover

Apply the complete migrations through 012 with matching API/client sources in an isolated development project. New functions explicitly revoke PUBLIC and named anon/authenticated/service_role defaults before restoring intended callers. Keep service secrets out of the client. Do not deploy older partial migration sets as a finished quiz service.

New tests cover domain validation/grading, API field restrictions, named grants, draft/key privacy, class scope/MFA, stale versions, expiry/attempt limits, monitoring idempotency and live answer locking/reveal. Browser tests use synthetic data and simulated fullscreen for deterministic UI checks; actual browser/device behavior, provider integration, independent security review, network interruptions and separate-connection contention still need evidence.

Pending owner preferences were asked asynchronously: preferred exam release, game scoring and monitoring response. Explicit per-quiz teacher selection avoids silently choosing these policies. Latest actual check/PR/merge evidence belongs in IMPLEMENTATION.md and GIT_HANDOFF.md.

Migration 010 replaces the provisional scalar-set quiz list with an explicit JSON array and notifies PostgREST to reload its schema. The API rejects unexpected envelopes instead of passing malformed collections into the interface. Verify the real provider RPC shapes during live integration; PGlite alone tests SQL results, not the HTTP gateway.

Migration 011 derives a reveal after the authoritative question deadline without a background scheduler; host advancement accepts that elapsed phase with a current version. A timed-out unanswered player cannot insert a late answer to influence the revealed standings.

Migration 012 separates quiz authoring/hosting from private score/event reports. The owner can still read their own bounded events; staff require explicit grading permission plus MFA. This review finding is tracked in issue #18 and has a capability-revocation regression.
