import { uuidPattern } from './admissions.ts'
import { plainText } from './learning.ts'
export type ProjectRole = 'participant' | 'mentor' | 'advisor'
export type ProjectColumn = { id: string; title: string; complete: boolean }
export type ProjectFields = { title: string; theme: string; columns: ProjectColumn[]; limits: Record<ProjectRole, number> }
export type ProjectSummary = { id: string; title: string; theme: string; archived: boolean; version: number }
export type ProjectMember = { user_id: string; display_name: string; role: ProjectRole; active: boolean; version: number; can_tasks: boolean; can_comment: boolean; can_sprints: boolean }
export type ProjectSprint = { id: string; title: string; goal: string; starts_at: string; ends_at: string; state: 'planned' | 'active' | 'closed'; version: number }
export type ProjectBoard = ProjectSummary & { columns: ProjectColumn[]; limits: Record<ProjectRole, number>; can_manage: boolean; can_tasks: boolean; can_comment: boolean; can_sprints: boolean; members: ProjectMember[]; sprints: ProjectSprint[] }
export type TaskFields = { title: string; description: string; column_id: string; assignee_id: string | null; sprint_id: string | null }
export type ProjectTask = TaskFields & { id: string; project_id: string; version: number; archived: boolean; created_at: string; updated_at: string }
export type ProjectThread = { comments: { id: string; author: string; body: string; created_at: string }[]; changes: { version: number; actor: string; action: string; created_at: string }[] }
export const projectShape = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',')
export const projectRevision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647
export const projectID = (value: unknown): value is string => typeof value === 'string' && uuidPattern.test(value)
export const projectKey = (value: unknown): value is string => typeof value === 'string' && /^(?!(?:constructor|prototype)$)[a-z][a-z0-9_]{0,39}$/.test(value)
const requiredText = (value: unknown, max: number) => plainText(value, max) && !!value.trim()
export function validateProject(value: unknown): ProjectFields {
 if (!projectShape(value, ['title','theme','columns','limits']) || !requiredText(value.title,160) || !plainText(value.theme,3000) || !Array.isArray(value.columns) || value.columns.length < 2 || value.columns.length > 8 || !projectShape(value.limits,['participant','mentor','advisor'])) throw new Error('Configure a title, theme, 2–8 columns and all membership limits')
 const seen = new Set<string>()
 for (const column of value.columns) {
  if (!projectShape(column,['id','title','complete']) || !projectKey(column.id) || seen.has(column.id) || !requiredText(column.title,60) || typeof column.complete !== 'boolean') throw new Error('Use unique column IDs, names and explicit completion settings')
  seen.add(column.id)
 }
 for (const role of ['participant','mentor','advisor']) {
  const limit=value.limits[role]
  if (!projectRevision(limit) || limit > 100 || (role === 'participant' && limit < 1)) throw new Error('Set each capacity explicitly (participants 1–100; mentors/advisors 0–100)')
 }
 return value as ProjectFields
}
export function validateTask(value: unknown): TaskFields {
 if (!projectShape(value,['title','description','column_id','assignee_id','sprint_id']) || !requiredText(value.title,160) || !plainText(value.description,6000) || !projectKey(value.column_id) || !(value.assignee_id === null || projectID(value.assignee_id)) || !(value.sprint_id === null || projectID(value.sprint_id))) throw new Error('Check task title, text, column and assignment references')
 return value as TaskFields
}
export function validateMember(value: unknown) {
 if (!projectShape(value,['userId','version','role','active','canTasks','canComment','canSprints','reason']) || !projectID(value.userId) || !projectRevision(value.version) || !['participant','mentor','advisor'].includes(String(value.role)) || ['active','canTasks','canComment','canSprints'].some(key=>typeof value[key] !== 'boolean') || !requiredText(value.reason,1000)) throw new Error('Valid member, revision, project role, explicit permissions and reason required')
 return value
}
export function validateSprint(value: unknown) {
 if (!projectShape(value,['title','goal','startsAt','endsAt']) || !requiredText(value.title,160) || !plainText(value.goal,3000) || typeof value.startsAt !== 'string' || typeof value.endsAt !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value.startsAt) || !/^\d{4}-\d\d-\d\dT/.test(value.endsAt) || !Number.isFinite(Date.parse(value.startsAt)) || !Number.isFinite(Date.parse(value.endsAt)) || Date.parse(value.endsAt) <= Date.parse(value.startsAt)) throw new Error('Set a sprint title, goal and end time after start')
 return value
}
