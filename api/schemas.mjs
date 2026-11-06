// OpenAPI 3.1 schemas describe HTTP payloads, not raw database tables.
export const ref = name => ({ $ref: '#/components/schemas/' + name })
export const object = (properties, required = Object.keys(properties), additionalProperties = false) => ({ type: 'object', properties, required, additionalProperties })
export const array = (items, extra = {}) => ({ type: 'array', items, ...extra })
export const string = (maxLength, extra = {}) => ({ type: 'string', ...(maxLength ? { maxLength } : {}), ...extra })
export const integer = (minimum = 0, maximum, extra = {}) => ({ type: 'integer', minimum, ...(maximum === undefined ? {} : { maximum }), ...extra })
export const choices = values => ({ type: 'string', enum: values })
export const nullable = schema => ({ anyOf: [schema, { type: 'null' }] })
const bool = { type: 'boolean' }
const uuid = { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', example: '00000000-0000-4000-8000-000000000001' }
const time = { type: 'string', format: 'date-time', description: 'Send an ISO timestamp including a UTC offset. Stored times are absolute; scheduling inputs use device-local time.' }
const text = max => string(max, { description: 'Plain text. Server code-unit, UTF-8 byte and control-character bounds also apply.' })
const key = string(40, { pattern: '^[a-z][a-z0-9_]{0,39}$' })
const quizKey = { ...key, pattern: '^(?!(?:constructor|prototype)$)[a-z][a-z0-9_]{0,39}$' }
const department = choices(['CS', 'DB', 'TN', 'EXTERNAL'])
const memberRole = choices(['trainee', 'trainer', 'volunteer', 'organizer', 'admin', 'super_admin', 'mentor', 'advisor'])
const state = choices(['submitted', 'under_review', 'passed', 'failed', 'activated'])
const purpose = choices(['trainer', 'trainee'])
const version = integer(1, 2147483647, { description: 'Use the current server revision. NULL/stale input cannot overwrite newer state.' })
const draftVersion = integer(0, 2147483647, { description: '0 creates a draft with a new client UUID; use the latest positive revision for updates.' })
const points = integer(0, 1000000, { description: '100 units = 1 score point; separate from attendance quarter-units.' })
const url = string(2048, { format: 'uri', pattern: '^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(?::[0-9]{1,5})?(?:[/?#][^\\s]*)?$', description: 'HTTPS without embedded credentials, whitespace or IPv6-literal hosts. The LMS server does not fetch/embed this link.' })
const linkInput = { anyOf: [url, { type: 'null' }, { const: '' }], description: 'Use null for no link; an empty string is also normalized to null.' }
const recruitBase = { id: key, label: string(160, { minLength: 1 }), required: bool }
const form = { id: uuid, edition_id: uuid, title: string(160), purpose, version, questions: array(ref('RecruitQuestion'), { maxItems: 12 }), published: bool, closes_at: nullable(time) }
const lesson = { title: string(160, { minLength: 1 }), body_text: text(10000), resource_url: nullable(url) }
const assignment = { title: string(160, { minLength: 1 }), instructions: text(8000), submission_mode: nullable(choices(['individual'])), response_format: nullable(choices(['text', 'link', 'text_and_link', 'text_or_link'])), opens_at: nullable(time), deadline_mode: nullable(choices(['none', 'at'])), due_at: nullable(time), late_mode: nullable(choices(['not_applicable', 'reject', 'accept_flagged'])), max_attempts: nullable(integer(1, 20)), max_score_units: nullable(integer(1, 1000000)) }
const quizBase = { id: uuid, section_id: uuid, title: string(160), description: text(1500), mode: choices(['exam', 'game']), config: ref('QuizConfig'), state: choices(['draft', 'published', 'closed']), version, released: bool }
const option = object({ id: quizKey, text: text(200) })
const questionBase = { id: quizKey, prompt: text(1000), options: array(option, { minItems: 2, maxItems: 6 }), points: integer(1, 100) }
const questionDefinition = kind => object({ ...questionBase, kind: { const: kind }, correct: array(quizKey, { uniqueItems: true, maxItems: kind === 'single' ? 1 : 6, description: 'Drafts may be incomplete; publication requires valid correct option IDs.' }) })
const attendanceState = choices(['unverified', 'present', 'absent', 'approved_leave', 'pending_review'])
const leaveState = choices(['pending', 'approved', 'rejected', 'superseded'])
export const schemas = {
 Error: object({ error: string(undefined, { minLength: 1 }) }),
 UUID: uuid, Timestamp: time, Revision: version, DraftRevision: draftVersion,
 ScoreUnits: points, ResourceUrl: url, LinkInput: linkInput,
 Saved: object({ status: { const: 'saved' } }),
 ID: object({ id: uuid }), NullableID: object({ id: nullable(uuid) }),
 SavedWithID: object({ status: { const: 'saved' }, id: nullable(uuid) }),
 Health: object({ status: { const: 'ok' }, version: { const: '0.4.0' } }),
 Membership: object({ edition_id: uuid, role: memberRole, department, active: { const: true } }),
 Me: object({ userId: uuid, memberships: array(ref('Membership')) }),
 Edition: object({ id: uuid, name: string(), selection_open: bool, core_limit: integer(0, 12), elective_limit: integer(0, 12) }),
 Class: object({ id: uuid, offering_id: uuid, title: string(), department: choices(['CS', 'DB', 'TN']), kind: choices(['core', 'elective']), capacity: integer(1, 500), enrolled: integer(), day: string(), room: string(), trainer: string() }),
 EnrollRequest: object({ sectionId: uuid }),
 Enrolled: object({ status: { const: 'enrolled' } }),
 RecruitQuestion: { oneOf: [object({ ...recruitBase, type: choices(['text', 'textarea']) }), object({ ...recruitBase, type: { const: 'select' }, options: array(string(120, { minLength: 1 }), { minItems: 1, maxItems: 20, uniqueItems: true }) })] },
 StaffForm: object(form),
 PublishedForm: object({ ...form, created_at: time }),
 FormRequest: object({ title: string(160, { minLength: 1 }), purpose, questions: array(ref('RecruitQuestion'), { maxItems: 12 }), published: bool, closesAt: nullable(time) }),
 ApplicationRequest: object({
  formId: uuid, submissionId: uuid,
  receiptToken: string(43, { minLength: 43, pattern: '^[A-Za-z0-9_-]{43}$', writeOnly: true, description: 'Generate 32 cryptographically random bytes encoded base64url. Keep the same UUID/token/payload for identical retries. Never use a fixed example token for real applications.' }),
  fullName: string(160, { minLength: 1 }), email: string(254, { format: 'email' }), department, specialization: string(120),
  answers: { type: 'object', maxProperties: 12, propertyNames: key, additionalProperties: string(1000), description: 'Must match required questions/options in the published snapshot. Encoded answers are bounded to 8192 bytes.' }
 }),
 ApplicationSubmitted: object({ id: uuid, status: { const: 'submitted' } }),
 ReceiptRequest: object({ id: uuid, token: string(43, { minLength: 43, pattern: '^[A-Za-z0-9_-]{43}$', writeOnly: true, description: 'Private receipt proof. Keep out of shared examples, URLs, logs and exported environments.' }) }),
 Receipt: object({ status: state, purpose, submitted_at: time }),
 Application: object({ id: uuid, edition_id: uuid, form_id: uuid, form_version: version, purpose, full_name: string(160), email: string(254, { format: 'email' }), department, specialization: string(120), questions: array(ref('RecruitQuestion')), answers: { type: 'object', additionalProperties: string(1000) }, status: state, version, created_at: time }),
 EligibleApplication: object({ id: uuid, edition_name: string(), purpose, status: choices(['passed', 'activated']) }),
 Activated: object({ status: { const: 'activated' } }),
 ReviewApplicationRequest: object({ version, state: choices(['under_review', 'passed','failed']), reason: text(1000) }),
 TeachingSession: object({ id: uuid, section_id: uuid, title: string(160), kind: choices(['theory','lab']), starts_at: time, ends_at: time, status: choices(['scheduled','open','finalized','cancelled']), absence_units: integer(2,48,{multipleOf:2}), version, is_trainer: bool, attendance_status: nullable(attendanceState), record_version: nullable(version) }),
 AttendanceSummary: object({ units: integer(), pending: integer(), failure_units: integer(1), policy_version: nullable(version), warning: integer(0,2) }),
 Leave: object({ id: uuid, session_id: uuid, user_id: uuid, title: string(160), starts_at: time, note: text(240), status: leaveState, version }),
 AttendanceOverview: object({ sessions: array(ref('TeachingSession')), summary: nullable(ref('AttendanceSummary')), leave: array(ref('Leave')) }),
 RosterRow: object({ user_id: uuid, display_name: string(), status: attendanceState, late: bool, version, pending_leave: bool }),
 AttendanceChallenge: object({ code: string(8,{minLength:8,pattern:'^[0-9]{8}$'}), qr: string(160,{pattern:'^nextgen-attendance:v1:[0-9a-fA-F-]{36}:[0-9]{8}$'}), serverTime:integer(),rotatesAt:integer(),expiresAt:integer(),windowClosesAt:integer(),startsAt:integer() }),
 CheckinRequest: object({code:string(8,{minLength:8,pattern:'^[0-9]{8}$'})}),
 Present: object({status:{const:'present'}}),
 VersionRequest: object({version}),
 ReasonRequest: object({version,reason:text(1000)}),
 LeaveRequest: object({note:string(240,{minLength:1})}),
 LeaveReviewRequest: object({version,approved:bool,reason:text(1000)}),
 CorrectionRequest: object({userId:uuid,version,status:choices(['present','absent','pending_review']),reason:text(1000)}),
 SessionRequest: object({title:string(160,{minLength:1}),kind:choices(['theory','lab']),startsAt:time,endsAt:time,absenceUnits:integer(2,48,{multipleOf:2,description:'Attendance quarter-units; normal half-session absence is 2. End must follow start and be within 8 hours.'})}),
 AttendancePolicyRequest: object({failureUnits:integer(1,200),warningOne:integer(1),warningTwo:integer(1),reason:text(1000)}),
 LearningClass: object({id:uuid,title:string(),room:string(),can_edit:bool,can_grade:bool,is_trainer:bool,is_student:bool,mfa_ready:bool}),
 LessonInput: object({...lesson,resource_url:linkInput}),
 Lesson: object({id:uuid,section_id:uuid,...lesson,state:choices(['draft','published']),version}),
 LessonRequest: object({id:uuid,version:draftVersion,lesson:ref('LessonInput')}),
 AssignmentInput: object(assignment),
 Assignment: object({id:uuid,section_id:uuid,...assignment,state:choices(['draft','published','closed']),version}),
 AssignmentRequest: object({id:uuid,version:draftVersion,assignment:ref('AssignmentInput')}),
 ClassMaterial: object({lessons:array(ref('Lesson'),{maxItems:100}),assignments:array(ref('Assignment'),{maxItems:100})}),
 WorkRequest: object({id:uuid,version,body_text:text(10000),resource_url:linkInput}),
 WorkSubmission: object({id:uuid,user_id:uuid,display_name:string(),body_text:text(10000),resource_url:nullable(url),attempt:integer(1),submitted_at:time,is_late:bool,score_units:nullable(points),feedback:nullable(text(6000)),grade_version:integer(),has_unpublished_changes:bool,grade_is_published:bool,is_latest:bool}),
 GradeRequest: object({version:draftVersion,scoreUnits:points,feedback:text(6000),reason:text(1000)}),
 Published: object({status:{const:'published'}}),
 QuizConfig: object({opens_at:nullable(time),closes_at:nullable(time),duration_seconds:nullable(integer(30,10800)),max_attempts:nullable(integer(1,5)),results:nullable(choices(['immediate','after_close','teacher'])),monitoring:nullable(choices(['fullscreen_visibility'])),focus_response:nullable(choices(['report','warn_report'])),question_seconds:nullable(integer(5,300)),scoring:nullable(choices(['correct','speed'])),speed_bonus_percent:nullable(integer(0,100)),leaderboard:nullable(choices(['each_question','end']))}),
 QuizQuestion: {oneOf:['single','multiple'].map(kind=>object({...questionBase,kind:{const:kind}}))},
 QuizQuestionDefinition: {oneOf:['single','multiple'].map(questionDefinition)},
 QuizDraft: object({title:string(160,{minLength:1}),description:text(1500),mode:choices(['exam','game']),config:ref('QuizConfig'),questions:array(ref('QuizQuestionDefinition'),{maxItems:15})}),
 QuizSummary: object({...quizBase,can_edit:bool,can_report:bool,can_participate:bool}),
 QuizDefinition: object({...quizBase,questions:array(ref('QuizQuestionDefinition'),{maxItems:15})}),
 QuizDraftRequest: object({id:uuid,version:draftVersion,quiz:ref('QuizDraft')}),
 QuizTransitionRequest: object({version,action:choices(['publish','close','release']),reason:text(500)}),
 RequestID: object({id:uuid}),
 QuizAnswers: {type:'object',maxProperties:15,propertyNames:quizKey,additionalProperties:array(quizKey,{maxItems:6,uniqueItems:true}),description:'Question/option IDs must belong to the frozen quiz. Single-choice permits at most one option. No score/key/actor fields.'},
 QuizAttempt: object({id:uuid,status:choices(['active','submitted']),version,deadline:time,server_now:time,answers:ref('QuizAnswers'),questions:array(ref('QuizQuestion'),{maxItems:15}),score_units:nullable(points),max_units:integer(1),flags:integer(0,200)}),
 QuizAttemptSave: object({version,answers:ref('QuizAnswers'),submit:bool}),
 QuizSignalRequest: object({id:uuid,kind:choices(['hidden','visible','fullscreen_exit','fullscreen_enter','fullscreen_unavailable'])}),
 QuizEvent: object({kind:choices(['hidden','visible','fullscreen_exit','fullscreen_enter','fullscreen_unavailable']),received_at:time}),
 QuizReportRow: object({id:uuid,user_id:uuid,attempt:integer(1,5),status:choices(['active','submitted']),score_units:nullable(points),deadline:time,flags:integer(0,200)}),
 QuizRun: object({id:uuid,phase:choices(['lobby','question','reveal','finished']),version,created_at:time}),
 GameStanding: object({label:string(),score_units:points,rank:integer(1),is_you:bool}),
 GameView: object({id:uuid,version,phase:choices(['lobby','question','reveal','finished']),question_index:integer(-1,14),deadline:nullable(time),server_now:time,question:nullable(ref('QuizQuestion')),correct:nullable(array(quizKey,{uniqueItems:true,maxItems:6})),joined:bool,answered:bool,players:integer(),answered_count:integer(),standings:array(ref('GameStanding'))}),
 Empty: object({}),
 GameAnswerRequest: object({questionIndex:integer(0,14),selected:array(quizKey,{maxItems:6,uniqueItems:true})}),
 GameTransitionRequest: object({version,action:choices(['next','reveal','finish']),reason:text(500)}),
 ProjectColumn: object({id:quizKey,title:string(60,{minLength:1}),complete:bool}),
 ProjectLimits: object({participant:integer(1,100),mentor:integer(0,100),advisor:integer(0,100)}),
 ProjectFields: object({title:string(160,{minLength:1}),theme:text(3000),columns:array(ref('ProjectColumn'),{minItems:2,maxItems:8}),limits:ref('ProjectLimits')}),
 ProjectSummary: object({id:uuid,title:string(160),theme:text(3000),archived:bool,version}),
 ProjectList: object({can_manage:bool,projects:array(ref('ProjectSummary'),{maxItems:100})}),
 ProjectMember: object({user_id:uuid,display_name:string(),role:choices(['participant','mentor','advisor']),active:bool,version,can_tasks:bool,can_comment:bool,can_sprints:bool}),
 ProjectSprint: object({id:uuid,title:string(160),goal:text(3000),starts_at:time,ends_at:time,state:choices(['planned','active','closed']),version}),
 ProjectBoard: object({id:uuid,title:string(160),theme:text(3000),archived:bool,version,columns:array(ref('ProjectColumn'),{minItems:2,maxItems:8}),limits:ref('ProjectLimits'),can_manage:bool,can_tasks:bool,can_comment:bool,can_sprints:bool,members:array(ref('ProjectMember'),{maxItems:1000}),sprints:array(ref('ProjectSprint'),{maxItems:100})}),
 ProjectCandidate: object({user_id:uuid,display_name:string(),roles:array(memberRole)}),
 ProjectTaskFields: object({title:string(160,{minLength:1}),description:text(6000),column_id:quizKey,assignee_id:nullable(uuid),sprint_id:nullable(uuid)}),
 ProjectTask: object({id:uuid,project_id:uuid,title:string(160),description:text(6000),column_id:quizKey,assignee_id:nullable(uuid),sprint_id:nullable(uuid),archived:bool,version,created_at:time,updated_at:time}),
 ProjectThread: object({comments:array(object({id:uuid,author:string(),body:text(3000),created_at:time}),{maxItems:100}),changes:array(object({version,actor:string(),action:choices(['created','updated','moved','archived']),created_at:time}),{maxItems:50})}),
 ProjectRequest: object({id:uuid,version:draftVersion,project:ref('ProjectFields')}),
 ProjectMemberRequest: object({userId:uuid,version:draftVersion,role:choices(['participant','mentor','advisor']),active:bool,canTasks:bool,canComment:bool,canSprints:bool,reason:text(1000)}),
 ProjectTaskRequest: object({id:uuid,version:draftVersion,task:ref('ProjectTaskFields')}),
 ProjectCommentRequest: object({id:uuid,body:string(3000,{minLength:1})}),
 ProjectSprintFields: object({title:string(160,{minLength:1}),goal:text(3000),startsAt:time,endsAt:time}),
 ProjectSprintRequest: object({id:uuid,version:draftVersion,sprint:ref('ProjectSprintFields')})
}
