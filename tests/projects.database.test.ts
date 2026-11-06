import {beforeAll,afterAll,it,expect} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {readFile,readdir} from 'node:fs/promises'
import document from '../public/openapi.json'
import {assertSchema} from './helpers/schema-match.mjs'
const db=new PGlite(),id=(n:number)=>'ab000000-0000-4000-8000-'+String(n).padStart(12,'0')
const edition=id(1),otherEdition=id(2),manager=id(3),member=id(4),mentor=id(5),outsider=id(6),crossEdition=id(7),project=id(8),otherProject=id(9),task=id(10),sprint=id(11)
const fields=()=>({title:' Project one ',theme:'Synthetic theme',columns:[{id:'todo',title:'To do',complete:false},{id:'doing',title:'Doing',complete:false},{id:'done',title:'Done',complete:true}],limits:{participant:1,mentor:1,advisor:0}})
const taskFields=(extra:Record<string,unknown>={})=>({title:' First task ',description:'<script>plain data</script>',column_id:'todo',assignee_id:member,sprint_id:null,...extra})
const schema=(name:string,value:unknown)=>assertSchema({$ref:'#/components/schemas/'+name},value,document)
async function asUser(user:string,sql:string,params:unknown[]=[],aal='aal2'){
 await db.exec("set role authenticated;select set_config('request.jwt.claim.sub','"+user+"',false);select set_config('request.jwt.claim.aal','"+aal+"',false)")
 try{return await db.query<Record<string,any>>(sql,params)}finally{await db.exec('reset role')}
}
const saveMember=(who:string,user:string,role:string,version=0,active=true,tasks=false,comments=false,sprints=false)=>asUser(who,'select public.save_project_member($1,$2,$3,$4,$5,$6,$7,$8,$9)',[project,user,version,role,active,tasks,comments,sprints,'Approved synthetic assignment'])
beforeAll(async()=>{
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1'))$$;grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;alter default privileges grant execute on functions to anon,authenticated,service_role;")
 for(const name of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'))
 for(const user of [manager,member,mentor,outsider,crossEdition])await db.query('insert into auth.users(id) values($1)',[user])
 await db.query("insert into public.editions(id,name) values($1,'Project test'),($2,'Other year')",[edition,otherEdition])
 for(const [user,role] of [[manager,'organizer'],[member,'trainer'],[mentor,'mentor'],[outsider,'trainer']])await db.query("insert into public.edition_members values($1,$2,$3,'CS',true)",[edition,user,role])
 await db.query("insert into public.edition_members values($1,$2,'trainer','CS',true)",[otherEdition,crossEdition])
 await db.query("insert into public.edition_capabilities values($1,$2,'manage_projects')",[edition,manager])
})
afterAll(async()=>{await db.close()})
it('revokes default named grants, denies direct tables/private helpers and requires explicit management/MFA',async()=>{
 const row=(await db.query<{anon:boolean;service:boolean;helper:boolean}>("select has_function_privilege('anon','public.save_project(uuid,uuid,integer,jsonb)','execute') anon,has_function_privilege('service_role','public.save_project(uuid,uuid,integer,jsonb)','execute') service,has_function_privilege('authenticated','private.project_access(uuid,text)','execute') helper")).rows[0]
 expect(row).toEqual({anon:false,service:false,helper:false})
 await expect(asUser(manager,'select * from public.project_tasks')).rejects.toThrow()
 await expect(asUser(member,'select public.save_project($1,$2,0,$3)',[project,edition,JSON.stringify(fields())])).rejects.toThrow()
 await expect(asUser(manager,'select public.save_project($1,$2,0,$3)',[project,edition,JSON.stringify(fields())],'aal1')).rejects.toThrow()
})
it('creates configured projects with identical UUID retries and keeps unassigned roles/cross-year users outside',async()=>{
 await asUser(manager,'select public.save_project($1,$2,0,$3)',[project,edition,JSON.stringify(fields())])
 await asUser(manager,'select public.save_project($1,$2,0,$3)',[project,edition,JSON.stringify(fields())])
 await asUser(manager,'select public.save_project($1,$2,0,$3)',[otherProject,edition,JSON.stringify({...fields(),title:'Other project'})])
 expect((await db.query('select * from public.projects')).rows).toHaveLength(2)
 expect((await asUser(member,'select public.project_list($1) result',[edition])).rows[0].result.projects).toEqual([])
 await expect(asUser(outsider,'select public.project_board($1)',[project])).rejects.toThrow()
 await expect(asUser(crossEdition,'select public.project_board($1)',[project])).rejects.toThrow()
 await expect(asUser(manager,'select public.save_project($1,$2,null,$3)',[project,edition,JSON.stringify(fields())])).rejects.toThrow()
 schema('ProjectList',(await asUser(manager,'select public.project_list($1) result',[edition])).rows[0].result)
})
it('assigns independent roles/capacities, rejects foreign-year users and bounds roster disclosure',async()=>{
 await saveMember(manager,member,'participant',0,true,true,true,true)
 await saveMember(manager,member,'participant',0,true,true,true,true)
 await saveMember(manager,mentor,'mentor',0,true,false,true,false)
 await expect(saveMember(manager,outsider,'participant')).rejects.toThrow('capacity')
 await expect(saveMember(manager,crossEdition,'advisor')).rejects.toThrow()
 await expect(saveMember(member,outsider,'participant')).rejects.toThrow()
 const board=(await asUser(mentor,'select public.project_board($1) result',[project])).rows[0].result
 schema('ProjectBoard',board);expect(board.can_tasks).toBe(false);expect(board.can_comment).toBe(true)
 const roster=(await asUser(manager,'select public.project_candidates($1,0) result',[project])).rows[0].result
 expect(roster).toHaveLength(4);schema('ProjectCandidate',roster[0]);expect(JSON.stringify(roster)).not.toContain('email')
 await expect(asUser(member,'select public.project_candidates($1,0)',[project])).rejects.toThrow()
 await expect(asUser(manager,'select public.project_candidates($1,null)',[project])).rejects.toThrow()
})
it('creates/moves tasks without stale overwrites and records immutable history',async()=>{
 await asUser(member,'select public.save_project_task($1,$2,0,$3)',[task,project,JSON.stringify(taskFields())])
 await asUser(member,'select public.save_project_task($1,$2,0,$3)',[task,project,JSON.stringify(taskFields())])
 await expect(asUser(mentor,'select public.save_project_task($1,$2,1,$3)',[task,project,JSON.stringify(taskFields())])).rejects.toThrow()
 await asUser(member,'select public.save_project_task($1,$2,1,$3)',[task,project,JSON.stringify(taskFields({column_id:'doing'}))])
 for(const version of [null,1])await expect(asUser(member,'select public.save_project_task($1,$2,$3,$4)',[task,project,version,JSON.stringify(taskFields({description:'Overwrite attempt'}))])).rejects.toThrow()
 const rows=(await asUser(member,'select public.project_tasks_page($1,0) result',[project])).rows[0].result
 schema('ProjectTask',rows[0]);expect(rows[0].version).toBe(2);expect(rows[0].description).toContain('<script>')
 expect((await db.query('select * from public.project_task_changes where task_id=$1',[task])).rows).toHaveLength(2)
 await expect(asUser(member,'update public.project_tasks set description=$1 where id=$2',['tampered',task])).rejects.toThrow()
})
it('rejects invalid direct-RPC fields, foreign assignments and removal of a used column',async()=>{
 for(const changes of [{actor_id:manager},{assignee_id:outsider},{column_id:'unknown'},{sprint_id:id(98)},{description:'bad\u0001text'}])
  await expect(asUser(member,'select public.save_project_task($1,$2,2,$3)',[task,project,JSON.stringify(taskFields(changes))])).rejects.toThrow()
 await expect(asUser(manager,'select public.save_project($1,$2,1,$3)',[project,edition,JSON.stringify({...fields(),columns:fields().columns.filter(c=>c.id!=='doing')})])).rejects.toThrow('used column')
 await expect(asUser(manager,'select public.save_project($1,$2,1,$3)',[project,edition,JSON.stringify({...fields(),limits:{participant:1,mentor:0,advisor:0}})])).rejects.toThrow('Capacity')
 await expect(asUser(member,'select public.save_project_task($1,$2,2,$3)',[task,otherProject,JSON.stringify(taskFields())])).rejects.toThrow()
})
it('keeps append-only private comments idempotent and attributed to the authenticated actor',async()=>{
 const comment=id(20)
 await asUser(mentor,'select public.comment_project_task($1,$2,$3)',[comment,task,'<img src=x onerror=alert(1)>'])
 await asUser(mentor,'select public.comment_project_task($1,$2,$3)',[comment,task,'<img src=x onerror=alert(1)>'])
 await expect(asUser(mentor,'select public.comment_project_task($1,$2,$3)',[comment,task,'Different body'])).rejects.toThrow()
 await expect(asUser(outsider,'select public.project_task_thread($1)',[task])).rejects.toThrow()
 const thread=(await asUser(member,'select public.project_task_thread($1) result',[task])).rows[0].result
 schema('ProjectThread',thread);expect(thread.comments).toHaveLength(1);expect(thread.changes).toHaveLength(2)
})
it('enforces one active sprint, same-project links and retains unfinished work on close',async()=>{
 const starts='2027-04-01T02:00:00Z',ends='2027-04-08T02:00:00Z',other=id(30)
 await asUser(member,'select public.save_project_sprint($1,$2,0,$3,$4,$5,$6)',[sprint,project,' Sprint one ','Goal',starts,ends])
 await asUser(member,'select public.save_project_sprint($1,$2,0,$3,$4,$5,$6)',[sprint,project,' Sprint one ','Goal',starts,ends])
 await asUser(member,'select public.save_project_sprint($1,$2,0,$3,$4,$5,$6)',[other,project,'Other sprint','',starts,ends])
 await asUser(member,"select public.transition_project_sprint($1,1,'start','Ready')",[sprint])
 await expect(asUser(member,"select public.transition_project_sprint($1,1,'start','Conflict')",[other])).rejects.toThrow()
 await expect(asUser(mentor,"select public.transition_project_sprint($1,2,'close','No permission')",[sprint])).rejects.toThrow()
 await asUser(member,'select public.save_project_task($1,$2,2,$3)',[task,project,JSON.stringify(taskFields({column_id:'doing',sprint_id:sprint}))])
 await asUser(member,"select public.transition_project_sprint($1,2,'close','Review incomplete work')",[sprint])
 const row=(await db.query<{sprint_id:string;column_id:string}>('select sprint_id,column_id from public.project_tasks where id=$1',[task])).rows[0]
 expect(row).toEqual({sprint_id:sprint,column_id:'doing'})
 await expect(asUser(member,'select public.save_project_task($1,$2,0,$3)',[id(31),project,JSON.stringify(taskFields({sprint_id:sprint}))])).rejects.toThrow()
 schema('ProjectBoard',(await asUser(member,'select public.project_board($1) result',[project])).rows[0].result)
})
it('revokes active access immediately and allows historical links without granting new assignments',async()=>{
 await saveMember(manager,member,'participant',1,false,false,false,false)
 await expect(asUser(member,'select public.project_board($1)',[project])).rejects.toThrow()
 await expect(asUser(member,'select public.save_project_task($1,$2,3,$3)',[task,project,JSON.stringify(taskFields())])).rejects.toThrow()
 await saveMember(manager,outsider,'participant',0,true,true,false,false)
 await asUser(outsider,'select public.save_project_task($1,$2,3,$3)',[task,project,JSON.stringify(taskFields({column_id:'doing',sprint_id:sprint,description:'Keep historical assignee and sprint'}))])
 await db.query('update public.edition_members set active=false where edition_id=$1 and user_id=$2',[edition,outsider])
 await expect(asUser(outsider,'select public.project_board($1)',[project])).rejects.toThrow()
 await db.query('update public.edition_members set active=true where edition_id=$1 and user_id=$2',[edition,outsider])
})
it('archives with a reason, preserves read history and prevents writes while still permitting access revocation',async()=>{
 await expect(asUser(manager,'select public.archive_project_task($1,null,$2)',[task,'Missing revision'])).rejects.toThrow()
 await asUser(manager,"select public.archive_project_task($1,4,'Completed review')",[task])
 expect((await asUser(mentor,'select public.project_tasks_page($1,0) result',[project])).rows[0].result[0].archived).toBe(true)
 await expect(asUser(mentor,'select public.comment_project_task($1,$2,$3)',[id(40),task,'Too late'])).rejects.toThrow()
 await asUser(manager,"select public.archive_project($1,1,'Program board closed')",[project])
 expect((await asUser(mentor,'select public.project_board($1) result',[project])).rows[0].result.archived).toBe(true)
 await expect(asUser(manager,'select public.save_project_task($1,$2,0,$3)',[id(41),project,JSON.stringify(taskFields())])).rejects.toThrow()
 await saveMember(manager,mentor,'mentor',1,false,false,false,false)
 await expect(asUser(mentor,'select public.project_task_thread($1)',[task])).rejects.toThrow()
})
