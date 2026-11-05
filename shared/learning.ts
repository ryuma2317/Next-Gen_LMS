export type LearningClass = { id: string; title: string; room: string; can_edit: boolean; can_grade: boolean; is_trainer: boolean; is_student: boolean; mfa_ready: boolean }
export type Lesson = { id: string; section_id: string; title: string; body_text: string; resource_url: string | null; state: 'draft' | 'published'; version: number }
export type AssignmentFields = {
  title: string; instructions: string; submission_mode: 'individual' | null;
  response_format: 'text' | 'link' | 'text_and_link' | 'text_or_link' | null;
  opens_at: string | null; deadline_mode: 'none' | 'at' | null; due_at: string | null;
  late_mode: 'not_applicable' | 'reject' | 'accept_flagged' | null;
  max_attempts: number | null; max_score_units: number | null;
}
export type Assignment = AssignmentFields & { id: string; section_id: string; state: 'draft' | 'published' | 'closed'; version: number }
export type WorkSubmission = {
  id: string; user_id: string; display_name: string; body_text: string; resource_url: string | null;
  attempt: number; submitted_at: string; is_late: boolean; score_units: number | null;
  feedback: string | null; grade_version: number; has_unpublished_changes: boolean; grade_is_published: boolean; is_latest: boolean;
}
export const plainText = (v: unknown, max = 10000): v is string => typeof v === 'string' && v.length <= max && new TextEncoder().encode(v).length <= 12000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)
export function safeResourceUrl(value: unknown): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(value)) throw new Error('Use a valid HTTPS resource link')
  let url: URL
  try { url = new URL(value) } catch { throw new Error('Use a valid HTTPS resource link') }
  if (url.protocol !== 'https:' || url.username || url.password || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(url.hostname)) throw new Error('Use an HTTPS link without embedded credentials')
  const canonical = url.toString()
  if (canonical.length > 2048) throw new Error('Resource link is too long')
  return canonical
}
export function scoreToUnits(value: string): number {
  const match = /^(\d{1,5})(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) throw new Error('Use a non-negative score with at most two decimal places')
  const result = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  if (result > 1000000) throw new Error('Score is too large')
  return result
}
export const formatScore = (units: number) => (units / 100).toFixed(2)
export function validateLesson(value: unknown): { title: string; body_text: string; resource_url: string | null } {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'body_text,resource_url,title') throw new Error('Unexpected lesson fields')
  const v = value as Record<string, unknown>
  if (!plainText(v.title, 160) || !v.title.trim() || !plainText(v.body_text)) throw new Error('Check lesson title and text length')
  return { title: v.title.trim(), body_text: v.body_text, resource_url: safeResourceUrl(v.resource_url) }
}
export function validateAssignment(value: unknown): AssignmentFields {
  const keys = ['title', 'instructions', 'submission_mode', 'response_format', 'opens_at', 'deadline_mode', 'due_at', 'late_mode', 'max_attempts', 'max_score_units']
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== keys.sort().join(',')) throw new Error('Unexpected assignment fields')
  const v = value as Record<string, unknown>
  if (!plainText(v.title, 160) || !v.title.trim() || !plainText(v.instructions, 8000)) throw new Error('Check assignment title and instructions')
  for (const [key, allowed] of Object.entries({ submission_mode: ['individual'], response_format: ['text', 'link', 'text_and_link', 'text_or_link'], deadline_mode: ['none', 'at'], late_mode: ['not_applicable', 'reject', 'accept_flagged'] })) {
    if (v[key] !== null && !allowed.includes(String(v[key]))) throw new Error(`Choose a supported ${key.replaceAll('_', ' ')}`)
  }
  for (const key of ['opens_at', 'due_at']) if (v[key] !== null && (typeof v[key] !== 'string' || !Number.isFinite(Date.parse(v[key] as string)))) throw new Error('Use valid assignment timestamps')
  if (v.max_attempts !== null && (!Number.isSafeInteger(v.max_attempts) || Number(v.max_attempts) < 1 || Number(v.max_attempts) > 20)) throw new Error('Choose 1–20 submitted versions')
  if (v.max_score_units !== null && (!Number.isSafeInteger(v.max_score_units) || Number(v.max_score_units) < 1 || Number(v.max_score_units) > 1000000)) throw new Error('Choose a positive maximum score')
  return { ...v, title: (v.title as string).trim() } as AssignmentFields
}
export function publicationProblems(a: AssignmentFields, now = Date.now()): string[] {
  const errors: string[] = []
  if (!a.instructions.trim()) errors.push('Add assignment instructions')
  if (a.submission_mode !== 'individual') errors.push('Choose the individual submission mode; group work is not available yet')
  if (!a.response_format) errors.push('Choose a response format')
  if (!a.opens_at || !Number.isFinite(Date.parse(a.opens_at))) errors.push('Choose an opening time')
  if (!a.max_attempts || !a.max_score_units) errors.push('Choose allowed versions and maximum score')
  if (a.deadline_mode === 'at') {
    if (!a.due_at || !Number.isFinite(Date.parse(a.due_at)) || Date.parse(a.due_at) <= Math.max(now, Date.parse(a.opens_at ?? '') || now)) errors.push('Choose a future deadline after opening')
    if (!['reject', 'accept_flagged'].includes(a.late_mode ?? '')) errors.push('Choose how late submissions are handled')
  } else if (a.deadline_mode === 'none') {
    if (a.due_at !== null || a.late_mode !== 'not_applicable') errors.push('No-deadline work must have no due date or late policy')
  } else errors.push('Explicitly choose a deadline or no deadline')
  return errors
}
export function validateWork(text: unknown, link: unknown, format: AssignmentFields['response_format']) {
  if (!plainText(text)) throw new Error('Check the response length and characters')
  const url = safeResourceUrl(link), hasText = !!text.trim(), hasLink = url !== null
  if ((format === 'text' && (!hasText || hasLink)) || (format === 'link' && (!hasLink || hasText)) || (format === 'text_and_link' && (!hasText || !hasLink)) || (format === 'text_or_link' && !hasText && !hasLink) || !format) throw new Error('Your response does not match the assignment format')
  return { body_text: text, resource_url: url }
}
