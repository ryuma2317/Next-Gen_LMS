import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Role } from '../shared/domain'
import { validateTask, type ProjectBoard, type ProjectFields, type ProjectSummary, type ProjectTask, type ProjectThread, type TaskFields, type ProjectSprint } from '../shared/projects'
import { api } from './lib'
import { MfaPanel } from './MfaPanel'
import { MemberEditor, ProjectEditor, SprintEditor } from './projects/Editors'
import { previewBoard, previewTasks, sampleProject } from './projects/demo'
import './projects.css'
const fieldsOf=(task:ProjectTask):TaskFields=>({title:task.title,description:task.description,column_id:task.column_id,assignee_id:task.assignee_id,sprint_id:task.sprint_id})
type Candidate={user_id:string;display_name:string;roles:string[]}
export function Projects({session,edition,role}:{session:Session|null;edition:string;role:Role}){
 const [list,setList]=useState<ProjectSummary[]>(session?[]:[previewBoard(role)]),[canManage,setCanManage]=useState(!session&&previewBoard(role).can_manage)
 const [project,setProject]=useState(session?'':sampleProject),[board,setBoard]=useState<ProjectBoard|null>(session?null:previewBoard(role)),[tasks,setTasks]=useState<ProjectTask[]>(session?[]:previewTasks())
 const [offset,setOffset]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[refresh,setRefresh]=useState(0)
 const [editingProject,setEditingProject]=useState<'new'|'edit'|null>(null),[editingSprint,setEditingSprint]=useState<ProjectSprint|null|undefined>(undefined)
 const [draft,setDraft]=useState<{id:string;version:number;fields:TaskFields}|null>(null)
 const [selected,setSelected]=useState(''),[thread,setThread]=useState<ProjectThread|null>(null),[threads,setThreads]=useState<Record<string,ProjectThread>>({})
 const [comment,setComment]=useState(''),[actionReason,setActionReason]=useState(''),[showArchived,setShowArchived]=useState(false),[sprintFilter,setSprintFilter]=useState('all')
 const [candidates,setCandidates]=useState<Candidate[]>([]),[candidateOffset,setCandidateOffset]=useState(0)
 const pendingComment=useRef<{id:string;task:string;body:string}|null>(null),epoch=useRef(0),loadedProject=useRef('')
 useEffect(()=>{
  let cancelled=false
  if(!session||!edition)return
  setBusy(true);setCanManage(false)
  void api<{can_manage:boolean;projects:ProjectSummary[]}>('/editions/'+edition+'/projects',session.access_token).then(result=>{
   if(cancelled)return
   setList(result.projects);setCanManage(result.can_manage);if(!result.can_manage)setEditingProject(null);setProject(previous=>result.projects.some(p=>p.id===previous)?previous:result.projects[0]?.id??'')
  }).catch(e=>{if(!cancelled)setMessage(e.message)}).finally(()=>{if(!cancelled)setBusy(false)})
  return()=>{cancelled=true}
 },[session?.access_token,edition])
 useEffect(()=>{
  if(!session)return
  if(!project){setBoard(null);setTasks([]);setSelected('');setThread(null);pendingComment.current=null;return}
  const generation=++epoch.current;setBusy(true)
  if(loadedProject.current!==project){loadedProject.current=project;setBoard(null);setTasks([]);setSelected('');setThread(null);setComment('');setCandidates([]);setCandidateOffset(0)}
  void Promise.all([api<ProjectBoard>('/projects/'+project,session.access_token),api<ProjectTask[]>('/projects/'+project+'/tasks?offset='+offset,session.access_token)]).then(([next,rows])=>{
   if(epoch.current===generation){setBoard(next);setTasks(rows)}
  }).catch(e=>{if(epoch.current===generation){setBoard(null);setTasks([]);setThread(null);setMessage(e.message)}}).finally(()=>{if(epoch.current===generation)setBusy(false)})
  return()=>{epoch.current++}
 },[session?.access_token,project,offset,refresh])
 async function reload(){
  if(!session||!project)return
  const generation=epoch.current
  const [next,rows]=await Promise.all([api<ProjectBoard>('/projects/'+project,session.access_token),api<ProjectTask[]>('/projects/'+project+'/tasks?offset='+offset,session.access_token)])
  if(epoch.current===generation){setBoard(next);setTasks(rows);setList(current=>current.map(p=>p.id===next.id?next:p))}
 }
 async function run(action:()=>Promise<void>){
  if(busy)return;setBusy(true);setMessage('');const generation=epoch.current
  try{await action()}catch(e){if(epoch.current===generation)setMessage((e as Error).message+' Your unsaved form is retained. Refresh permitted data and review the latest revision before retrying.')}
  finally{if(epoch.current===generation)setBusy(false)}
 }
 async function saveProject(id:string,version:number,fields:ProjectFields){
  await run(async()=>{
   if(session){await api('/editions/'+edition+'/projects',session.access_token,{id,version,project:fields});const result=await api<{can_manage:boolean;projects:ProjectSummary[]}>('/editions/'+edition+'/projects',session.access_token);setList(result.projects);setProject(id);setRefresh(v=>v+1)}
   else{const next={...(board??previewBoard(role)),id,...fields,version:version+1};setBoard(next);setList([next]);setProject(id)}
   setEditingProject(null);setMessage(session?'Project setup saved.':'Sample project setup saved.')
  })
 }
 async function persistTask(id:string,version:number,fields:TaskFields){
  if(!board?.can_tasks||board.archived)throw new Error('Assigned task permission is required')
  validateTask(fields)
  if(session){await api('/projects/'+project+'/tasks',session.access_token,{id,version,task:fields});await reload()}
  else{
   const previous=tasks.find(t=>t.id===id)
   if(previous&&previous.version!==version)throw new Error('Stale task revision')
   const time=new Date().toISOString(),next:ProjectTask={id,project_id:project,...fields,version:version+1,archived:false,created_at:previous?.created_at??time,updated_at:time}
   setTasks(rows=>previous?rows.map(t=>t.id===id?next:t):[...rows,next])
   setThreads(all=>({...all,[id]:{comments:all[id]?.comments??[],changes:[{version:next.version,actor:'You (sample)',action:previous?'updated':'created',created_at:time},...(all[id]?.changes??[])]}}))
  }
 }
 async function saveTask(e:FormEvent){e.preventDefault();if(!draft)return;await run(async()=>{await persistTask(draft.id,draft.version,draft.fields);setDraft(null);setMessage(session?'Task saved.':'Sample task saved.')})}
 async function viewThread(task:ProjectTask){
  await run(async()=>{const result=session?await api<ProjectThread>('/project-tasks/'+task.id+'/thread',session.access_token):threads[task.id]??{comments:[],changes:[{version:task.version,actor:'River Demo',action:'created',created_at:task.created_at}]};setSelected(task.id);setThread(result);setComment('');pendingComment.current=null})
 }
 async function postComment(e:FormEvent){
  e.preventDefault();if(!selected||!board?.can_comment)return
  await run(async()=>{
   const pending=pendingComment.current
   const id=pending&&pending.task===selected&&pending.body===comment?pending.id:crypto.randomUUID()
   pendingComment.current={id,task:selected,body:comment}
   if(session){await api('/project-tasks/'+selected+'/comments',session.access_token,{id,body:comment});setThread(await api<ProjectThread>('/project-tasks/'+selected+'/thread',session.access_token))}
   else{const next={comments:[{id,author:'You (sample)',body:comment,created_at:new Date().toISOString()},...(thread?.comments??[])],changes:thread?.changes??[]};setThreads(all=>({...all,[selected]:next}));setThread(next)}
   setComment('');pendingComment.current=null;setMessage(session?'Comment saved.':'Sample comment saved.')
  })
 }
 async function saveSprint(id:string,version:number,fields:Record<string,unknown>){
  await run(async()=>{
   if(session){await api('/projects/'+project+'/sprints',session.access_token,{id,version,sprint:fields});await reload()}
   else if(board){const sprint:ProjectSprint={id,title:String(fields.title),goal:String(fields.goal),starts_at:String(fields.startsAt),ends_at:String(fields.endsAt),state:'planned',version:version+1};setBoard({...board,sprints:[...board.sprints.filter(s=>s.id!==id),sprint]})}
   setEditingSprint(undefined);setMessage(session?'Sprint plan saved.':'Sample sprint plan saved.')
  })
 }
 async function transitionSprint(sprint:ProjectSprint,action:'start'|'close'){
  await run(async()=>{
   if(!actionReason.trim())throw new Error('Enter an action reason')
   if(session){await api('/project-sprints/'+sprint.id+'/'+action,session.access_token,{version:sprint.version,reason:actionReason});await reload()}
   else if(board){if(action==='start'&&board.sprints.some(s=>s.state==='active'))throw new Error('Close the active sprint first');setBoard({...board,sprints:board.sprints.map(s=>s.id===sprint.id?{...s,state:action==='start'?'active':'closed',version:s.version+1}:s)})}
   setMessage(action==='close'?'Sprint closed. Incomplete tasks remain linked for review.':'Sprint started.');setActionReason('')
  })
 }
 const activeTask=tasks.find(t=>t.id===selected),latestDraft=tasks.find(t=>t.id===draft?.id)
 const visibleTasks=tasks.filter(t=>(showArchived||!t.archived)&&(sprintFilter==='all'||(sprintFilter==='none'?t.sprint_id===null:t.sprint_id===sprintFilter)))
 const activeCount=board?.members.filter(m=>m.active).length??0
 return <section className="project-workspace" aria-label="Project workspace">
  <div className="project-intro"><h2>Build something together.</h2><p>Project teams, tasks and feedback stay separate from morning teaching assignments.</p></div>
  {!session&&<p className="notice">Synthetic project preview. Example permissions and capacities are not live annual policy.</p>}
  {session&&<details className="project-panel"><summary>Privileged project access and MFA</summary><p>Project administration requires an explicitly assigned edition capability and MFA. A preview role or school email grants no access.</p><MfaPanel/></details>}
  {message&&<p className="feedback" role="status">{message}</p>}
  <div className="project-actions"><label>Project<select value={project} disabled={busy} onChange={e=>{setProject(e.target.value);setOffset(0);setDraft(null);setEditingProject(null);setEditingSprint(undefined);setSelected('');setThread(null)}}>{list.map(p=><option key={p.id} value={p.id}>{p.title}{p.archived?' · Archived':''}</option>)}</select></label><button className="secondary-button" disabled={busy||!project} onClick={()=>{if(session)setRefresh(v=>v+1);else setMessage('Sample project data is current.')}}>Refresh project</button>{canManage&&<button className="primary-button" disabled={busy||!edition&&!!session} onClick={()=>setEditingProject('new')}>Create project</button>}</div>
  {busy&&<p role="status">Loading project work…</p>}
  {!busy&&!list.length&&<div className="empty"><h3>No assigned projects</h3><p>Only assigned projects or explicitly authorized oversight are visible. Contact the organizer if a project assignment is missing.</p></div>}
  {editingProject&&<ProjectEditor key={editingProject+(board?.id??'')} board={editingProject==='edit'?board:null} busy={busy} onSave={saveProject} onCancel={()=>setEditingProject(null)}/>}
  {board&&<>
   <div className="project-panel"><div className="project-actions"><h2>{board.title}</h2><span className="pill light">{board.archived?'Read-only archive':activeCount+' active assignments'}</span>{board.can_manage&&!board.archived&&<button className="secondary-button" disabled={busy} onClick={()=>setEditingProject('edit')}>Edit project setup</button>}</div><p className="project-text">{board.theme||'No theme supplied yet.'}</p><p className="muted">Access assignments do not finalize team composition. Department quotas, self-service formation and finalization remain pending.</p><ul className="project-roster">{board.members.map(m=><li key={m.user_id}>{m.display_name} · {m.role}{!m.active?' · access revoked':''}</li>)}</ul></div>
   {board.can_manage&&<MemberEditor key={board.id+board.members.map(m=>m.version).join(':')} members={board.members} busy={busy} candidates={candidates} onCandidates={()=>void run(async()=>{const rows=session?await api<Candidate[]>('/projects/'+project+'/candidates?offset='+candidateOffset,session.access_token):board.members.map(m=>({user_id:m.user_id,display_name:m.display_name,roles:[m.role]}));setCandidates(current=>[...new Map([...current,...rows].map(m=>[m.user_id,m])).values()]);setCandidateOffset(v=>v+50);setMessage(rows.length?'Loaded the next member page.':'No more active edition members.')})} onSave={fields=>run(async()=>{if(session){await api('/projects/'+project+'/members',session.access_token,fields);await reload()}else{const existing=board.members.find(m=>m.user_id===fields.userId);const next={user_id:String(fields.userId),display_name:existing?.display_name??'New Demo Member',role:fields.role as 'participant'|'mentor'|'advisor',active:!!fields.active,version:Number(fields.version)+1,can_tasks:!!fields.canTasks,can_comment:!!fields.canComment,can_sprints:!!fields.canSprints};setBoard({...board,members:[...board.members.filter(m=>m.user_id!==next.user_id),next]})}setMessage(session?'Project access saved.':'Sample project access saved.')})}/>}
   {board.archived&&<p className="notice">This project is read-only. An authorized manager can still revoke access by saving an inactive membership with all permissions unchecked.</p>}
   <div className="project-actions"><h3>Work board</h3>{board.can_tasks&&<button className="primary-button" disabled={busy} onClick={()=>setDraft({id:crypto.randomUUID(),version:0,fields:{title:'',description:'',column_id:board.columns[0].id,assignee_id:null,sprint_id:null}})}>New task</button>}<label>Sprint view<select value={sprintFilter} onChange={e=>setSprintFilter(e.target.value)}><option value="all">All work on this page</option><option value="none">Not assigned to a sprint</option>{board.sprints.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><label className="project-check"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Show archived tasks</label></div>
   {draft&&<form className="project-panel" onSubmit={saveTask}><h3>{draft.version?'Edit task':'Create task'}</h3>{latestDraft&&latestDraft.version!==draft.version&&<p role="alert">The saved task changed. Your edits remain here. Copy any changes you want to keep before loading the latest saved version.</p>}<fieldset disabled={busy||!board.can_tasks}><label>Task title<input required maxLength={160} value={draft.fields.title} onChange={e=>setDraft({...draft,fields:{...draft.fields,title:e.target.value}})}/></label><label>Task description<textarea rows={4} maxLength={6000} value={draft.fields.description} onChange={e=>setDraft({...draft,fields:{...draft.fields,description:e.target.value}})}/></label><div className="project-grid"><label>Task column<select value={draft.fields.column_id} onChange={e=>setDraft({...draft,fields:{...draft.fields,column_id:e.target.value}})}>{board.columns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Task assignee<select value={draft.fields.assignee_id??''} onChange={e=>setDraft({...draft,fields:{...draft.fields,assignee_id:e.target.value||null}})}><option value="">Unassigned</option>{board.members.filter(m=>m.role==='participant').map(m=><option key={m.user_id} disabled={!m.active} value={m.user_id}>{m.display_name}{m.active?'':' · inactive'}</option>)}</select></label><label>Task sprint<select value={draft.fields.sprint_id??''} onChange={e=>setDraft({...draft,fields:{...draft.fields,sprint_id:e.target.value||null}})}><option value="">Backlog / no sprint</option>{board.sprints.map(s=><option key={s.id} disabled={s.state==='closed'} value={s.id}>{s.title} · {s.state}</option>)}</select></label></div><div className="project-actions"><button className="primary-button">Save task</button>{latestDraft&&<button type="button" className="secondary-button" onClick={()=>setDraft({id:latestDraft.id,version:latestDraft.version,fields:fieldsOf(latestDraft)})}>Load latest saved task</button>}<button type="button" className="secondary-button" onClick={()=>setDraft(null)}>Cancel task edit</button></div></fieldset></form>}
   <p className="muted">Showing {visibleTasks.length} tasks from rows {offset+1}–{offset+tasks.length}. Filters and column counts apply to this page.</p>
   <div className="project-board" role="region" aria-label="Project task columns" tabIndex={0}>{board.columns.map(column=><section className="project-column" key={column.id}><h3>{column.title}<span>{visibleTasks.filter(t=>t.column_id===column.id).length}</span></h3>{visibleTasks.filter(t=>t.column_id===column.id).map(task=><article className="project-task" key={task.id}><h4>{task.title}</h4><p className="project-text">{task.description}</p><p className="muted">{board.members.find(m=>m.user_id===task.assignee_id)?.display_name??'Unassigned'} · v{task.version}{task.archived?' · Archived':''}</p>{board.can_tasks&&!task.archived&&<><label>Column for {task.title}<select disabled={busy} value={task.column_id} onChange={e=>void run(async()=>{await persistTask(task.id,task.version,{...fieldsOf(task),column_id:e.target.value});setMessage(session?'Task moved.':'Sample task moved.')})}>{board.columns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><button className="text-button" disabled={busy} onClick={()=>setDraft({id:task.id,version:task.version,fields:fieldsOf(task)})}>Edit {task.title}</button></>}<button className="text-button" disabled={busy} onClick={()=>void viewThread(task)}>Discussion and history: {task.title}</button></article>)}</section>)}</div>
   <div className="project-actions"><button className="secondary-button" disabled={busy||offset===0||!session} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous task page</button><button className="secondary-button" disabled={busy||tasks.length<50||offset>=10000||!session} onClick={()=>setOffset(offset+50)}>Next task page</button></div>
   {activeTask&&thread&&<section className="project-panel"><h3>Discussion: {activeTask.title}</h3>{board.can_comment&&!activeTask.archived&&<form onSubmit={postComment}><label>Project comment<textarea required maxLength={3000} value={comment} onChange={e=>setComment(e.target.value)}/></label><button className="primary-button" disabled={busy}>Post comment</button></form>}<h4>Latest comments</h4>{!thread.comments.length&&<p>No comments yet.</p>}{thread.comments.map(c=><article className="project-comment" key={c.id}><strong>{c.author}</strong><time>{new Date(c.created_at).toLocaleString()}</time><p className="project-text">{c.body}</p></article>)}<h4>Change history</h4><ol>{thread.changes.map(c=><li key={c.version}>v{c.version} · {c.action} · {c.actor} · {new Date(c.created_at).toLocaleString()}</li>)}</ol><p className="muted">Latest 100 comments and 50 changes. Stored history is preserved.</p></section>}
   <section className="project-panel"><div className="project-actions"><h3>Sprints</h3>{board.can_sprints&&<button className="secondary-button" disabled={busy} onClick={()=>setEditingSprint(null)}>Plan a sprint</button>}</div><p>Start and close sprints explicitly. Closing keeps incomplete tasks linked for review; nothing is silently moved or counted as finished.</p>{board.sprints.map(s=><article className="project-sprint" key={s.id}><h4>{s.title} · {s.state}</h4><p className="project-text">{s.goal}</p><p>{new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleString()}</p>{board.can_sprints&&<div className="project-actions">{s.state==='planned'&&<><button className="secondary-button" disabled={busy} onClick={()=>setEditingSprint(s)}>Edit {s.title}</button><button className="secondary-button" disabled={busy||board.sprints.some(s=>s.state==='active')||!actionReason.trim()} onClick={()=>void transitionSprint(s,'start')}>Start {s.title}</button></>}{s.state==='active'&&<button className="secondary-button" disabled={busy||!actionReason.trim()} onClick={()=>void transitionSprint(s,'close')}>Close {s.title}</button>}</div>}</article>)}</section>
   {editingSprint!==undefined&&<SprintEditor key={editingSprint?.id??'new'} sprint={editingSprint} busy={busy} onSave={saveSprint} onCancel={()=>setEditingSprint(undefined)}/>}
   {(board.can_tasks||board.can_sprints||board.can_manage)&&!board.archived&&<section className="project-panel"><h3>Reasoned actions</h3><label>Action reason<input maxLength={1000} value={actionReason} onChange={e=>setActionReason(e.target.value)}/></label><div className="project-actions">{board.can_tasks&&activeTask&&!activeTask.archived&&<button className="secondary-button" disabled={busy||!actionReason.trim()} onClick={()=>void run(async()=>{if(session){await api('/project-tasks/'+activeTask.id+'/archive',session.access_token,{version:activeTask.version,reason:actionReason});await reload()}else setTasks(rows=>rows.map(t=>t.id===activeTask.id?{...t,archived:true,version:t.version+1}:t));setActionReason('');setMessage('Task archived; history retained.')})}>Archive selected task</button>}{board.can_manage&&<button className="secondary-button" disabled={busy||!actionReason.trim()} onClick={()=>void run(async()=>{if(session){await api('/projects/'+project+'/archive',session.access_token,{version:board.version,reason:actionReason});await reload()}else setBoard({...board,archived:true,version:board.version+1,can_tasks:false,can_comment:false,can_sprints:false});setActionReason('');setMessage('Project archived as read-only; records retained.')})}>Archive project as read-only</button>}</div></section>}
  </>}
 </section>
}
