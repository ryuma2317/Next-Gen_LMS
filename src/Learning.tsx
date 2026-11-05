import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowUpRight, BookOpen, FileText, Plus, RefreshCw } from 'lucide-react'
import { api } from './lib'
import { MfaPanel } from './MfaPanel'
import { formatScore, publicationProblems, scoreToUnits, validateAssignment, validateLesson, validateWork, type Assignment, type AssignmentFields, type LearningClass, type Lesson, type WorkSubmission } from '../shared/learning'
import type { Role } from '../shared/domain'
import './learning.css'

const demoSection = '30000000-0000-0000-0000-000000000001'
const lessonId = '80000000-0000-0000-0000-000000000001', assignmentId = '81000000-0000-0000-0000-000000000001'
const dateText = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Not configured'
const localInput = (value: string | null) => { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const resourceHost = (value: string) => { try { return new URL(value).hostname } catch { return 'external site' } }
const draftFields = (): AssignmentFields => ({ title: '', instructions: '', submission_mode: null, response_format: null, opens_at: null, deadline_mode: null, due_at: null, late_mode: null, max_attempts: null, max_score_units: null })
function sampleAssignment(): Assignment {
  return { id: assignmentId, section_id: demoSection, title: 'Build a personal profile page', instructions: 'Create a simple profile page with a clear heading and an introduction. Explain one design decision in your response, or share an HTTPS repository link. This is a fictional sample assignment.', submission_mode: 'individual', response_format: 'text_or_link', opens_at: new Date(Date.now() - 3600000).toISOString(), deadline_mode: 'at', due_at: new Date(Date.now() + 86400000).toISOString(), late_mode: 'accept_flagged', max_attempts: 2, max_score_units: 10000, state: 'published', version: 2 }
}
const sampleLesson: Lesson = { id: lessonId, section_id: demoSection, title: 'Your first page on the web', body_text: 'A web page starts with structure. Use a heading to introduce your topic, paragraphs to explain it, and links to connect it to other pages.\n\nIn the lab, try building a short introduction to yourself. Keep your markup readable and test your page on a small screen.', resource_url: null, state: 'published', version: 2 }
const sampleWork: WorkSubmission = { id: '82000000-0000-0000-0000-000000000001', user_id: 'demo-peer', display_name: 'River Demo', body_text: 'I used one main heading and grouped related information into sections.', resource_url: null, attempt: 1, submitted_at: new Date().toISOString(), is_late: false, score_units: null, feedback: null, grade_version: 0, has_unpublished_changes: false, grade_is_published: false, is_latest: true }

export function Learning({ session, edition, role }: { session: Session | null; edition: string; role: Role }) {
  const previewTeacher = !session && role === 'Trainer'
  const [classes, setClasses] = useState<LearningClass[]>(() => session ? [] : [{ id: demoSection, title: 'Web Development', room: 'Sample B-201', can_edit: previewTeacher, can_grade: previewTeacher, is_trainer: previewTeacher, is_student: role === 'Trainee', mfa_ready: true }])
  const [section, setSection] = useState(session ? '' : demoSection)
  const [lessons, setLessons] = useState<Lesson[]>(session ? [] : [sampleLesson]), [assignments, setAssignments] = useState<Assignment[]>(session ? [] : [sampleAssignment()])
  const [assignment, setAssignment] = useState(session ? '' : assignmentId), [work, setWork] = useState<WorkSubmission[]>(previewTeacher ? [sampleWork] : [])
  const [tab, setTab] = useState<'Lessons' | 'Assignments'>('Lessons'), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [lessonDraft, setLessonDraft] = useState<Lesson | null>(null), [assignmentDraft, setAssignmentDraft] = useState<Assignment | null>(null)
  const [response, setResponse] = useState(''), [link, setLink] = useState(''), [closeReason, setCloseReason] = useState('')
  const [grading, setGrading] = useState<WorkSubmission | null>(null), [score, setScore] = useState(''), [feedback, setFeedback] = useState(''), [gradeReason, setGradeReason] = useState('')
  const [maximumScoreText, setMaximumScoreText] = useState('')
  const [workPage, setWorkPage] = useState(0), [releaseReasons, setReleaseReasons] = useState<Record<string, string>>({})
  const pendingSubmission = useRef<{ id: string; fingerprint: string } | null>(null)
  const activeClass = classes.find(c => c.id === section), activeAssignment = assignments.find(a => a.id === assignment && a.section_id === section)
  const canEdit = !!activeClass?.can_edit, canGrade = !!activeClass?.can_grade && !!activeClass?.mfa_ready
  async function loadClass() {
    if (!session || !section) return
    const result = await api<{ lessons: Lesson[]; assignments: Assignment[] }>(`/sections/${section}/learning`, session.access_token)
    setLessons(result.lessons); setAssignments(result.assignments)
    setAssignment(current => result.assignments.some(a => a.id === current) ? current : result.assignments[0]?.id ?? '')
  }
  async function loadWork() { if (session && assignment) setWork(await api<WorkSubmission[]>(`/assignments/${assignment}/work?offset=${workPage * 50}`, session.access_token)) }
  useEffect(() => {
    if (!session) return
    let cancelled = false; setBusy(true)
    if (!edition) { setBusy(false); return }
    api<LearningClass[]>(`/editions/${edition}/learning`, session.access_token).then(rows => {
      if (!cancelled) { setClasses(rows); setSection(current => rows.some(row => row.id === current) ? current : rows[0]?.id ?? '') }
    }).catch(e => { if (!cancelled) setMessage(e.message) }).finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [session?.access_token, edition])
  useEffect(() => {
    setLessonDraft(null); setAssignmentDraft(null); setGrading(null); setResponse(''); setLink(''); pendingSubmission.current = null
    if (session) { setLessons([]); setAssignments([]); setWork([]); setAssignment('') }
  }, [section])
  useEffect(() => {
    if (!session || !section) return
    let cancelled = false; setBusy(true)
    api<{ lessons: Lesson[]; assignments: Assignment[] }>(`/sections/${section}/learning`, session.access_token).then(result => {
      if (!cancelled) { setLessons(result.lessons); setAssignments(result.assignments); setAssignment(current => result.assignments.some(a => a.id === current) ? current : result.assignments[0]?.id ?? '') }
    }).catch(e => { if (!cancelled) setMessage(e.message) }).finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [section, session?.access_token])
  useEffect(() => {
    setResponse(''); setLink(''); setGrading(null); setWorkPage(0); setReleaseReasons({}); pendingSubmission.current = null
  }, [assignment])
  useEffect(() => {
    if (!session || !assignment) return
    let cancelled = false; setWork([])
    api<WorkSubmission[]>(`/assignments/${assignment}/work?offset=${workPage * 50}`, session.access_token).then(rows => { if (!cancelled) setWork(rows) }).catch(e => { if (!cancelled) setMessage(e.message) })
    return () => { cancelled = true }
  }, [assignment, session?.access_token, workPage])
  async function mutate(path: string, body: unknown, success: string) {
    if (!session || busy) return false
    setBusy(true); setMessage('')
    try { await api(path, session.access_token, body); await loadClass(); await loadWork(); setMessage(success); return true }
    catch (e) { setMessage((e as Error).message); return false } finally { setBusy(false) }
  }
  async function saveLesson(e: FormEvent) {
    e.preventDefault(); if (!lessonDraft) return
    try {
      const lesson = validateLesson({ title: lessonDraft.title, body_text: lessonDraft.body_text, resource_url: lessonDraft.resource_url })
      if (session) { if (await mutate(`/sections/${section}/lessons`, { id: lessonDraft.id, version: lessonDraft.version, lesson }, 'Lesson draft saved. Publish it separately when ready.')) setLessonDraft(null) }
      else { setLessons(previous => [...previous.filter(l => l.id !== lessonDraft.id), { ...lessonDraft, ...lesson, version: lessonDraft.version + 1 }]); setLessonDraft(null); setMessage('Sample lesson draft saved in memory.') }
    } catch (e) { setMessage((e as Error).message) }
  }
  async function saveAssignment(e: FormEvent) {
    e.preventDefault(); if (!assignmentDraft) return
    try {
      const { id, section_id: _section, state: _state, version, ...fields } = assignmentDraft
      const validated = validateAssignment({ ...fields, max_score_units: maximumScoreText.trim() ? scoreToUnits(maximumScoreText) : null })
      if (session) { if (await mutate(`/sections/${section}/assignments`, { id, version, assignment: validated }, 'Assignment draft saved. Complete and review its policy before publishing.')) { setAssignmentDraft(null); setAssignment(id) } }
      else { setAssignments(previous => [...previous.filter(a => a.id !== id), { ...assignmentDraft, ...validated, version: version + 1 }]); setAssignment(id); setAssignmentDraft(null); setMessage('Sample assignment draft saved in memory.') }
    } catch (e) { setMessage((e as Error).message) }
  }
  async function submitWork(e: FormEvent) {
    e.preventDefault(); if (!activeAssignment || busy) return
    try {
      const body = validateWork(response, link || null, activeAssignment.response_format)
      const fingerprint = JSON.stringify({ assignment, ...body })
      if (!pendingSubmission.current || pendingSubmission.current.fingerprint !== fingerprint) pendingSubmission.current = { id: crypto.randomUUID(), fingerprint }
      if (session) { if (await mutate(`/assignments/${assignment}/submit`, { id: pendingSubmission.current.id, version: activeAssignment.version, ...body }, 'Work submitted. Your saved version appears below.')) setWorkPage(0); return }
      if (work.some(w => w.id === pendingSubmission.current!.id)) { setMessage('This sample submission is already saved.'); return }
      const next = Math.max(0, ...work.map(w => w.attempt)) + 1
      if (next > (activeAssignment.max_attempts ?? 0)) throw new Error('The sample assignment version limit has been reached')
      if (activeAssignment.state !== 'published') throw new Error('The sample assignment is not open')
      setWork(previous => [{ ...sampleWork, ...body, id: pendingSubmission.current!.id, user_id: 'demo-self', display_name: 'Your work', attempt: next, submitted_at: new Date().toISOString() }, ...previous.map(row => ({ ...row, is_latest: false }))])
      setMessage('Sample work submitted in memory. No real work was sent.')
    } catch (e) { setMessage((e as Error).message) }
  }
  async function saveGrade(e: FormEvent) {
    e.preventDefault(); if (!grading || !activeAssignment) return
    try {
      const units = scoreToUnits(score)
      if (units > (activeAssignment.max_score_units ?? 0)) throw new Error('Score exceeds the assignment maximum')
      if (session) { if (await mutate(`/work/${grading.id}/grade`, { version: grading.grade_version, scoreUnits: units, feedback, reason: gradeReason }, 'Grade draft saved. The trainee still sees their last released result.')) setGrading(null) }
      else { setWork(previous => previous.map(w => w.id === grading.id ? { ...w, score_units: units, feedback, grade_version: w.grade_version + 1, has_unpublished_changes: true } : w)); setGrading(null); setMessage('Sample grade draft saved. Release it separately.'); }
    } catch (e) { setMessage((e as Error).message) }
  }
  function updateDraft<K extends keyof AssignmentFields>(key: K, value: AssignmentFields[K]) { setAssignmentDraft(previous => previous ? { ...previous, [key]: value } : previous) }
  function editAssignment(value: Assignment) { setAssignmentDraft(value); setMaximumScoreText(value.max_score_units === null ? '' : formatScore(value.max_score_units)) }

  return <section className="learning-workspace">
    {!session && <p className="notice">Synthetic learning preview. Select Trainer in the workspace preview to try lesson editing and grading. Changes reset when you leave this workspace.</p>}
    {message && <p className="feedback" role="status">{message}</p>}
    <div className="learning-toolbar"><label>Class workspace<select value={section} disabled={busy} onChange={e => setSection(e.target.value)}>{classes.map(c => <option key={c.id} value={c.id}>{c.title} · {c.room}</option>)}</select></label><button className="secondary-button" disabled={busy || !session} onClick={() => { setBusy(true); void loadClass().then(loadWork).catch(e => setMessage(e.message)).finally(() => setBusy(false)) }}><RefreshCw size={14} />Refresh</button></div>
    {session && (canEdit || activeClass?.can_grade) && !activeClass.mfa_ready && <MfaPanel />}
    <div className="learning-tabs" role="group" aria-label="Class learning pages">{(['Lessons', 'Assignments'] as const).map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'Lessons' ? <BookOpen size={16} /> : <FileText size={16} />}{value}</button>)}</div>
    {busy && <p role="status">Updating class workspace…</p>}
    {!activeClass && <div className="empty"><BookOpen size={32} /><h2>No class workspace available</h2><p>Join an eligible class or ask the organizer to review your assigned teaching access.</p></div>}
    {activeClass && tab === 'Lessons' && <>
      <div className="section-heading"><h2>Class lessons</h2>{canEdit && <button className="secondary-button" disabled={busy || !activeClass.mfa_ready} onClick={() => setLessonDraft({ id: crypto.randomUUID(), section_id: section, title: '', body_text: '', resource_url: null, state: 'draft', version: 0 })}><Plus size={14} />New lesson</button>}</div>
      {lessonDraft && <form className="learning-editor" onSubmit={saveLesson}><h3>Lesson draft</h3><label>Lesson title<input required maxLength={160} value={lessonDraft.title} onChange={e => setLessonDraft({ ...lessonDraft, title: e.target.value })} /></label><label>Lesson text<textarea rows={8} maxLength={10000} value={lessonDraft.body_text} onChange={e => setLessonDraft({ ...lessonDraft, body_text: e.target.value })} /></label><label>Optional HTTPS resource link<input type="url" value={lessonDraft.resource_url ?? ''} onChange={e => setLessonDraft({ ...lessonDraft, resource_url: e.target.value || null })} /></label><p className="muted">Save stores a private draft; publishing is separate. Text is displayed as text. Files and embedded content are not supported yet.</p><div className="learning-actions"><button className="primary-button" disabled={busy}>Save lesson draft</button><button type="button" className="secondary-button" onClick={() => setLessonDraft(null)}>Discard unsaved changes</button></div></form>}
      {lessons.filter(l => l.section_id === section).map(l => <article className="lesson-card" key={l.id}><div className="section-heading"><div><span className="eyebrow">{l.state.toUpperCase()} · REVISION {l.version}</span><h3>{l.title}</h3></div></div><div className="lesson-text">{l.body_text}</div>{l.resource_url && <a href={l.resource_url} target="_blank" rel="noopener noreferrer" className="resource-link">Open resource at {resourceHost(l.resource_url)} <ArrowUpRight size={15} /></a>}{canEdit && l.state === 'draft' && <div className="learning-actions"><button className="secondary-button" disabled={busy || !activeClass.mfa_ready} onClick={() => setLessonDraft(l)}>Edit draft</button><button className="secondary-button" disabled={busy || !activeClass.mfa_ready} onClick={() => {
        if (session) void mutate(`/lessons/${l.id}/publish`, { version: l.version }, 'Lesson published for eligible class members.')
        else { setLessons(previous => previous.map(row => row.id === l.id ? { ...row, state: 'published', version: row.version + 1 } : row)); setMessage('Sample lesson published in memory.') }
      }}>Publish lesson</button></div>}</article>)}{!lessons.length && <p className="muted">No lessons are visible in this class yet.</p>}
    </>}
    {activeClass && tab === 'Assignments' && <>
      <div className="section-heading"><h2>Assignments</h2>{canEdit && <button className="secondary-button" disabled={busy || !activeClass.mfa_ready} onClick={() => editAssignment({ ...draftFields(), id: crypto.randomUUID(), section_id: section, state: 'draft', version: 0 })}><Plus size={14} />New assignment</button>}</div>
      {assignmentDraft && <form className="learning-editor" onSubmit={saveAssignment}><h3>Assignment draft</h3><label>Assignment title<input required maxLength={160} value={assignmentDraft.title} onChange={e => updateDraft('title', e.target.value)} /></label><label>Instructions<textarea rows={6} maxLength={8000} value={assignmentDraft.instructions} onChange={e => updateDraft('instructions', e.target.value)} /></label><div className="learning-form-grid"><label>Submission mode<select value={assignmentDraft.submission_mode ?? ''} onChange={e => updateDraft('submission_mode', e.target.value as AssignmentFields['submission_mode'] || null)}><option value="">Choose before publishing</option><option value="individual">Individual</option></select></label><label>Response format<select value={assignmentDraft.response_format ?? ''} onChange={e => updateDraft('response_format', e.target.value as AssignmentFields['response_format'] || null)}><option value="">Choose before publishing</option><option value="text">Text only</option><option value="link">HTTPS link only</option><option value="text_and_link">Text and HTTPS link</option><option value="text_or_link">Text, HTTPS link, or both</option></select></label><label>Opens (your device time)<input type="datetime-local" value={localInput(assignmentDraft.opens_at)} onChange={e => updateDraft('opens_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></label><label>Deadline<select value={assignmentDraft.deadline_mode ?? ''} onChange={e => { const value = e.target.value as AssignmentFields['deadline_mode'] || null; setAssignmentDraft({ ...assignmentDraft, deadline_mode: value, due_at: value === 'none' ? null : assignmentDraft.due_at, late_mode: value === 'none' ? 'not_applicable' : null }) }}><option value="">Choose before publishing</option><option value="none">No deadline; close manually</option><option value="at">Set a deadline</option></select></label>{assignmentDraft.deadline_mode === 'at' && <><label>Due (your device time)<input type="datetime-local" value={localInput(assignmentDraft.due_at)} onChange={e => updateDraft('due_at', e.target.value ? new Date(e.target.value).toISOString() : null)} /></label><label>At or after the deadline<select value={assignmentDraft.late_mode ?? ''} onChange={e => updateDraft('late_mode', e.target.value as AssignmentFields['late_mode'] || null)}><option value="">Choose a late-work policy</option><option value="reject">Reject submissions</option><option value="accept_flagged">Accept and flag as late; no automatic score penalty</option></select></label></>}<label>Total submitted versions allowed<input type="number" min={1} max={20} value={assignmentDraft.max_attempts ?? ''} onChange={e => updateDraft('max_attempts', e.target.value ? Number(e.target.value) : null)} /></label><label>Maximum score<input inputMode="decimal" maxLength={8} value={maximumScoreText} onChange={e => setMaximumScoreText(e.target.value)} /></label></div><p className="muted">Unselected rules can remain in a draft. Publishing requires a complete policy. Published rules are locked; files, group submissions and automatic grading are not available in this increment.</p><div className="learning-actions"><button className="primary-button" disabled={busy}>Save assignment draft</button><button type="button" className="secondary-button" onClick={() => setAssignmentDraft(null)}>Discard unsaved changes</button></div></form>}
      <label>Assignment<select value={assignment} onChange={e => setAssignment(e.target.value)}>{assignments.filter(a => a.section_id === section).map(a => <option key={a.id} value={a.id}>{a.title} · {a.state}</option>)}</select></label>
      {activeAssignment && <article className="assignment-card"><span className="eyebrow">{activeAssignment.state.toUpperCase()} · REVISION {activeAssignment.version}</span><h3>{activeAssignment.title}</h3><div className="lesson-text">{activeAssignment.instructions}</div><dl className="assignment-policy"><div><dt>Opens (Cambodia time)</dt><dd>{dateText(activeAssignment.opens_at)}</dd></div><div><dt>Deadline</dt><dd>{activeAssignment.deadline_mode === 'none' ? 'No deadline' : dateText(activeAssignment.due_at)}</dd></div><div><dt>Late work</dt><dd>{activeAssignment.late_mode?.replaceAll('_', ' ') ?? 'Not configured'}</dd></div><div><dt>Submitted versions / score</dt><dd>{activeAssignment.max_attempts ?? '—'} allowed · {activeAssignment.max_score_units ? formatScore(activeAssignment.max_score_units) : '—'} points</dd></div></dl>
        {canEdit && activeAssignment.state === 'draft' && <div className="learning-actions"><button className="secondary-button" disabled={busy || !activeClass.mfa_ready} onClick={() => editAssignment(activeAssignment)}>Edit assignment draft</button><button className="secondary-button" disabled={busy || !activeClass.mfa_ready} onClick={() => {
          const problems = publicationProblems(activeAssignment); if (problems.length) { setMessage(problems.join('. ')); return }
          if (session) void mutate(`/assignments/${assignment}/publish`, { version: activeAssignment.version }, 'Assignment published with locked rules.')
          else { setAssignments(previous => previous.map(a => a.id === assignment ? { ...a, state: 'published', version: a.version + 1 } : a)); setMessage('Sample assignment published in memory.') }
        }}>Publish assignment</button></div>}
        {canEdit && activeAssignment.state === 'published' && <div><label>Reason to close submissions<input maxLength={1000} value={closeReason} onChange={e => setCloseReason(e.target.value)} /></label><button className="secondary-button" disabled={busy || !activeClass.mfa_ready || !closeReason.trim()} onClick={() => {
          if (session) void mutate(`/assignments/${assignment}/close`, { version: activeAssignment.version, reason: closeReason }, 'Assignment closed. Existing work is preserved.')
          else { setAssignments(previous => previous.map(a => a.id === assignment ? { ...a, state: 'closed', version: a.version + 1 } : a)); setMessage('Sample assignment closed.') }
        }}>Close submissions</button></div>}
      </article>}
      {activeAssignment && activeClass.is_student && activeAssignment.state !== 'draft' && <form className="learning-editor" onSubmit={submitWork}><h3>Submit your work</h3><p className="muted">Format: {activeAssignment.response_format?.replaceAll('_', ' ')}. Each successful new submission uses one allowed version. Your name, score and late flag come from the server. Copy unsent work before leaving this page.</p>{activeAssignment.response_format !== 'link' && <label>Your response<textarea rows={7} maxLength={10000} value={response} onChange={e => setResponse(e.target.value)} /></label>}{activeAssignment.response_format !== 'text' && <label>HTTPS work link<input type="url" value={link} onChange={e => setLink(e.target.value)} /></label>}<button className="primary-button" disabled={busy || activeAssignment.state !== 'published'}>Submit work</button></form>}
      <section className="submitted-work"><h3>{canGrade ? 'Class submissions' : 'Your submitted versions and released feedback'}</h3>{(activeAssignment ? work : []).map(w => {
        const latest = w.is_latest
        return <article key={w.id}><div className="section-heading"><div><strong>{w.display_name}</strong><p>Version {w.attempt} · {dateText(w.submitted_at)}{w.is_late ? ' · late' : ''}</p></div><span className="pill light">{w.grade_is_published ? 'Released result available' : 'No released result'}</span></div><div className="lesson-text">{w.body_text}</div>{w.resource_url && <a className="resource-link" href={w.resource_url} target="_blank" rel="noopener noreferrer">Open submitted link at {resourceHost(w.resource_url)} <ArrowUpRight size={14} /></a>}{w.score_units !== null && <div className="work-feedback"><strong>{canGrade && w.user_id !== session?.user.id ? 'Current grade draft' : 'Released score'}: {formatScore(w.score_units)}</strong><p className="lesson-text">{w.feedback}</p></div>}{canGrade && <div className="learning-actions"><button className="secondary-button" disabled={busy || !latest || w.user_id === session?.user.id} onClick={() => { setGrading(w); setScore(w.score_units === null ? '' : formatScore(w.score_units)); setFeedback(w.feedback ?? ''); setGradeReason('') }}>Grade latest version</button><button className="secondary-button" disabled={busy || !latest || !w.has_unpublished_changes || !releaseReasons[w.id]?.trim() || w.user_id === session?.user.id} onClick={() => {
          if (session) void mutate(`/work/${w.id}/release`, { version: w.grade_version, reason: releaseReasons[w.id] }, 'Score and feedback released to the trainee.')
          else { setWork(previous => previous.map(row => row.id === w.id ? { ...row, grade_is_published: true, has_unpublished_changes: false, grade_version: row.grade_version + 1 } : row)); setMessage('Sample grade released in memory.') }
        }}>Release score and feedback</button></div>}{canGrade && <label>Release reason for {w.display_name} version {w.attempt}<input maxLength={1000} value={releaseReasons[w.id] ?? ''} onChange={e => setReleaseReasons({ ...releaseReasons, [w.id]: e.target.value })} /></label>}</article>
      })}{!work.length && <p className="muted">No submissions are visible to your account for this assignment.</p>}</section>
      {session && <div className="learning-actions"><button className="secondary-button" disabled={busy || workPage === 0} onClick={() => setWorkPage(page => page - 1)}>Previous submissions</button><span className="muted">Page {workPage + 1} (up to 50 records)</span><button className="secondary-button" disabled={busy || work.length < 50 || workPage >= 200} onClick={() => setWorkPage(page => page + 1)}>Next submissions</button></div>}
      {grading && activeAssignment && <form className="learning-editor" onSubmit={saveGrade}><h3>Draft grade · {grading.display_name}</h3><label>Score<input required inputMode="decimal" value={score} onChange={e => setScore(e.target.value)} /></label><label>Feedback<textarea rows={5} maxLength={6000} value={feedback} onChange={e => setFeedback(e.target.value)} /></label><label>Reason for grade change<input required maxLength={1000} value={gradeReason} onChange={e => setGradeReason(e.target.value)} /></label><p className="muted">Saving a draft does not change the trainee's last released score or feedback. Release is a separate action.</p><div className="learning-actions"><button className="primary-button" disabled={busy}>Save grade draft</button><button type="button" className="secondary-button" onClick={() => setGrading(null)}>Discard unsaved changes</button></div></form>}
    </>}
  </section>
}
