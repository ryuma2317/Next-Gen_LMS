import type { FormEvent } from 'react'
import { emptyQuizConfig, type Question, type QuizConfig } from '../../shared/quizzes'
import { newQuestion, type EditableQuiz } from './demo'
const localTime=(value:string|null)=>{if(!value)return '';const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
export function QuizEditor({draft,setDraft,busy,onSave,onCancel}:{draft:EditableQuiz;setDraft:(value:EditableQuiz)=>void;busy:boolean;onSave:(e:FormEvent)=>void;onCancel:()=>void}){
 function config(key:keyof QuizConfig,value:string|number|null){setDraft({...draft,config:{...draft.config,[key]:value} as QuizConfig})}
 function question(id:string,patch:Partial<Question>){setDraft({...draft,questions:draft.questions.map(q=>q.id===id?{...q,...patch}:q)})}
 const select=(key:keyof QuizConfig,label:string,choices:[string,string][])=> <label>{label}<select value={String(draft.config[key]??'')} onChange={e=>config(key,e.target.value||null)}><option value="">Choose…</option>{choices.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>
 const number=(key:keyof QuizConfig,label:string,min:number,max:number)=> <label>{label}<input type="number" min={min} max={max} value={draft.config[key]??''} onChange={e=>config(key,e.target.value===''?null:Number(e.target.value))}/></label>
 return <form className="learning-editor" onSubmit={onSave}><h3>Quiz editor</h3><label>Title<input required maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>Description<textarea maxLength={1500} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
  <label>Mode<select value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value as 'exam'|'game',config:emptyQuizConfig()})}><option value="exam">Exam</option><option value="game">Live game</option></select></label>
  <div className="learning-form-grid">{draft.mode==='exam'?<>
   {(['opens_at','closes_at'] as const).map(key=><label key={key}>{key==='opens_at'?'Opens':'Closes'} (device local time)<input type="datetime-local" value={localTime(draft.config[key])} onChange={e=>config(key,e.target.value?new Date(e.target.value).toISOString():null)}/></label>)}
   {number('duration_seconds','Attempt duration (seconds)',30,10800)}{number('max_attempts','Maximum attempts',1,5)}
   {select('results','Release scores',[['immediate','After submission'],['after_close','After quiz closes'],['teacher','When teacher releases']])}
   {select('monitoring','Exam monitoring',[['fullscreen_visibility','Request fullscreen and report visibility events']])}
   {select('focus_response','Response to monitoring events',[['report','Report for teacher review'],['warn_report','Warn and report for teacher review']])}
  </>:<>
   {number('question_seconds','Each question (seconds)',5,300)}
   {select('scoring','Scoring',[['correct','Correct answers only'],['speed','Correct answers plus speed bonus']])}
   {draft.config.scoring==='speed'&&number('speed_bonus_percent','Maximum speed bonus (% of question points)',0,100)}
   {select('leaderboard','Show leaderboard',[['each_question','After each reveal'],['end','At game end']])}
  </>}</div>
  <p>All correct options and no extras earn the question’s points. Other responses earn zero; no negative marks. When chosen, the speed bonus decreases linearly from the selected maximum to zero at the server deadline. Game participants join in the lobby; equal totals share a rank.</p>
  {draft.questions.map((q,index)=><fieldset className="quiz-author-question" key={q.id}><legend>Question {index+1}</legend><label>Question text<textarea maxLength={1000} value={q.prompt} onChange={e=>question(q.id,{prompt:e.target.value})}/></label>
   <div className="learning-form-grid"><label>Answer type<select value={q.kind} onChange={e=>question(q.id,{kind:e.target.value as Question['kind'],correct:[]})}><option value="single">One correct option</option><option value="multiple">Multiple correct options</option></select></label><label>Points<input type="number" min={1} max={100} value={q.points} onChange={e=>question(q.id,{points:Number(e.target.value)})}/></label></div>
   {q.options.map((o,oi)=><div className="quiz-author-option" key={o.id}><label>Option {oi+1}<input maxLength={200} value={o.text} onChange={e=>question(q.id,{options:q.options.map(item=>item.id===o.id?{...item,text:e.target.value}:item)})}/></label>
    <label className="quiz-option"><input type="checkbox" checked={q.correct.includes(o.id)} onChange={()=>question(q.id,{correct:q.correct.includes(o.id)?q.correct.filter(id=>id!==o.id):q.kind==='single'?[o.id]:[...q.correct,o.id]})}/>Correct</label>
    <button type="button" className="secondary-button" disabled={q.options.length<=2} onClick={()=>question(q.id,{options:q.options.filter(item=>item.id!==o.id),correct:q.correct.filter(id=>id!==o.id)})}>Remove option {oi+1}</button></div>)}
   <div className="learning-actions"><button type="button" className="secondary-button" disabled={q.options.length>=6} onClick={()=>question(q.id,{options:[...q.options,{id:'o'+crypto.randomUUID().replaceAll('-',''),text:''}]})}>Add option</button><button type="button" className="secondary-button" onClick={()=>setDraft({...draft,questions:draft.questions.filter(item=>item.id!==q.id)})}>Remove question</button></div>
  </fieldset>)}
  <div className="learning-actions"><button type="button" className="secondary-button" disabled={draft.questions.length>=15} onClick={()=>setDraft({...draft,questions:[...draft.questions,newQuestion()]})}>Add question</button><button className="primary-button" disabled={busy}>Save quiz draft</button><button type="button" className="secondary-button" onClick={onCancel}>Cancel editing</button></div>
 </form>
}
