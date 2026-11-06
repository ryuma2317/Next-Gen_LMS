import { Hono, type Context } from 'hono'
import type { Env } from './types'
import { projectID, projectRevision, projectShape, validateProject, validateTask, validateMember, validateSprint } from '../shared/projects'
import { plainText } from '../shared/learning'
export const projects = new Hono<Env>()
const reason = (v: unknown) => plainText(v,1000) && !!v.trim()
const pageOffset = (c: Context<Env>) => {
 const offset=c.req.query('offset') ?? '0'
 return /^\d{1,5}$/.test(offset) && Number(offset)<=10000 && Object.keys(c.req.query()).every(k=>k==='offset') ? Number(offset) : null
}
projects.use('*',async(c,next)=>{
 if(c.req.method==='POST'&&!c.req.header('Content-Type')?.startsWith('application/json')) return c.json({error:'JSON required'},415)
 await next()
})
projects.get('/editions/:id/projects',async c=>{
 if(!projectID(c.req.param('id'))) return c.json({error:'Invalid edition'},400)
 const r=await c.get('db').rpc('project_list',{p_edition:c.req.param('id')})
 return r.error?c.json({error:'Unable to load projects'},503):c.json(r.data)
})
projects.get('/projects/:id',async c=>{
 if(!projectID(c.req.param('id'))) return c.json({error:'Invalid project'},400)
 const r=await c.get('db').rpc('project_board',{p_project:c.req.param('id')})
 return r.error?c.json({error:'Project unavailable. Check active membership, assigned access and MFA when required.'},403):c.json(r.data)
})
projects.get('/projects/:id/tasks',async c=>{
 const offset=pageOffset(c)
 if(!projectID(c.req.param('id'))||offset===null) return c.json({error:'Invalid project or page'},400)
 const r=await c.get('db').rpc('project_tasks_page',{p_project:c.req.param('id'),p_offset:offset})
 return r.error?c.json({error:'Tasks unavailable'},403):c.json(r.data)
})
projects.get('/projects/:id/candidates',async c=>{
 const offset=pageOffset(c)
 if(!projectID(c.req.param('id'))||offset===null) return c.json({error:'Invalid project or page'},400)
 const r=await c.get('db').rpc('project_candidates',{p_project:c.req.param('id'),p_offset:offset})
 return r.error?c.json({error:'Assigned project management and MFA are required'},403):c.json(r.data)
})
projects.get('/project-tasks/:id/thread',async c=>{
 if(!projectID(c.req.param('id'))) return c.json({error:'Invalid task'},400)
 const r=await c.get('db').rpc('project_task_thread',{p_task:c.req.param('id')})
 return r.error?c.json({error:'Task discussion unavailable'},403):c.json(r.data)
})
projects.post('/editions/:id/projects',async c=>{
 const b:unknown=await c.req.json().catch(()=>null)
 if(!projectID(c.req.param('id'))||!projectShape(b,['id','version','project'])||!projectID(b.id)||!projectRevision(b.version)) return c.json({error:'Valid project reference and revision required'},400)
 let fields
 try { fields=validateProject(b.project) } catch(e){return c.json({error:(e as Error).message},400)}
 const r=await c.get('db').rpc('save_project',{p_id:b.id,p_edition:c.req.param('id'),p_version:b.version,p_fields:fields})
 return r.error?c.json({error:'Project save unavailable. Check assigned management, MFA, revision, used columns and current capacity.'},409):c.json({id:r.data})
})
projects.post('/projects/:id/members',async c=>{
 const b:unknown=await c.req.json().catch(()=>null)
 if(!projectID(c.req.param('id')))return c.json({error:'Invalid project'},400)
 let member
 try { member=validateMember(b) } catch(e){return c.json({error:(e as Error).message},400)}
 const r=await c.get('db').rpc('save_project_member',{p_project:c.req.param('id'),p_user:member.userId,p_version:member.version,p_role:member.role,p_active:member.active,p_tasks:member.canTasks,p_comment:member.canComment,p_sprints:member.canSprints,p_reason:member.reason})
 return r.error?c.json({error:'Membership save unavailable. Check active edition membership, explicit capacity, MFA, permission and revision.'},409):c.json({status:'saved'})
})
projects.post('/projects/:id/archive',async c=>{
 const b:unknown=await c.req.json().catch(()=>null)
 if(!projectID(c.req.param('id'))||!projectShape(b,['version','reason'])||!projectRevision(b.version)||b.version===0||!reason(b.reason))return c.json({error:'Current project revision and archive reason required'},400)
 const r=await c.get('db').rpc('archive_project',{p_project:c.req.param('id'),p_version:b.version,p_reason:b.reason})
 return r.error?c.json({error:'Archive unavailable. Check management permission, MFA and current revision.'},409):c.json({status:'saved'})
})
projects.post('/projects/:id/tasks',async c=>{
 const b:unknown=await c.req.json().catch(()=>null)
 if(!projectID(c.req.param('id'))||!projectShape(b,['id','version','task'])||!projectID(b.id)||!projectRevision(b.version))return c.json({error:'Valid task reference and revision required'},400)
 let fields
 try { fields=validateTask(b.task) } catch(e){return c.json({error:(e as Error).message},400)}
 const r=await c.get('db').rpc('save_project_task',{p_id:b.id,p_project:c.req.param('id'),p_version:b.version,p_fields:fields})
 return r.error?c.json({error:'Task save unavailable. Keep unsaved edits and check permission, current revision, column, assignee and sprint.'},409):c.json({id:r.data})
})
projects.post('/project-tasks/:id/archive',async c=>{
 const b:unknown=await c.req.json().catch(()=>null)
 if(!projectID(c.req.param('id'))||!projectShape(b,['version','reason'])||!projectRevision(b.version)||b.version===0||!reason(b.reason))return c.json({error:'Current task revision and archive reason required'},400)
 const r=await c.get('db').rpc('archive_project_task',{p_task:c.req.param('id'),p_version:b.version,p_reason:b.reason})
 return r.error?c.json({error:'Task archive unavailable. Check permission, revision and project state.'},409):c.json({status:'saved'})
})
projects.post('/project-tasks/:id/comments',async c=>{
 const b:unknown=await c.req.json().catch(()=>null)
 if(!projectID(c.req.param('id'))||!projectShape(b,['id','body'])||!projectID(b.id)||!plainText(b.body,3000)||!b.body.trim())return c.json({error:'Valid comment reference and plain text required'},400)
 const r=await c.get('db').rpc('comment_project_task',{p_id:b.id,p_task:c.req.param('id'),p_body:b.body})
 return r.error?c.json({error:'Comment unavailable. Check assigned access, active membership and project state.'},409):c.json({status:'saved'})
})
projects.post('/projects/:id/sprints',async c=>{
 const b:unknown=await c.req.json().catch(()=>null)
 if(!projectID(c.req.param('id'))||!projectShape(b,['id','version','sprint'])||!projectID(b.id)||!projectRevision(b.version))return c.json({error:'Valid sprint reference and revision required'},400)
 let fields
 try { fields=validateSprint(b.sprint) } catch(e){return c.json({error:(e as Error).message},400)}
 const r=await c.get('db').rpc('save_project_sprint',{p_id:b.id,p_project:c.req.param('id'),p_version:b.version,p_title:fields.title,p_goal:fields.goal,p_starts:fields.startsAt,p_ends:fields.endsAt})
 return r.error?c.json({error:'Sprint save unavailable. Check planning permission, revision, project state and dates.'},409):c.json({id:r.data})
})
projects.post('/project-sprints/:id/:action',async c=>{
 const action=c.req.param('action'),b:unknown=await c.req.json().catch(()=>null)
 if(!['start','close'].includes(action))return c.json({error:'Unknown sprint action'},404)
 if(!projectID(c.req.param('id'))||!projectShape(b,['version','reason'])||!projectRevision(b.version)||b.version===0||!reason(b.reason))return c.json({error:'Current sprint revision and reason required'},400)
 const r=await c.get('db').rpc('transition_project_sprint',{p_sprint:c.req.param('id'),p_version:b.version,p_action:action,p_reason:b.reason})
 return r.error?c.json({error:'Sprint action unavailable. Check planning permission, revision and current sprint state; only one sprint may be active.'},409):c.json({status:'saved'})
})
