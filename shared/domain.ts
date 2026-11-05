export const roleNames = ['Trainee', 'Trainer', 'Volunteer', 'Organizer', 'Admin', 'Super admin', 'Mentor', 'Advisor', 'Guest juror', 'Audience', 'Applicant'] as const
export type Role = typeof roleNames[number]
export type Section = { id: string; offering_id: string; title: string; department: string; kind: 'core' | 'elective'; capacity: number; enrolled: number; day: string; room: string; trainer: string }
export type Edition = { id: string; name: string; selection_open: boolean; core_limit: number; elective_limit: number }
export function attendancePoints(unexcusedSessions: number, approvedLeaveSessions: number) {
  if (![unexcusedSessions, approvedLeaveSessions].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Session counts must be non-negative integers')
  return (unexcusedSessions * 2 + approvedLeaveSessions) / 4
}
export const attendancePasses = (points: number) => Number.isFinite(points) && points >= 0 && points < 3
export function audienceWinner(votes: { teamId: string; votes: number }[], juryWinners: string[]) {
  if (juryWinners.length !== 5 || new Set(juryWinners).size !== 5) throw new Error('Five distinct jury winners are required')
  if (new Set(votes.map(v => v.teamId)).size !== votes.length || votes.some(v => !Number.isSafeInteger(v.votes) || v.votes < 0)) throw new Error('Invalid tally')
  const eligible = votes.filter(v => !juryWinners.includes(v.teamId)).sort((a,b) => b.votes-a.votes)
  if (!eligible.length) return { status: 'no-eligible-team' as const }
  if (eligible[0].votes===0) return { status: 'no-eligible-votes' as const }
  if (eligible[1]?.votes === eligible[0].votes) return { status: 'tie' as const }
  return { status: 'winner' as const, teamId: eligible[0].teamId }
}
