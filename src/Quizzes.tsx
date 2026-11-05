import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api } from './lib'
import { MfaPanel } from './MfaPanel'
import type { LearningClass } from '../shared/learning'
import type { Role } from '../shared/domain'
import { emptyQuizConfig, quizPublicationProblems, validateQuizDraft, type QuizAttempt, type QuizDraft } from '../shared/quizzes'
import { sampleQuizzes, sampleQuestion, sampleSection, scoreText, type ListedQuiz, type EditableQuiz } from './quizzes/demo'
import { QuizEditor } from './quizzes/QuizEditor'
import { ExamPlayer } from './quizzes/ExamPlayer'
import { GamePlayer } from './quizzes/GamePlayer'
import './quizzes.css'
type ReportRow={id:string;user_id:string;attempt:number;status:string;score_units:number|null;flags:number}
export function Quizzes({session,edition,role}:{session:Session|null;edition:string;role:Role}){
 const teacher=!session&&role==='Trainer',student=!session&&role==='Trainee'
 const [classes,setClasses]=useState<LearningClass[]>(session?[]:[{id:sampleSection,title:'Web Development',room:'Sample class',can_edit:teacher,can_grade:teacher,is_trainer:teacher,is_student:student,mfa_ready:true}])
 const [section,setSection]=useState(session?'':sampleSection),[rows,setRows]=useState<ListedQuiz[]>(session?[]:sampleQuizzes(teacher,student)),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const [draft,setDraft]=useState<EditableQuiz|null>(null),[activeQuiz,setActiveQuiz]=useState<ListedQuiz|null>(null),[attempt,setAttempt]=useState<QuizAttempt|null>(null),[runId,setRunId]=useState(''),[reason,setReason]=useState('')
 const [report,setReport]=useState<ReportRow[]|null>(null),[reportQuiz,setReportQuiz]=useState(''),[reportPage,setReportPage]=useState(0),[eventList,setEventList]=useState<{kind:string;received_at:string}[]|null>(null)
 const [attemptHistory,setAttemptHistory]=useState<QuizAttempt[]>([]),[runList,setRunList]=useState<{id:string;phase:string}[]>([])
 const surface=useRef<HTMLDivElement>(null),requestId=useRef<{quiz:string;id:string}|null>(null),demoDefinitions=useRef<Record<string,QuizDraft>>({})
 const current=classes.find(c=>c.id===section),canEdit=!!current?.can_edit&&!!current?.mfa_ready
 function definition(row:ListedQuiz):QuizDraft{return demoDefinitions.current[row.id]??{title:row.title,description:row.description,mode:row.mode,config:row.config,questions:[structuredClone(sampleQuestion)]}}
 async function load(){if(session&&section)setRows(await api('/sections/'+section+'/quizzes',session.access_token))}
 useEffect(()=>{if(!session||!edition)return;let cancelled=false;api<LearningClass[]>('/editions/'+edition+'/learning',session.access_token).then(data=>{if(!cancelled){setClasses(data);setSection(old=>data.some(c=>c.id===old)?old:data[0]?.id??'')}}).catch(e=>{if(!cancelled)setMessage(e.message)});return()=>{cancelled=true}},[session?.access_token,edition])
 useEffect(()=>{
  setDraft(null);setAttempt(null);setRunId('');setActiveQuiz(null);setReport(null);setReportQuiz('');setAttemptHistory([]);setRunList([]);requestId.current=null
  if(!session||!section)return
  let cancelled=false;setRows([]);api<ListedQuiz[]>('/sections/'+section+'/quizzes',session.access_token).then(data=>{if(!cancelled)setRows(data)}).catch(e=>{if(!cancelled)setMessage(e.message)})
  return()=>{cancelled=true}
 },[section])
 useEffect(()=>{if(!session||!section)return;let cancelled=false;api<ListedQuiz[]>('/sections/'+section+'/quizzes',session.access_token).then(data=>{if(!cancelled)setRows(data)}).catch(e=>{if(!cancelled)setMessage(e.message)});return()=>{cancelled=true}},[session?.access_token])
 async function perform(work:()=>Promise<void>){if(busy)return;setBusy(true);setMessage('');try{await work()}catch(error){setMessage((error as Error).message)}finally{setBusy(false)}}
 async function saveDraft(e:FormEvent){
  e.preventDefault();if(!draft)return
  await perform(async()=>{const {id,version,...fields}=draft,quiz=validateQuizDraft(fields)
   if(session){await api('/sections/'+section+'/quizzes',session.access_token,{id,version,quiz});await load()}
   else{demoDefinitions.current[id]=structuredClone(quiz);setRows(old=>[...old.filter(q=>q.id!==id),{...quiz,id,section_id:section,state:'draft',version:version+1,released:false,can_edit:true,can_report:true,can_participate:false}])}
   setDraft(null);setMessage('Quiz draft saved. Publish separately after reviewing its settings.')
  })
 }
 async function edit(row:ListedQuiz){await perform(async()=>{if(session){const data=await api<QuizDraft&ListedQuiz>('/quizzes/'+row.id+'/definition',session.access_token);setDraft({id:data.id,version:data.version,title:data.title,description:data.description,mode:data.mode,config:data.config,questions:data.questions})}else setDraft({id:row.id,version:row.version,...structuredClone(definition(row))})})}
 async function transition(row:ListedQuiz,action:'publish'|'close'|'release'){await perform(async()=>{
  if(!reason.trim())throw new Error('Enter an action reason first')
  if(session){await api('/quizzes/'+row.id+'/transition',session.access_token,{version:row.version,action,reason});await load()}
  else{if(action==='publish'){const problems=quizPublicationProblems(definition(row));if(problems.length)throw new Error(problems.join('. '))}
   setRows(old=>old.map(q=>q.id===row.id?{...q,state:action==='publish'?'published':action==='close'?'closed':q.state,released:action==='release'||q.released,version:q.version+1}:q))}
  setReason('');setMessage('Quiz '+action+' completed.')
 })}
 async function openExam(row:ListedQuiz,existing?:QuizAttempt){
  if(busy)return;setBusy(true);setMessage('')
  try{
   if(row.config.monitoring==='fullscreen_visibility'&&(!existing||existing.status==='active')){if(!surface.current?.requestFullscreen)throw new Error('This browser cannot enter fullscreen. Contact your teacher for an accommodation before starting.');await surface.current.requestFullscreen()}
   if(!requestId.current||requestId.current.quiz!==row.id)requestId.current={quiz:row.id,id:crypto.randomUUID()}
   const next:QuizAttempt=session?existing?await api('/quiz-attempts/'+existing.id,session.access_token):await api('/quizzes/'+row.id+'/start',session.access_token,{id:requestId.current.id}):{id:crypto.randomUUID(),status:'active',version:1,deadline:new Date(Date.now()+600000).toISOString(),server_now:new Date().toISOString(),answers:{},questions:definition(row).questions.map(({correct:_correct,...q})=>q),score_units:null,max_units:definition(row).questions.reduce((n,q)=>n+q.points*100,0),flags:0}
   setActiveQuiz(row);setAttempt(next);requestId.current=null
  }catch(error){setMessage((error as Error).message);if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{})}finally{setBusy(false)}
 }
 async function history(row:ListedQuiz){await perform(async()=>{setActiveQuiz(row);setAttemptHistory(session?await api('/quizzes/'+row.id+'/attempts',session.access_token):[]);setRunList([])})}
 async function games(row:ListedQuiz,create=false){await perform(async()=>{setActiveQuiz(row);setAttemptHistory([]);if(create){const id=session?await api<string>('/quizzes/'+row.id+'/runs',session.access_token,{id:crypto.randomUUID()}):crypto.randomUUID();setRunId(id)}else setRunList(session?await api('/quizzes/'+row.id+'/runs',session.access_token):[{id:'sample-game',phase:'lobby'}])})}
 async function results(quiz:string,page=0){await perform(async()=>{setReportQuiz(quiz);setReportPage(page);setReport(session?await api('/quizzes/'+quiz+'/report?offset='+page*100,session.access_token):[]);setEventList(null)})}
 return <div className="learning-workspace quiz-workspace" ref={surface}><div className="learning-toolbar">
  <label>Class<select value={section} disabled={!!attempt||!!runId||busy} onChange={e=>setSection(e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{c.title} · {c.room}</option>)}</select></label>
  <button className="secondary-button" disabled={busy||!!attempt||!!runId} onClick={()=>void perform(load)}>Refresh quizzes</button>
  {canEdit&&!attempt&&!runId&&<button className="primary-button" onClick={()=>setDraft({id:crypto.randomUUID(),version:0,title:'',description:'',mode:'exam',config:emptyQuizConfig(),questions:[]})}>Create quiz</button>}
 </div>
 {!session&&<p className="quiz-notice">Synthetic preview only. Sample answers and scores are local examples; real answer keys and grading stay on the server.</p>}
 {current&&(current.can_edit||current.can_grade)&&!current.mfa_ready&&<MfaPanel/>}
 {attempt&&activeQuiz?<ExamPlayer key={attempt.id} initial={attempt} quiz={activeQuiz} session={session} onLeave={()=>{setAttempt(null);setActiveQuiz(null);setAttemptHistory([])}}/>
 :runId&&activeQuiz?<GamePlayer key={runId} runId={runId} quiz={activeQuiz} session={session} host={activeQuiz.can_edit} previewQuestions={!session?definition(activeQuiz).questions:undefined} onLeave={()=>{setRunId('');setActiveQuiz(null);setRunList([])}}/>
 :<>
  {draft&&<QuizEditor draft={draft} setDraft={setDraft} busy={busy} onSave={e=>void saveDraft(e)} onCancel={()=>setDraft(null)}/>}
  {canEdit&&<label>Reason for publishing, closing or releasing<input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
  {rows.map(row=><article className="assignment-card" key={row.id}><div className="section-heading"><h3>{row.title}</h3><span className="pill">{row.mode==='exam'?'EXAM':'LIVE GAME'} · {row.state}</span></div><p className="lesson-text">{row.description}</p><div className="learning-actions">
   {row.can_edit&&row.state==='draft'&&<><button className="secondary-button" disabled={busy} onClick={()=>void edit(row)}>Edit quiz</button><button className="secondary-button" disabled={busy||!reason.trim()} onClick={()=>void transition(row,'publish')}>Publish quiz</button></>}
   {row.can_edit&&row.state==='published'&&<button className="secondary-button" disabled={busy||!reason.trim()} onClick={()=>{if(window.confirm('Close this quiz? New attempts stop, active exams finalize their last saved answers and running games finish.'))void transition(row,'close')}}>Close quiz</button>}
   {row.can_edit&&row.mode==='exam'&&row.state!=='draft'&&!row.released&&<button className="secondary-button" disabled={busy||!reason.trim()} onClick={()=>void transition(row,'release')}>Release exam scores</button>}
   {row.can_participate&&row.mode==='exam'&&row.state!=='draft'&&<><button className="primary-button" disabled={busy||row.state!=='published'} onClick={()=>void openExam(row)}>Start / resume exam</button><button className="secondary-button" disabled={busy} onClick={()=>void history(row)}>My attempts and results</button></>}
   {row.mode==='game'&&row.state!=='draft'&&(row.can_edit||row.can_participate)&&<><button className="secondary-button" disabled={busy} onClick={()=>void games(row)}>Browse games</button>{row.can_edit&&row.state==='published'&&<button className="primary-button" disabled={busy} onClick={()=>void games(row,true)}>Host / resume game</button>}</>}
   {row.can_report&&row.mode==='exam'&&<button className="secondary-button" disabled={busy} onClick={()=>void results(row.id)}>Exam report</button>}
  </div>{activeQuiz?.id===row.id&&<>{attemptHistory.map(a=><p key={a.id}>Attempt · {a.status} · {scoreText(a.score_units)} <button className="secondary-button" onClick={()=>void openExam(row,a)}>{a.status==='active'?'Resume':'View result'}</button></p>)}{runList.map(r=><p key={r.id}>{r.phase} <button className="secondary-button" onClick={()=>{setActiveQuiz(row);setRunId(r.id)}}>Open game</button></p>)}</>}</article>)}
  {report&&<article className="learning-editor"><h3>Exam report</h3><p>Monitoring events are client-reported observations, not cheating verdicts. Offline gaps and browser restrictions can leave reports incomplete.</p>{report.map(r=><div className="quiz-report-row" key={r.id}><span>Participant {r.user_id.slice(0,6)} · attempt {r.attempt} · {r.status} · {scoreText(r.score_units)} · {r.flags} flags</span><button className="secondary-button" onClick={()=>void perform(async()=>setEventList(session?await api('/quiz-attempts/'+r.id+'/events',session.access_token):[]))}>View events</button></div>)}<div className="learning-actions"><button className="secondary-button" disabled={busy||reportPage===0} onClick={()=>void results(reportQuiz,reportPage-1)}>Previous page</button><button className="secondary-button" disabled={busy||report.length<100||reportPage>=100} onClick={()=>void results(reportQuiz,reportPage+1)}>Next page</button></div>{eventList&&<ul>{eventList.map((e,i)=><li key={i}>{e.kind} · {new Date(e.received_at).toLocaleString()}</li>)}</ul>}</article>}
  {!rows.length&&<p>No quizzes are available for this class.</p>}
 </>}
 {message&&<p role="status">{message}</p>}
 </div>
}
