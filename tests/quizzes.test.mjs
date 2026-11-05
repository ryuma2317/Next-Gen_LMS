import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyQuizConfig, validateQuizDraft, quizPublicationProblems, validateQuizAnswers, gradeChoice } from '../shared/quizzes.ts'
const question=()=>({id:'question_one',kind:'single',prompt:'Choose the correct option',options:[{id:'a',text:'A'},{id:'b',text:'B'}],correct:['a'],points:10})
const draft=()=>({title:'Quiz',description:'Synthetic',mode:'exam',config:emptyQuizConfig(),questions:[question()]})
test('quiz drafts reject mass assignment and invalid question/answer identities',()=>{
 assert.throws(()=>validateQuizDraft({...draft(),score:100}))
 assert.throws(()=>validateQuizDraft({...draft(),questions:[{...question(),correct:['missing']}]}))
 assert.throws(()=>validateQuizDraft({...draft(),questions:[question(),question()]}))
 assert.throws(()=>validateQuizDraft({...draft(),questions:[{...question(),id:'constructor'}]}))
})
test('quiz drafts retain unresolved policy but publication requires explicit settings',()=>{
 const q=validateQuizDraft(draft());assert.ok(quizPublicationProblems(q).length)
 q.config={...emptyQuizConfig(),opens_at:new Date(Date.now()-1000).toISOString(),closes_at:new Date(Date.now()+3600000).toISOString(),duration_seconds:600,max_attempts:2,results:'immediate',monitoring:'fullscreen_visibility',focus_response:'report'}
 assert.deepEqual(quizPublicationProblems(q),[])
 q.config.closes_at=q.config.opens_at;assert.ok(quizPublicationProblems(q).length)
})
test('game publication requires timer/scoring/leaderboard and an explicit speed bonus when used',()=>{
 const q={...draft(),mode:'game'};assert.ok(quizPublicationProblems(q).length)
 q.config={...emptyQuizConfig(),question_seconds:20,scoring:'speed',leaderboard:'end'}
 assert.ok(quizPublicationProblems(q).length);q.config.speed_bonus_percent=25;assert.deepEqual(quizPublicationProblems(q),[])
})
test('choice grading is exact, integer-based and cannot award duplicate-option credit',()=>{
 assert.equal(gradeChoice(question(),['a']),1000);assert.equal(gradeChoice(question(),['b']),0)
 assert.equal(gradeChoice(question(),['a','a']),0)
 const multi={...question(),kind:'multiple',correct:['a','b']}
 assert.equal(gradeChoice(multi,['b','a']),1000);assert.equal(gradeChoice(multi,['a']),0)
 assert.equal(gradeChoice(question(),['a'],10000,20000,50),1250)
 assert.equal(gradeChoice(question(),['a'],-1,20000,50),1000)
})
test('answers reject foreign questions, duplicate selections and prototype keys',()=>{
 assert.throws(()=>validateQuizAnswers([question()],{other:['a']}))
 assert.throws(()=>validateQuizAnswers([question()],{question_one:['a','a']}))
 assert.throws(()=>validateQuizAnswers([question()],{question_one:['unknown']}))
 assert.deepEqual({...validateQuizAnswers([question()],{question_one:['a']})},{question_one:['a']})
})
test('quiz content remains plain data with bounded storage and supported types',()=>{
 const q=draft();q.questions[0].prompt='<img src=x onerror=alert(1)>';assert.equal(validateQuizDraft(q).questions[0].prompt,q.questions[0].prompt)
 assert.throws(()=>validateQuizDraft({...q,description:'x'.repeat(1501)}))
 assert.throws(()=>validateQuizDraft({...q,questions:[{...question(),kind:'execute_code'}]}))
})
