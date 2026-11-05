export type AttendanceStatus = 'unverified' | 'present' | 'absent' | 'approved_leave' | 'pending_review'
export type TeachingSession = {
  id: string; section_id: string; title: string; kind: 'theory' | 'lab';
  starts_at: string; ends_at: string; status: 'scheduled' | 'open' | 'finalized' | 'cancelled';
  absence_units: number; version: number; is_trainer: boolean;
  attendance_status: AttendanceStatus | null; record_version: number | null;
}
export type RosterRow = { user_id: string; display_name: string; status: AttendanceStatus; late: boolean; version: number; pending_leave: boolean }
export type LeaveRow = { id: string; session_id: string; user_id: string; title: string; starts_at: string; note: string; status: 'pending' | 'approved' | 'rejected' | 'superseded'; version: number }
export type AttendanceSummary = { units: number; pending: number; failure_units: number; policy_version: number | null; warning: number }
export function attendanceCondition(summary: AttendanceSummary): 'pending' | 'failed' | 'passing-so-far' {
  if (![summary.units, summary.pending, summary.failure_units].every(n => Number.isSafeInteger(n) && n >= 0) || summary.failure_units === 0) return 'pending'
  if (summary.pending > 0 || summary.policy_version === null) return 'pending'
  return summary.units >= summary.failure_units ? 'failed' : 'passing-so-far'
}
export function recordUnits(status: AttendanceStatus, absenceUnits = 2): number | null {
  if (!['unverified', 'present', 'absent', 'approved_leave', 'pending_review'].includes(status)) throw new Error('Unknown attendance status')
  if (!Number.isSafeInteger(absenceUnits) || absenceUnits < 2 || absenceUnits % 2 !== 0) throw new Error('Use an even positive quarter-unit weight')
  if (status === 'unverified' || status === 'pending_review') return null
  if (status === 'present') return 0
  return status === 'approved_leave' ? absenceUnits / 2 : absenceUnits
}
export function parseAttendanceQr(text: string): { sessionId: string; code: string } {
  // QR data is deliberately not a URL: scanning never navigates to an arbitrary origin.
  if (text.length > 160) throw new Error('Not a Next-Gen attendance code')
  const match = /^nextgen-attendance:v1:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([0-9]{8})$/i.exec(text)
  if (!match) throw new Error('Not a Next-Gen attendance code')
  return { sessionId: match[1], code: match[2] }
}
