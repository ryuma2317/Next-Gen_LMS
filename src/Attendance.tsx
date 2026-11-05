import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Session } from '@supabase/supabase-js'
import { Camera, Check, Clock3, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, auth } from './lib'
import { CameraScanner } from './CameraScanner'
import { attendanceCondition, type AttendanceSummary, type LeaveRow, type RosterRow, type TeachingSession } from '../shared/attendance'
import type { Role, Section } from '../shared/domain'
import './attendance.css'

type Bundle = { sessions: TeachingSession[]; summary: AttendanceSummary | null; leave: LeaveRow[] }
type Challenge = { code: string; qr: string; serverTime: number; rotatesAt: number; expiresAt: number; windowClosesAt: number; startsAt: number }
const sampleSessionId = '70000000-0000-0000-0000-000000000001'
const sampleRoster: RosterRow[] = [
  { user_id: 'demo-alex', display_name: 'Alex Demo', status: 'unverified', late: false, version: 1, pending_leave: false },
  { user_id: 'demo-river', display_name: 'River Demo', status: 'unverified', late: false, version: 1, pending_leave: false },
]
const dateText = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Phnom_Penh', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const demoCode = (now: number) => String(Math.floor(now / 6000) % 100000000).padStart(8, '0')
function sampleBundle(trainer: boolean): Bundle {
  const now = Math.floor(Date.now() / 60_000) * 60_000
  return {
    sessions: [
      { id: sampleSessionId, section_id: 'demo-web', title: 'Web Development · Theory', kind: 'theory', starts_at: new Date(now).toISOString(), ends_at: new Date(now + 90 * 60_000).toISOString(), status: 'open', absence_units: 2, version: 1, is_trainer: trainer, attendance_status: 'unverified', record_version: 1 },
      { id: '70000000-0000-0000-0000-000000000002', section_id: 'demo-web', title: 'Web Development · Lab', kind: 'lab', starts_at: new Date(now + 105 * 60_000).toISOString(), ends_at: new Date(now + 195 * 60_000).toISOString(), status: 'scheduled', absence_units: 2, version: 1, is_trainer: trainer, attendance_status: null, record_version: null },
    ],
    summary: { units: 0, pending: 2, failure_units: 12, policy_version: 1, warning: 0 }, leave: [],
  }
}

export function Attendance({ session, edition, role, classes }: { session: Session | null; edition: string; role: Role; classes: Section[] }) {
  const [bundle, setBundle] = useState<Bundle>(() => sampleBundle(role === 'Trainer'))
  const [selected, setSelected] = useState(sampleSessionId)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [code, setCode] = useState(''), [scanning, setScanning] = useState(false)
  const [challenge, setChallenge] = useState<Challenge | null>(null), [displayError, setDisplayError] = useState('')
  const [clock, setClock] = useState(Date.now()), [clockOffset, setClockOffset] = useState(0)
  const [roster, setRoster] = useState<RosterRow[]>(sampleRoster), [correctionReasons, setCorrectionReasons] = useState<Record<string, string>>({})
  const [leaveNote, setLeaveNote] = useState(''), [leaveReasons, setLeaveReasons] = useState<Record<string, string>>({})
  const [mfaCode, setMfaCode] = useState('')
  const [newSection, setNewSection] = useState(''), [title, setTitle] = useState(''), [kind, setKind] = useState<'theory' | 'lab'>('theory')
  const [starts, setStarts] = useState(''), [ends, setEnds] = useState(''), [weight, setWeight] = useState(2), [policyReason, setPolicyReason] = useState('')
  const [failureUnits, setFailureUnits] = useState(12), [warningOne, setWarningOne] = useState(4), [warningTwo, setWarningTwo] = useState(8)
  const [cancelReason, setCancelReason] = useState('')
  const live = !!session
  const active = bundle.sessions.find(s => s.id === selected)
  const staff = ['Organizer', 'Admin', 'Super admin'].includes(role)
  const summary = bundle.summary
  const condition = summary ? attendanceCondition(summary) : null

  async function load() {
    if (!session || !edition) return
    const data = await api<Bundle>(`/editions/${edition}/attendance`, session.access_token)
    setBundle(data)
    setSelected(current => data.sessions.some(s => s.id === current) ? current : data.sessions[0]?.id ?? '')
  }
  useEffect(() => {
    if (!session) return
    let cancelled = false
    setBundle({ sessions: [], summary: null, leave: [] }); setSelected(''); setBusy(true)
    if (!edition) { setBusy(false); return }
    api<Bundle>(`/editions/${edition}/attendance`, session.access_token).then(data => {
      if (!cancelled) { setBundle(data); setSelected(data.sessions[0]?.id ?? '') }
    }).catch(e => { if (!cancelled) setMessage(e.message) }).finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [session?.access_token, edition])
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now() + clockOffset), 250)
    return () => clearInterval(timer)
  }, [clockOffset])
  useEffect(() => {
    setScanning(false); setCode(''); setRoster(live ? [] : sampleRoster); setCorrectionReasons({})
    if (!session || !selected || !active) return
    let cancelled = false
    api<RosterRow[]>(`/attendance/${selected}/roster`, session.access_token).then(rows => { if (!cancelled) setRoster(rows) }).catch(e => { if (!cancelled) setMessage(e.message) })
    return () => { cancelled = true }
  }, [selected, session?.access_token, active?.version])
  useEffect(() => {
    setChallenge(null); setDisplayError('')
    if (!active?.is_trainer || active.status !== 'open') return
    let disposed = false, timer: ReturnType<typeof setTimeout> | undefined
    async function refresh() {
      try {
        if (!session) {
          const now = Date.now(), next = (Math.floor(now / 6000) + 1) * 6000
          if (!disposed) setChallenge({ code: demoCode(now), qr: `nextgen-attendance:v1:${selected}:${demoCode(now)}`, serverTime: now, rotatesAt: next, expiresAt: next + 6000, windowClosesAt: now + 900_000, startsAt: now - 1000 })
          if (!disposed) timer = setTimeout(refresh, Math.max(100, next - now + 30))
          return
        }
        const received = await api<Challenge>(`/attendance/${selected}/challenge`, session.access_token)
        if (disposed) return
        setChallenge(received); setClockOffset(received.serverTime - Date.now()); setDisplayError('')
        timer = setTimeout(refresh, Math.max(100, received.rotatesAt - received.serverTime + 30))
      } catch (error) { if (!disposed) { setChallenge(null); setDisplayError((error as Error).message) } }
    }
    void refresh()
    return () => { disposed = true; if (timer) clearTimeout(timer) }
  }, [active?.id, active?.status, active?.is_trainer, session?.access_token])

  async function action(path: string, body: unknown, success: string) {
    if (!session || busy) return
    setBusy(true); setMessage('')
    try {
      await api(path, session.access_token, body); await load()
      if (selected) setRoster(await api<RosterRow[]>(`/attendance/${selected}/roster`, session.access_token))
      setMessage(success)
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }
  async function checkIn(value = code, id = selected) {
    setScanning(false)
    if (!active || busy) return
    if (id !== active.id) { setMessage('This QR belongs to a different session. Select that session first.'); return }
    if (session) { await action(`/attendance/${id}/check-in`, { code: value }, 'Attendance recorded. Check the session receipt below.'); return }
    if (![demoCode(Date.now()), demoCode(Date.now() - 6000)].includes(value)) { setMessage('Sample code expired. Try the current sample code.'); return }
    setBundle(previous => ({ ...previous, sessions: previous.sessions.map(s => s.id === id ? { ...s, attendance_status: 'present', record_version: (s.record_version ?? 0) + 1 } : s) }))
    setMessage('Sample check-in recorded in memory. No real attendance was changed.')
  }
  function sampleAction(actionName: 'start' | 'finalize') {
    if (!active) return
    setBundle(previous => ({ ...previous, sessions: previous.sessions.map(s => s.id === selected ? { ...s, status: actionName === 'start' ? 'open' : 'finalized', version: s.version + 1 } : s) }))
    if (actionName === 'finalize') setRoster(previous => previous.map(r => r.status === 'unverified' ? { ...r, status: 'absent', version: r.version + 1 } : r))
    setMessage('Sample session updated. Demo controls do not wait for the scheduled end.')
  }
  async function requestLeave(e: React.FormEvent) {
    e.preventDefault(); if (!active) return
    if (session) await action(`/attendance/${selected}/leave`, { note: leaveNote }, 'Leave request saved for authorized review.')
    else {
      setBundle(previous => ({ ...previous, leave: [...previous.leave.filter(l => l.session_id !== selected), { id: 'demo-leave', session_id: selected, user_id: 'demo-self', title: active.title, starts_at: active.starts_at, note: leaveNote, status: 'pending', version: 1 }], sessions: previous.sessions.map(s => s.id === selected ? { ...s, attendance_status: 'pending_review' } : s) }))
      setMessage('Sample leave request is pending. It has not been approved.')
    }
    setLeaveNote('')
  }
  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault(); if (!auth) return
    setBusy(true)
    try {
      const factors = await auth.auth.mfa.listFactors()
      if (factors.error) throw new Error('Unable to load authenticator')
      const factor = factors.data.totp.find(f => f.status === 'verified')
      if (!factor) throw new Error('Enroll a verified authenticator through your approved platform-owner process first.')
      const response = await auth.auth.mfa.challengeAndVerify({ factorId: factor.id, code: mfaCode })
      if (response.error) throw new Error('Authenticator code could not be verified')
      setMfaCode(''); setMessage('MFA verified. Permissions still depend on your assigned capabilities.')
    } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) }
  }

  return <section className="attendance-workspace">
    {!live && <p className="notice">Synthetic attendance preview. Change “Preview as” to Trainer to explore the rotating display and roster. Sample actions stay in memory.</p>}
    {message && <p className="feedback" role="status">{message}</p>}
    <div className="attendance-stats">
      <article><small>Provisional absence points</small><strong>{summary ? summary.units / 4 : '—'}</strong><span>{summary ? `Attendance fails at ${summary.failure_units / 4} points` : 'No trainee summary available'}</span></article>
      <article><small>Unresolved / upcoming sessions</small><strong>{summary?.pending ?? '—'}</strong><span>Future and unfinalized sessions keep the condition pending</span></article>
      <article><small>Attendance condition</small><strong className="condition">{condition?.replaceAll('-', ' ') ?? 'Not assessed'}</strong><span>Attendance passing alone does not qualify for a certificate</span></article>
    </div>
    {!!summary?.warning && <p className="notice">Attendance warning {summary.warning}: review your session records and pending requests with the organizer.</p>}
    <div className="attendance-toolbar">
      <label>Teaching session<select value={selected} onChange={e => setSelected(e.target.value)} disabled={busy}>{bundle.sessions.map(s => <option key={s.id} value={s.id}>{s.title} · {dateText(s.starts_at)} · {s.status}</option>)}</select></label>
      <button className="secondary-button" disabled={busy || !live} onClick={() => { setBusy(true); void load().catch(e => setMessage(e.message)).finally(() => setBusy(false)) }}><RefreshCw size={14} />Refresh records</button>
    </div>
    {busy && <p role="status">Updating attendance…</p>}
    {!active && <div className="empty"><Clock3 size={30} /><h2>No teaching sessions yet</h2><p>Sessions appear for assigned trainers and eligible trainees after scheduling. You need an active edition assignment.</p></div>}
    {active && <>
      <div className="session-banner"><div><span className="eyebrow">{active.kind.toUpperCase()} · CAMBODIA TIME (UTC+7)</span><h2>{active.title}</h2><p>{dateText(active.starts_at)} — {dateText(active.ends_at)} · {active.status}</p></div><span className="pill light">Absence weight: {active.absence_units / 4} points</span></div>
      {active.is_trainer || staff ? <div className="trainer-attendance">
        <div className="qr-display">
          <h3>Session check-in display</h3>
          {challenge && clock < challenge.expiresAt ? <>
            <QRCodeSVG value={challenge.qr} size={220} level="M" marginSize={4} title="Scan to check in to this session" />
            <div className="rotating-code" aria-label="Current attendance code">{challenge.code}</div>
            <p>Refresh in {Math.max(0, Math.ceil((challenge.rotatesAt - clock) / 1000))}s · valid for at most 12s</p>
            <small>Self-check-in closes 15 minutes after the scheduled start.</small>
          </> : <p>{displayError || (active.status === 'open' ? 'Loading current code…' : 'Start the scheduled session to display its code.')}</p>}
          {displayError && <button className="secondary-button" onClick={() => { setSelected(''); setTimeout(() => setSelected(active.id), 0) }}>Retry display</button>}
          <div className="session-controls">
            <button className="primary-button" disabled={busy || !active.is_trainer || active.status !== 'scheduled'} onClick={() => live ? void action(`/attendance/${selected}/start`, { version: active.version }, 'Session opened. The roster is now a snapshot of eligible enrollment.') : sampleAction('start')}>Start session</button>
            <button className="secondary-button" disabled={busy || !active.is_trainer || active.status !== 'open' || (live && clock < Date.parse(active.ends_at))} onClick={() => live ? void action(`/attendance/${selected}/finalize`, { version: active.version }, 'Roster finalized. Pending leave/review remains unresolved.') : sampleAction('finalize')}>Finalize delivered session</button>
          </div>
          <p className="muted">A rotating code cannot prove physical presence. Supervise the room and use a reasoned correction for technical failures.</p>
        </div>
        <article className="attendance-roster"><h3>Class roster</h3><p className="muted">Unverified records become absent at finalization unless review is pending. Private leave explanations are limited to authorized reviewers.</p>
          {roster.map(row => <div className="roster-person" key={row.user_id}>
            <strong>{row.display_name}</strong><span>{row.status.replaceAll('_', ' ')}{row.late ? ' · late' : ''}{row.pending_leave ? ' · leave pending' : ''}</span>
            <label>Correction reason for {row.display_name}<input maxLength={1000} value={correctionReasons[row.user_id] ?? ''} onChange={e => setCorrectionReasons({ ...correctionReasons, [row.user_id]: e.target.value })} /></label>
            <div className="roster-actions">{(['present', 'absent', 'pending_review'] as const).map(status => <button className="secondary-button" key={status} disabled={busy || !correctionReasons[row.user_id]?.trim()} onClick={() => {
              if (live) void action(`/attendance/${selected}/correct`, { userId: row.user_id, version: row.version, status, reason: correctionReasons[row.user_id] }, 'Attendance corrected with audit history.')
              else { setRoster(previous => previous.map(r => r.user_id === row.user_id ? { ...r, status, version: r.version + 1 } : r)); setMessage('Sample correction saved in memory.') }
            }}>{status === 'present' ? 'Verify present' : status === 'absent' ? 'Mark absent' : 'Flag for review'}</button>)}</div>
          </div>)}
          {!roster.length && <p>No roster is available. Start the session or refresh your assigned class.</p>}
        </article>
      </div> : <div className="trainee-attendance">
        <article className="checkin-panel"><h3>Your session receipt</h3><p className="attendance-receipt"><Check size={17} />{active.attendance_status?.replaceAll('_', ' ') ?? 'Not started / no roster record'}</p>
          <form onSubmit={e => { e.preventDefault(); void checkIn() }}><label>Current eight-digit attendance code<input required inputMode="numeric" pattern="[0-9]{8}" maxLength={8} autoComplete="off" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label><button className="primary-button" disabled={busy || active.status !== 'open'}>Check in</button></form>
          {!live && <p className="muted">Sample code: <button className="text-button" onClick={() => setCode(demoCode(Date.now()))}>Use current sample code</button></p>}
          <button className="secondary-button" disabled={busy || active.status !== 'open'} onClick={() => setScanning(true)}><Camera size={15} />Scan trainer QR</button>
          {scanning && <CameraScanner onClose={() => setScanning(false)} onRead={value => { setCode(value.code); void checkIn(value.code, value.sessionId) }} />}
          <p className="muted">Check-in is open during the first 15 minutes. For camera/network problems or a missed window, ask the trainer to verify your attendance.</p>
        </article>
        <form className="leave-panel" onSubmit={requestLeave}><h3>Request leave</h3><p>Two approved leave days equal one absence day. Approval is required; requesting leave is not the same as being present.</p><label>Short explanation (no medical details)<textarea required maxLength={240} rows={4} value={leaveNote} onChange={e => setLeaveNote(e.target.value)} /></label><button className="primary-button" disabled={busy || active.status === 'cancelled' || active.attendance_status === 'present'}>Send leave request</button></form>
      </div>}
    </>}
    <section className="leave-history"><h3>Leave requests</h3>{bundle.leave.map(l => <article key={l.id}><div><strong>{l.title}</strong><small>{dateText(l.starts_at)} · {l.status}</small><p>{l.note}</p></div>{staff && l.status === 'pending' && <div><label>Decision reason<input maxLength={1000} value={leaveReasons[l.id] ?? ''} onChange={e => setLeaveReasons({ ...leaveReasons, [l.id]: e.target.value })} /></label><div className="roster-actions">{[true, false].map(approved => <button className="secondary-button" key={String(approved)} disabled={busy || !live || !leaveReasons[l.id]?.trim()} onClick={() => void action(`/attendance-leave/${l.id}/review`, { version: l.version, approved, reason: leaveReasons[l.id] }, 'Leave decision recorded.')}>{approved ? 'Approve leave' : 'Reject leave'}</button>)}</div></div>}</article>)}{!bundle.leave.length && <p className="muted">No requests visible to your account.</p>}</section>
    {live && staff && <details className="attendance-admin"><summary><ShieldCheck size={16} /> Scheduling, policy and privileged verification</summary>
      <form onSubmit={verifyMfa}><h3>Verify enrolled authenticator</h3><label>Six-digit authenticator code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={mfaCode} onChange={e => setMfaCode(e.target.value)} /></label><button className="secondary-button" disabled={busy}>Verify MFA</button></form>
      <form onSubmit={e => { e.preventDefault(); void action(`/editions/${edition}/attendance-policy`, { failureUnits, warningOne, warningTwo, reason: policyReason }, 'Policy published. It freezes at the first session start.') }}><h3>Publish policy before sessions start</h3><p className="muted">Values are exact quarter-points: 12 units = 3 points. Published rules freeze when the first session starts.</p><div className="policy-fields"><label>Failure units<input type="number" required min={1} max={200} value={failureUnits} onChange={e => setFailureUnits(Number(e.target.value))} /></label><label>First warning<input type="number" required min={1} value={warningOne} onChange={e => setWarningOne(Number(e.target.value))} /></label><label>Second warning<input type="number" required min={1} value={warningTwo} onChange={e => setWarningTwo(Number(e.target.value))} /></label></div><label>Policy reason<input required maxLength={1000} value={policyReason} onChange={e => setPolicyReason(e.target.value)} /></label><button className="secondary-button" disabled={busy}>Publish policy</button></form>
      <form onSubmit={e => { e.preventDefault(); void action(`/sections/${newSection}/sessions`, { title, kind, startsAt: new Date(starts).toISOString(), endsAt: new Date(ends).toISOString(), absenceUnits: weight }, 'Session scheduled. Times are stored in UTC.') }}><h3>Schedule a session</h3><label>Class section<select required value={newSection} onChange={e => setNewSection(e.target.value)}><option value="">Choose a section</option>{classes.map(c => <option key={c.id} value={c.id}>{c.title} · {c.room}</option>)}</select></label><label>Session title<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Kind<select value={kind} onChange={e => setKind(e.target.value as 'theory' | 'lab')}><option value="theory">Theory</option><option value="lab">Lab</option></select></label><div className="policy-fields"><label>Starts (your device time)<input type="datetime-local" required value={starts} onChange={e => setStarts(e.target.value)} /></label><label>Ends (your device time)<input type="datetime-local" required value={ends} onChange={e => setEnds(e.target.value)} /></label><label>Absence weight in quarter-units<input type="number" required min={2} max={48} step={2} value={weight} onChange={e => setWeight(Number(e.target.value))} /></label></div><button className="secondary-button" disabled={busy}>Schedule session</button></form>
      {active && <div><label>Cancellation reason for the selected session<input maxLength={1000} value={cancelReason} onChange={e => setCancelReason(e.target.value)} /></label><button className="secondary-button" disabled={busy || !cancelReason.trim() || !['scheduled', 'open'].includes(active.status)} onClick={() => void action(`/attendance/${selected}/cancel`, { version: active.version, reason: cancelReason }, 'Session cancelled; it contributes no attendance points.')}>Cancel selected session</button></div>}
    </details>}
  </section>
}
