import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import type { Env, Bindings } from './types'
import { receiptHash, uuidPattern, validateApplication, validateQuestions, type RecruitmentForm } from '../shared/admissions'
const client=(env:Bindings,privileged=false)=>createClient(env.SUPABASE_URL!,privileged?env.SUPABASE_SECRET_KEY!:env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})
export const publicAdmissions=new Hono<Env>()
publicAdmissions.use('*',async(c,next)=>{
 if(!c.env.SUPABASE_URL||!c.env.SUPABASE_PUBLISHABLE_KEY)return c.json({error:'Recruitment is not configured'},503)
 if(c.req.method==='POST'){
  if(!c.env.SUPABASE_SECRET_KEY||!c.env.ADMISSIONS_LIMITER)return c.json({error:'Recruitment submission is not enabled'},503)
  const limit=await c.env.ADMISSIONS_LIMITER.limit({key:`admissions:${c.req.header('CF-Connecting-IP')??'local'}`})
  if(!limit.success){c.header('Retry-After','60');return c.json({error:'Too many requests. Please try again shortly.'},429)}
  if(!c.req.header('Content-Type')?.startsWith('application/json'))return c.json({error:'JSON required'},415)
 }
 await next()
})
publicAdmissions.get('/forms/:id',async c=>{
 if(!uuidPattern.test(c.req.param('id')))return c.json({error:'Form unavailable'},404)
 const {data,error}=await client(c.env).rpc('published_form',{p_id:c.req.param('id')})
 return error?c.json({error:'Unable to load form'},503):data?.[0]?c.json(data[0]):c.json({error:'Form unavailable'},404)
})
publicAdmissions.post('/applications',async c=>{
 let value:unknown;try{value=await c.req.json()}catch{return c.json({error:'Invalid JSON'},400)}
 if(!value||typeof value!=='object'||!('formId'in value)||typeof value.formId!=='string'||!uuidPattern.test(value.formId))return c.json({error:'Invalid form'},400)
 const db=client(c.env,true),{data,error}=await db.rpc('published_form',{p_id:value.formId})
 if(error)return c.json({error:'Unable to load form'},503)
 if(!data?.[0])return c.json({error:'Form unavailable'},404)
 let input;try{input=validateApplication(value,data[0] as RecruitmentForm)}catch(e){return c.json({error:(e as Error).message},400)}
 const result=await db.rpc('submit_application',{p_form:input.formId,p_id:input.submissionId,p_receipt_hash:await receiptHash(input.receiptToken),p_name:input.fullName,p_email:input.email,p_department:input.department,p_specialization:input.specialization,p_answers:input.answers})
 // Do not identify duplicate mailboxes, rejection history or existing account status publicly.
 return result.error?c.json({error:'Unable to submit. Check the form window or contact the organizer if you already applied.'},409):c.json({id:input.submissionId,status:'submitted'},201)
})
publicAdmissions.post('/receipt',async c=>{
 let value:unknown;try{value=await c.req.json()}catch{return c.json({error:'Invalid receipt'},400)}
 if(!value||typeof value!=='object'||Object.keys(value).sort().join(',')!=='id,token'||!('id'in value)||!('token'in value)||typeof value.id!=='string'||!uuidPattern.test(value.id)||typeof value.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value.token))return c.json({error:'Invalid receipt'},400)
 const {data,error}=await client(c.env,true).rpc('application_receipt',{p_id:value.id,p_receipt_hash:await receiptHash(value.token)})
 return error?c.json({error:'Unable to check receipt'},503):data?.[0]?c.json(data[0]):c.json({error:'Receipt unavailable'},404)
})

export const admissions=new Hono<Env>()
admissions.get('/editions/:id/forms',async c=>{
 const id=c.req.param('id');if(!uuidPattern.test(id))return c.json({error:'Invalid edition'},400)
 const {data,error}=await c.get('db').from('recruitment_forms').select('id,edition_id,title,purpose,version,questions,published,closes_at').eq('edition_id',id).order('created_at',{ascending:false}).limit(100)
 return error?c.json({error:'Unable to load forms'},503):c.json(data)
})
admissions.post('/editions/:id/forms',async c=>{
 const id=c.req.param('id');if(!uuidPattern.test(id))return c.json({error:'Invalid edition'},400)
 let b:unknown;try{b=await c.req.json()}catch{return c.json({error:'Invalid JSON'},400)}
 if(!b||typeof b!=='object'||Object.keys(b).sort().join(',')!=='closesAt,published,purpose,questions,title'||!('title'in b)||!('questions'in b)||!('purpose'in b)||!('published'in b)||!('closesAt'in b)||typeof b.title!=='string'||!b.title.trim()||b.title.length>160||!validateQuestions(b.questions)||!['trainer','trainee'].includes(String(b.purpose))||typeof b.published!=='boolean'||!(b.closesAt===null||(typeof b.closesAt==='string'&&Number.isFinite(Date.parse(b.closesAt)))))return c.json({error:'Check the form title, questions and closing time'},400)
 const {data,error}=await c.get('db').rpc('create_recruitment_form',{p_edition:id,p_title:b.title,p_purpose:b.purpose,p_questions:b.questions,p_published:b.published,p_closes_at:b.closesAt})
 return error?c.json({error:'Unable to create form. Assigned permission, MFA and a future closing time are required.'},409):c.json({id:data},201)
})
admissions.get('/admissions/eligible',async c=>{
 const {data,error}=await c.get('db').rpc('my_eligible_applications')
 return error?c.json({error:'Unable to check activation'},503):c.json(data)
})
admissions.post('/admissions/:id/activate',async c=>{
 if(!uuidPattern.test(c.req.param('id')))return c.json({error:'Invalid application'},400)
 const {error}=await c.get('db').rpc('activate_application',{p_id:c.req.param('id')})
 return error?c.json({error:'Activation unavailable. Check your verified email or contact the organizer.'},409):c.json({status:'activated'})
})
admissions.get('/editions/:id/applications',async c=>{
 const id=c.req.param('id');if(!uuidPattern.test(id))return c.json({error:'Invalid edition'},400)
 const db=c.get('db'),permission=await db.rpc('admissions_access',{p_edition:id})
 if(permission.error)return c.json({error:'Unable to check access'},503)
 if(!permission.data)return c.json({error:'Assigned review permission and MFA are required'},403)
 const {data,error}=await db.from('applications').select('id,edition_id,form_id,form_version,purpose,full_name,email,department,specialization,questions,answers,status,version,created_at').eq('edition_id',id).order('created_at',{ascending:false}).limit(300)
 return error?c.json({error:'Unable to load applications'},503):c.json(data)
})
admissions.post('/admissions/:id/review',async c=>{
 if(!uuidPattern.test(c.req.param('id')))return c.json({error:'Invalid application'},400)
 let body:unknown;try{body=await c.req.json()}catch{return c.json({error:'Invalid JSON'},400)}
 if(!body||typeof body!=='object'||Object.keys(body).sort().join(',')!=='reason,state,version'||!('reason'in body)||!('state'in body)||!('version'in body)||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>1000||!Number.isSafeInteger(body.version)||!['under_review','passed','failed'].includes(String(body.state)))return c.json({error:'Valid state, current version and a review reason are required'},400)
 const {error}=await c.get('db').rpc('review_application',{p_id:c.req.param('id'),p_version:body.version,p_state:body.state,p_reason:body.reason})
 return error?c.json({error:'Review unavailable. Check permission, MFA and the latest application state.'},409):c.json({status:'saved'})
})
export async function runInvitationJobs(env:Bindings){
 if(env.ENABLE_INVITATIONS!=='true'||!env.SUPABASE_URL||!env.SUPABASE_SECRET_KEY||!env.INVITE_REDIRECT_URL?.startsWith('https://'))return
 const db=client(env,true),jobs=await db.rpc('lease_invitation_jobs')
 if(jobs.error)throw new Error('Invitation queue unavailable')
 for(const job of jobs.data??[]){
  let status='existing_account'
  if(!job.existing_user){try{const result=await db.auth.admin.inviteUserByEmail(job.email,{redirectTo:env.INVITE_REDIRECT_URL});status=result.error?'failed':'sent'}catch{status='failed'}}
  const saved=await db.rpc('finish_invitation_job',{p_id:job.application_id,p_lease:job.lease_id,p_status:status})
  if(saved.error)throw new Error('Invitation outcome could not be saved')
 }
}
