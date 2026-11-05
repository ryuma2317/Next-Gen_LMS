import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api } from '../lib'
import { gradeChoice, type QuizAttempt, type QuizSignal } from '../../shared/quizzes'
import { sampleQuestion, scoreText, type ListedQuiz } from './demo'
import { Choices } from './Choices'
export function ExamPlayer({ initial, quiz, session, onLeave }: { initial: QuizAttempt; quiz: ListedQuiz; session: Session|null; onLeave: ()=>void }) {
 const [attempt,setAttempt]=useState(initial),[answers,setAnswers]=useState(initial.answers),[message,setMessage]=useState(''),[monitorMessage,setMonitorMessage]=useState(''),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[now,setNow]=useState(Date.now())
 const current=useRef(initial),draft=useRef(initial.answers),unsaved=useRef(false),inFlight=useRef(false),offset=useRef(Date.parse(initial.server_now)-Date.now())
 const pending=useRef<{id:string;kind:QuizSignal}[]>([]),flushing=useRef(false),count=useRef(0),retryAt=useRef(0),token=useRef(session?.access_token)
 token.current=session?.access_token
 const remaining=Math.max(0,Math.ceil((Date.parse(attempt.deadline)-now-offset.current)/1000)),active=attempt.status==='active'
 function apply(row:QuizAttempt){current.current=row;setAttempt(row);offset.current=Date.parse(row.server_now)-Date.now()}
 async function flush(){
  if(!token.current||flushing.current)return
  flushing.current=true
  try{while(pending.current.length){await api('/quiz-attempts/'+initial.id+'/signals',token.current,pending.current[0]);pending.current.shift()}}catch{/* Bounded memory retry; absence of delivered events is not proof. */}finally{flushing.current=false}
 }
 function signal(kind:QuizSignal){
  if(count.current>=200||current.current.status!=='active')return
  count.current++;pending.current.push({id:crypto.randomUUID(),kind})
  if(!session&&['hidden','fullscreen_exit','fullscreen_unavailable'].includes(kind))setAttempt(a=>({...a,flags:a.flags+1}))
  if(['hidden','fullscreen_exit'].includes(kind)&&quiz.config.focus_response==='warn_report')setMonitorMessage('You left the exam view. This may be reported for teacher review; it does not determine cheating.')
  void flush()
 }
 async function save(submit=false){
  if(inFlight.current||current.current.status!=='active')return
  inFlight.current=true;setSaving(true)
  const sent=structuredClone(draft.current),fingerprint=JSON.stringify(sent)
  try{
   let row:QuizAttempt
   if(token.current)row=await api('/quiz-attempts/'+initial.id+'/save',token.current,{version:current.current.version,answers:sent,submit})
   else{const finished=submit||Date.now()>=Date.parse(current.current.deadline);row={...current.current,answers:sent,version:current.current.version+1,status:finished?'submitted':'active',score_units:finished?gradeChoice(sampleQuestion,sent[sampleQuestion.id]??[]):null,server_now:new Date().toISOString()}}
   apply(row);retryAt.current=0
   if(JSON.stringify(draft.current)===fingerprint||row.status==='submitted'){draft.current=row.answers;setAnswers(row.answers);unsaved.current=false;setDirty(false)}
   setMessage(row.status==='submitted'?'Submitted. Your result follows the teacher’s release setting.':unsaved.current?'Earlier changes saved; newer changes are waiting.':'All current answers saved.')
  }catch(error){retryAt.current=Date.now()+5000;setMessage((error as Error).message+' Unsaved answers remain on this page. Reloading may lose them; contact your teacher if saves keep failing.')}finally{inFlight.current=false;setSaving(false)}
 }
 useEffect(()=>{
  const interval=setInterval(()=>{setNow(Date.now());const expired=Date.now()+offset.current>=Date.parse(current.current.deadline);if(current.current.status==='active'&&Date.now()>=retryAt.current&&(unsaved.current||expired))void save(expired);void flush()},1000)
  return()=>clearInterval(interval)
 },[initial.id])
 useEffect(()=>{
  if(!active||quiz.config.monitoring!=='fullscreen_visibility')return
  const visibility=()=>signal(document.visibilityState==='hidden'?'hidden':'visible')
  const fullscreen=()=>signal(document.fullscreenElement?'fullscreen_enter':'fullscreen_exit')
  document.addEventListener('visibilitychange',visibility);document.addEventListener('fullscreenchange',fullscreen)
  return()=>{document.removeEventListener('visibilitychange',visibility);document.removeEventListener('fullscreenchange',fullscreen)}
 },[active,initial.id])
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(unsaved.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
 useEffect(()=>{if(!active&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{})},[active])
 return <article className="learning-editor quiz-exam"><div className="section-heading"><h3>{quiz.title}</h3><strong>{active?Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0')+' remaining':'Submitted'}</strong></div>
  <p>Answers save automatically while this page stays open. Only server-accepted saves count. Multiple-choice questions use exact matching: all correct options, with no extras.</p>
  {quiz.config.monitoring==='fullscreen_visibility'&&<p>Fullscreen and visibility events are advisory reports, not cheating verdicts. This page cannot lock your device. Last confirmed report: {attempt.flags} flags.</p>}
  {attempt.questions.map(q=><Choices key={q.id} question={q} selected={answers[q.id]??[]} disabled={!active||remaining===0} onChange={ids=>{const next={...draft.current,[q.id]:ids};draft.current=next;setAnswers(next);unsaved.current=true;setDirty(true)}}/>)}
  {active?<div className="learning-actions"><button className="secondary-button" disabled={saving} onClick={()=>void save()}>{saving?'Saving…':dirty?'Save answers':'Answers saved'}</button><button className="primary-button" disabled={saving} onClick={()=>{if(window.confirm('Submit these answers? Submitted answers cannot be changed.'))void save(true)}}>Submit exam</button>
   {quiz.config.monitoring==='fullscreen_visibility'&&<button className="secondary-button" onClick={()=>{const surface=document.querySelector<HTMLElement>('.quiz-workspace');void surface?.requestFullscreen?.().catch(()=>setMessage('Fullscreen is unavailable. Contact your teacher for an accommodation.'))}}>Return to fullscreen</button>}</div>
   :<p role="status">Result: <strong>{scoreText(attempt.score_units)}</strong> / {scoreText(attempt.max_units)}. This is not a certificate eligibility decision.</p>}
  <button className="secondary-button" onClick={()=>{if(!active||window.confirm('Leave this attempt? Its timer continues. Unsaved changes may be lost.')){if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});onLeave()}}}>Back to quizzes</button>
  {active&&session&&message.includes('Unsaved answers')&&<button className="secondary-button" disabled={saving} onClick={()=>{if(window.confirm('Replace this page’s unsaved answers with the last server-saved answers?'))void api<QuizAttempt>('/quiz-attempts/'+initial.id,session.access_token).then(row=>{apply(row);draft.current=row.answers;setAnswers(row.answers);unsaved.current=false;setDirty(false);retryAt.current=0;setMessage('Server-saved answers reloaded.')}).catch(()=>setMessage('Reload unavailable. Keep this page open and contact your teacher.'))}}>Reload server-saved answers</button>}
  {monitorMessage&&<p role="status">{monitorMessage}</p>}{message&&<p role="status">{message}</p>}
 </article>
}
