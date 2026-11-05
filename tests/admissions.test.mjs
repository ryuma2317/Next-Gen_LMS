import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateQuestions,validateApplication,canReviewTransition,createReceiptToken,receiptHash} from '../shared/admissions.ts'
const form={id:'50000000-0000-0000-0000-000000000001',purpose:'trainee',version:1,questions:[{id:'goal',label:'Your goal',type:'textarea',required:true},{id:'track',label:'Track',type:'select',required:false,options:['A','B']}]}
const input=()=>({formId:form.id,submissionId:'60000000-0000-0000-0000-000000000001',receiptToken:createReceiptToken(),fullName:' Demo Person ',email:' DEMO@EXAMPLE.TEST ',department:'CS',specialization:'Software Engineering',answers:{goal:' Learn together ',track:'A'}})
test('application answers are validated and contact details canonicalized without role assignment',()=>{
 const value=validateApplication(input(),form)
 assert.equal(value.email,'demo@example.test');assert.equal(value.fullName,'Demo Person');assert.equal(value.answers.goal,'Learn together');assert.equal('role'in value,false)
})
test('application mass assignment and unexpected answer fields are rejected',()=>{
 assert.throws(()=>validateApplication({...input(),role:'admin'},form))
 assert.throws(()=>validateApplication({...input(),answers:{goal:'Valid',role:'organizer'}},form))
 assert.throws(()=>validateApplication({...input(),formId:'different'},form))
})
test('required answers, select options, size and shape are enforced',()=>{
 for(const answers of [{goal:''},{goal:'x'.repeat(1001)},{goal:[]},{goal:'Yes',track:'C'},[]])assert.throws(()=>validateApplication({...input(),answers},form))
 assert.throws(()=>validateApplication({...input(),email:'bad'},form))
 assert.throws(()=>validateApplication({...input(),department:'OTHER'},form))
 assert.throws(()=>validateApplication({...input(),receiptToken:'guessable'},form))
})
test('versioned questions reject duplicates, invalid IDs and unknown executable field types',()=>{
 assert.equal(validateQuestions(form.questions),true)
 assert.equal(validateQuestions([form.questions[0],form.questions[0]]),false)
 assert.equal(validateQuestions([{id:'goal',label:'Hello',type:'html',required:true}]),false)
 assert.equal(validateQuestions([{id:'goal',label:'Hello',type:'select',required:true,options:['A','A']}]),false)
 assert.equal(validateQuestions([{id:'__proto__',label:'Hello',type:'text',required:true}]),false)
 assert.equal(validateQuestions(Array(13).fill(form.questions[0])),false)
})
test('outcomes cannot skip review, overwrite activated records or reopen a decision silently',()=>{
 assert.equal(canReviewTransition('submitted','under_review'),true)
 assert.equal(canReviewTransition('under_review','passed'),true)
 assert.equal(canReviewTransition('under_review','failed'),true)
 for(const pair of [['submitted','passed'],['passed','activated'],['activated','under_review'],['failed','passed']])assert.equal(canReviewTransition(...pair),false)
})
test('private receipts use 32 random bytes and a deterministic non-plaintext digest',async()=>{
 const a=createReceiptToken(),b=createReceiptToken();assert.match(a,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(a,b)
 const digest=await receiptHash(a);assert.match(digest,/^[a-f0-9]{64}$/);assert.equal(digest,await receiptHash(a));assert.notEqual(digest,a)
})
