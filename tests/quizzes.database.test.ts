import {beforeAll,afterAll,it,expect} from 'vitest'
import {PGlite} from '@electric-sql/pglite'
import {readFile,readdir} from 'node:fs/promises'
const db=new PGlite()
const id=(n:number)=>'99000000-0000-0000-0000-'+String(n).padStart(12,'0')
const edition=id(1),section=id(2),offering=id(3),teacher=id(4),student=id(5),peer=id(6),outsider=id(7),exam=id(8),attempt=id(9),game=id(10),run=id(11)
const question={id:'q_one',kind:'single',prompt:'Synthetic question',points:10,options:[{id:'a',text:'A'},{id:'b',text:'B'}],correct:['a']}
const config=()=>({opens_at:new Date(Date.now()-3600000).toISOString(),closes_at:new Date(Date.now()+3600000).toISOString(),duration_seconds:600,max_attempts:2,results:'teacher',monitoring:'fullscreen_visibility',focus_response:'report',question_seconds:20,scoring:'correct',speed_bonus_percent:0,leaderboard:'each_question'})
const fields=(mode='exam')=>({title:'Synthetic quiz',description:'Test only',mode,config:config(),questions:[question]})
async function asUser(user:string,sql:string,params:unknown[]=[],aal='aal2'){
 await db.exec("set role authenticated;select set_config('request.jwt.claim.sub','"+user+"',false);select set_config('request.jwt.claim.aal','"+aal+"',false)")
 try{return await db.query<Record<string,any>>(sql,params)}finally{await db.exec('reset role')}
}
beforeAll(async()=>{
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1'))$$;grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;alter default privileges grant execute on functions to anon,authenticated,service_role;")
 for(const name of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'))
 await db.exec("insert into auth.users(id) values('"+teacher+"'),('"+student+"'),('"+peer+"'),('"+outsider+"');insert into public.editions(id,name) values('"+edition+"','Quiz test');insert into public.edition_members values('"+edition+"','"+teacher+"','trainer','CS',true),('"+edition+"','"+student+"','trainee','CS',true),('"+edition+"','"+peer+"','trainee','CS',true),('"+edition+"','"+outsider+"','trainee','DB',true);insert into public.offerings values('"+offering+"','"+edition+"','Quiz class','CS','core');insert into public.sections values('"+section+"','"+edition+"','"+offering+"',30,'Monday','Synthetic','Synthetic');insert into public.section_trainers values('"+section+"','"+teacher+"');insert into public.section_learning_permissions values('"+section+"','"+teacher+"','edit_learning'),('"+section+"','"+teacher+"','grade_work');insert into public.enrollments values('"+edition+"','"+offering+"','"+section+"','"+student+"',now()),('"+edition+"','"+offering+"','"+section+"','"+peer+"',now());")
})
afterAll(async()=>{await db.close()})
it('restricts direct tables/private functions and named default execute grants',async()=>{
 await expect(asUser(student,'select * from public.class_quizzes')).rejects.toThrow()
 const p=await db.query<{public_key:boolean;private_helper:boolean;browser_rpc:boolean}>("select has_function_privilege('anon','public.start_quiz_attempt(uuid,uuid)','EXECUTE') public_key,has_function_privilege('authenticated','private.quiz_score(jsonb,jsonb,numeric,numeric,integer)','EXECUTE') private_helper,has_function_privilege('authenticated','public.quiz_list(uuid)','EXECUTE') browser_rpc")
 expect(p.rows[0]).toEqual({public_key:false,private_helper:false,browser_rpc:true})
})
it('keeps drafts/keys private and requires assigned editing permission/MFA and full publishing policy',async()=>{
 await expect(asUser(teacher,'select public.save_quiz($1,$2,0,$3)',[exam,section,JSON.stringify(fields())],'aal1')).rejects.toThrow()
 await asUser(teacher,'select public.save_quiz($1,$2,0,$3)',[exam,section,JSON.stringify(fields())])
 expect((await asUser(student,'select * from public.quiz_list($1)',[section])).rows).toHaveLength(0)
 await expect(asUser(student,'select public.quiz_definition($1)',[exam])).rejects.toThrow()
 await expect(asUser(teacher,"select public.quiz_transition($1,null,'publish','Ready')",[exam])).rejects.toThrow()
 await asUser(teacher,"select public.quiz_transition($1,1,'publish','Reviewed all settings')",[exam])
 const list=await asUser(student,'select * from public.quiz_list($1)',[section])
 expect(Object.keys(list.rows[0].quiz_list).sort()).toEqual(['id','section_id','title','description','mode','config','state','version','released','can_edit','can_report','can_participate'].sort())
 expect(list.rows[0].quiz_list).not.toHaveProperty('questions')
 await expect(asUser(teacher,'select public.save_quiz($1,$2,2,$3)',[exam,section,JSON.stringify(fields())])).rejects.toThrow()
})
it('starts/resumes own attempts with server timing, no keys and cross-class denial',async()=>{
 await expect(asUser(outsider,'select public.start_quiz_attempt($1,$2)',[exam,id(50)])).rejects.toThrow()
 const first=(await asUser(student,'select public.start_quiz_attempt($1,$2) result',[exam,attempt])).rows[0].result
 expect(first.status).toBe('active');expect(first.score_units).toBeNull();expect(JSON.stringify(first)).not.toContain('"correct"')
 const duplicate=(await asUser(student,'select public.start_quiz_attempt($1,$2) result',[exam,id(51)])).rows[0].result;expect(duplicate.id).toBe(attempt)
 await expect(asUser(peer,'select public.quiz_attempt($1)',[attempt])).rejects.toThrow()
})
it('grades only accepted selected options, rejects stale/null writes and keeps unreleased scores private',async()=>{
 await expect(asUser(student,'select public.save_quiz_attempt($1,null,$2,false)',[attempt,JSON.stringify({q_one:['a']})])).rejects.toThrow()
 await expect(asUser(student,'select public.save_quiz_attempt($1,1,$2,false)',[attempt,JSON.stringify({q_one:['a','a']})])).rejects.toThrow()
 const saved=(await asUser(student,'select public.save_quiz_attempt($1,1,$2,false) result',[attempt,JSON.stringify({q_one:['a']})])).rows[0].result;expect(saved.version).toBe(2)
 await expect(asUser(student,'select public.save_quiz_attempt($1,1,$2,false)',[attempt,'{}'])).rejects.toThrow()
 await asUser(student,'select public.record_quiz_signal($1,$2,$3)',[attempt,id(55),'hidden'])
 await asUser(student,'select public.record_quiz_signal($1,$2,$3)',[attempt,id(55),'hidden'])
 const submitted=(await asUser(student,'select public.save_quiz_attempt($1,2,$2,true) result',[attempt,JSON.stringify({q_one:['a']})])).rows[0].result;expect(submitted.status).toBe('submitted');expect(submitted.score_units).toBeNull();expect(submitted.flags).toBe(1)
 const report=(await asUser(teacher,'select public.quiz_report($1) result',[exam])).rows[0].result;expect(report[0].score_units).toBe(1000)
 await expect(asUser(peer,'select public.quiz_report($1)',[exam])).rejects.toThrow()
 await asUser(teacher,"select public.quiz_transition($1,2,'release','Release reviewed results')",[exam])
 expect((await asUser(student,'select public.quiz_attempt($1) result',[attempt])).rows[0].result.score_units).toBe(1000)
})
it('expired attempts grade the last saved answers and never accept a late replacement',async()=>{
 const a=id(60);await asUser(student,'select public.start_quiz_attempt($1,$2)',[exam,a])
 await db.query("update public.quiz_attempts set deadline=clock_timestamp()-interval '1 second' where id=$1",[a])
 const result=(await asUser(student,'select public.save_quiz_attempt($1,1,$2,true) result',[a,JSON.stringify({q_one:['a']})])).rows[0].result
 expect(result.status).toBe('submitted');expect(result.score_units).toBe(0);expect(result.answers).toEqual({})
 await expect(asUser(student,'select public.start_quiz_attempt($1,$2)',[exam,id(61)])).rejects.toThrow()
})
it('live games scope joining/hosting, hide keys, reject late/duplicate replacement answers and reveal automatic scores',async()=>{
 await asUser(teacher,'select public.save_quiz($1,$2,0,$3)',[game,section,JSON.stringify(fields('game'))])
 await asUser(teacher,"select public.quiz_transition($1,1,'publish','Ready')",[game])
 await asUser(teacher,'select public.create_quiz_run($1,$2)',[game,run])
 await expect(asUser(outsider,'select public.join_quiz_run($1)',[run])).rejects.toThrow()
 await asUser(student,'select public.join_quiz_run($1)',[run])
 await expect(asUser(student,"select public.quiz_run_transition($1,1,'next','Unauthorized')",[run])).rejects.toThrow()
 await asUser(teacher,"select public.quiz_run_transition($1,1,'next','Start question')",[run])
 const open=(await asUser(student,'select public.quiz_run_view($1) result',[run])).rows[0].result;expect(open.correct).toBeNull();expect(open.question.correct).toBeUndefined();expect(open.standings).toEqual([])
 await expect(asUser(peer,'select public.join_quiz_run($1)',[run])).rejects.toThrow()
 await asUser(student,'select public.answer_quiz_run($1,0,$2)',[run,'["a"]'])
 await asUser(student,'select public.answer_quiz_run($1,0,$2)',[run,'["a"]'])
 await expect(asUser(student,'select public.answer_quiz_run($1,0,$2)',[run,'["b"]'])).rejects.toThrow()
 await expect(asUser(teacher,"select public.quiz_run_transition($1,null,'reveal','Stale')",[run])).rejects.toThrow()
 await asUser(teacher,"select public.quiz_run_transition($1,2,'reveal','Reveal question')",[run])
 const reveal=(await asUser(student,'select public.quiz_run_view($1) result',[run])).rows[0].result;expect(reveal.correct).toEqual(['a']);expect(reveal.standings[0].score_units).toBe(1000)
 await asUser(teacher,"select public.quiz_run_transition($1,3,'next','Finish')",[run])
 expect((await asUser(student,'select public.quiz_run_view($1) result',[run])).rows[0].result.phase).toBe('finished')
})
it('publication rejects undecided settings and unsupported unmonitored exams',async()=>{
 const q=id(70),incomplete={...fields(),config:{...config(),max_attempts:null}}
 await asUser(teacher,'select public.save_quiz($1,$2,0,$3)',[q,section,JSON.stringify(incomplete)])
 await expect(asUser(teacher,"select public.quiz_transition($1,1,'publish','Incomplete')",[q])).rejects.toThrow('Complete exam settings')
 await expect(asUser(teacher,'select public.save_quiz($1,$2,1,$3)',[q,section,JSON.stringify({...fields(),config:{...config(),monitoring:'none'}})])).rejects.toThrow()
})
it('speed bonuses are server-calculated and an enrolled unanswered player cannot submit after the deadline',async()=>{
 const q=id(80),r=id(81)
 await asUser(teacher,'select public.save_quiz($1,$2,0,$3)',[q,section,JSON.stringify({...fields('game'),config:{...config(),scoring:'speed',speed_bonus_percent:50}})])
 await asUser(teacher,"select public.quiz_transition($1,1,'publish','Review speed formula')",[q])
 await asUser(teacher,'select public.create_quiz_run($1,$2)',[q,r])
 await asUser(student,'select public.join_quiz_run($1)',[r]);await asUser(peer,'select public.join_quiz_run($1)',[r])
 await asUser(teacher,"select public.quiz_run_transition($1,1,'next','Open timed question')",[r])
 await asUser(student,'select public.answer_quiz_run($1,0,$2)',[r,'["a"]'])
 const saved=(await db.query<{score_units:number}>('select score_units from public.quiz_game_answers where run_id=$1 and user_id=$2',[r,student])).rows[0]
 expect(saved.score_units).toBeGreaterThan(1000);expect(saved.score_units).toBeLessThanOrEqual(1500)
 await db.query("update public.quiz_runs set deadline=clock_timestamp()-interval '1 second' where id=$1",[r])
 await expect(asUser(peer,'select public.answer_quiz_run($1,0,$2)',[r,'["a"]'])).rejects.toThrow('Question closed')
 expect((await db.query('select * from public.quiz_game_answers where run_id=$1',[r])).rows).toHaveLength(1)
})
