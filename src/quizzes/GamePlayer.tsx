import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api } from '../lib'
import { gradeChoice, type GameView, type Question } from '../../shared/quizzes'
import { sampleQuestion, scoreText, type ListedQuiz } from './demo'
import { Choices } from './Choices'
export function GamePlayer({runId,quiz,session,host,onLeave,previewQuestions=[sampleQuestion]}:{runId:string;quiz:ListedQuiz;session:Session|null;host:boolean;onLeave:()=>void;previewQuestions?:Question[]}){
 const [game,setGame]=useState<GameView|null>(session?null:{id:runId,version:1,phase:'lobby',question_index:-1,deadline:null,server_now:new Date().toISOString(),question:null,correct:null,joined:false,answered:false,players:0,answered_count:0,standings:[]})
 const [selected,setSelected]=useState<string[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[submittedIndex,setSubmittedIndex]=useState(-2),[now,setNow]=useState(Date.now())
 const offset=useRef(0),lastRow=useRef<{version:number;time:number}|null>(null),token=useRef(session?.access_token);token.current=session?.access_token
 function apply(row:GameView){const time=Date.parse(row.server_now),old=lastRow.current;if(old&&(row.version<old.version||(row.version===old.version&&time<old.time)))return;lastRow.current={version:row.version,time};offset.current=time-Date.now();setGame(row)}
 async function refresh(){if(token.current)apply(await api('/quiz-games/'+runId,token.current))}
 useEffect(()=>{
  let cancelled=false,inFlight=false
  const poll=async()=>{if(inFlight||cancelled||!token.current)return;inFlight=true;try{const row=await api<GameView>('/quiz-games/'+runId,token.current);if(!cancelled)apply(row)}catch{if(!cancelled)setMessage('Game connection unavailable. Reconnect before the question closes.')}finally{inFlight=false}}
  void poll();const interval=setInterval(()=>{setNow(Date.now());void poll()},2000)
  return()=>{cancelled=true;clearInterval(interval)}
 },[runId])
 useEffect(()=>setSelected([]),[game?.question_index])
 useEffect(()=>{if(!session&&game?.phase==='question'&&game.deadline&&now>=Date.parse(game.deadline)){const q=previewQuestions[game.question_index];setGame({...game,phase:'reveal',correct:q.correct,standings:[{label:'Sample participant',rank:1,is_you:!host,score_units:gradeChoice(q,selected)}]})}},[now,game?.phase])
 async function action(name:'join'|'answer'|'next'|'reveal'|'finish'){
  if(!game||busy)return;setBusy(true);setMessage('')
  try{
   if(token.current){
    const body=name==='join'?{}:name==='answer'?{questionIndex:game.question_index,selected}:{version:game.version,action:name,reason:'Teacher '+(name==='next'?'advanced the question':name==='reveal'?'closed the question and revealed results':'finished the game')}
    await api('/quiz-games/'+runId+'/'+(['join','answer'].includes(name)?name:'transition'),token.current,body)
    if(name==='answer')setSubmittedIndex(game.question_index)
    await refresh()
   }else{
    if(name==='join')setGame({...game,joined:true,players:1})
    if(name==='next'){const index=game.question_index+1;setGame({...game,version:game.version+1,phase:index>=previewQuestions.length?'finished':'question',question_index:index>=previewQuestions.length?game.question_index:index,question:previewQuestions[index]??game.question,correct:null,deadline:new Date(Date.now()+(quiz.config.question_seconds??20)*1000).toISOString()})}
    if(name==='reveal'||name==='finish'){const q=previewQuestions[Math.max(0,game.question_index)];setGame({...game,version:game.version+1,phase:name==='finish'?'finished':'reveal',correct:q?.correct??null,standings:[{label:'Sample participant',rank:1,is_you:!host,score_units:q?gradeChoice(q,selected):0}]})}
    if(name==='answer'){setSubmittedIndex(game.question_index);setGame({...game,answered:true,answered_count:1})}
   }
   setMessage(name==='answer'?'Answer locked. Results appear when the teacher reveals them.':'')
  }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
 }
 if(!game)return <p role="status">Loading game… {message}</p>
 const remaining=game.deadline?Math.max(0,Math.ceil((Date.parse(game.deadline)-now-offset.current)/1000)):0
 return <article className="learning-editor quiz-game"><div className="section-heading"><h3>{quiz.title}</h3><strong>{game.phase==='question'?remaining+'s':game.phase}</strong></div>
  <p>{game.players} participants · {game.answered_count} answers locked. Join with your own enrolled class account; the lobby closes when the first question opens. Results reveal automatically when time expires, or the teacher can close a question early.</p>
  {game.phase==='lobby'&&!host&&!game.joined&&<button className="primary-button" disabled={busy} onClick={()=>void action('join')}>Join game</button>}
  {game.question&&<Choices question={game.question} selected={selected} disabled={host||!game.joined||game.phase!=='question'||remaining===0||game.answered||submittedIndex===game.question_index} onChange={setSelected}/>}
  {!host&&game.phase==='question'&&game.joined&&<button className="primary-button" disabled={busy||!selected.length||remaining===0||game.answered||submittedIndex===game.question_index} onClick={()=>void action('answer')}>{game.answered||submittedIndex===game.question_index?'Answer locked':'Lock answer'}</button>}
  {game.correct&&<p>Correct answer: {game.question?.options.filter(o=>game.correct!.includes(o.id)).map(o=>o.text).join(', ')}</p>}
  {host&&game.phase!=='finished'&&<div className="learning-actions">{game.phase!=='question'?<button className="primary-button" disabled={busy} onClick={()=>void action('next')}>{game.phase==='lobby'?'Start first question':'Next question / finish'}</button>:<button className="primary-button" disabled={busy} onClick={()=>void action('reveal')}>Close question and reveal results</button>}<button className="secondary-button" disabled={busy} onClick={()=>{if(window.confirm('Finish this game now? No further answers will be accepted.'))void action('finish')}}>Finish game</button></div>}
  {game.standings.length>0&&<div><h4>Leaderboard</h4><ol className="quiz-standings">{game.standings.map((s,i)=><li key={i}><span>#{s.rank} · {s.label}{s.is_you?' (you)':''}</span><strong>{scoreText(s.score_units)}</strong></li>)}</ol><p>Equal scores share a rank. Game points do not decide program awards.</p></div>}
  {!session&&!host&&game.joined&&game.phase!=='finished'&&<div className="learning-actions"><button className="secondary-button" onClick={()=>void action(game.phase==='lobby'?'next':game.phase==='question'?'reveal':'finish')}>Simulate teacher {game.phase==='lobby'?'starting':game.phase==='question'?'revealing':'finishing'}</button></div>}
  <button className="secondary-button" onClick={onLeave}>Back to quizzes</button>{message&&<p role="status">{message}</p>}
 </article>
}
