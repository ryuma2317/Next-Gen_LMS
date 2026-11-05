export type Department='CS'|'DB'|'TN'|'EXTERNAL'
export type ApplicationState='submitted'|'under_review'|'passed'|'failed'|'activated'
export type Question={id:string;label:string;type:'text'|'textarea'|'select';required:boolean;options?:string[]}
export type RecruitmentForm={id:string;edition_id:string;title:string;purpose:'trainer'|'trainee';version:number;questions:Question[];published:boolean;closes_at:string|null}
export type ApplicationInput={formId:string;submissionId:string;receiptToken:string;fullName:string;email:string;department:Department;specialization:string;answers:Record<string,string>}
export type ApplicationRow={id:string;edition_id:string;form_id:string;form_version:number;purpose:'trainer'|'trainee';full_name:string;email:string;department:Department;specialization:string;answers:Record<string,string>;questions:Question[];status:ApplicationState;version:number;created_at:string}
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
export function validateQuestions(v:unknown):v is Question[]{
 if(!Array.isArray(v)||v.length>12)return false
 const ids=new Set<string>()
 return v.every(q=>{if(!record(q)||Object.keys(q).some(k=>!['id','label','type','required','options'].includes(k))||typeof q.id!=='string'||!/^[a-z][a-z0-9_]{0,39}$/.test(q.id)||ids.has(q.id)||typeof q.label!=='string'||!q.label.trim()||q.label.length>160||typeof q.required!=='boolean'||!['text','textarea','select'].includes(String(q.type)))return false;ids.add(q.id);if(q.type==='select')return Array.isArray(q.options)&&q.options.length>0&&q.options.length<=20&&new Set(q.options).size===q.options.length&&q.options.every(o=>typeof o==='string'&&o.trim()&&o.length<=120);return q.options===undefined})
}
export function validateApplication(value:unknown,form:RecruitmentForm):ApplicationInput{
 if(!record(value)||Object.keys(value).sort().join(',')!==['formId','submissionId','receiptToken','fullName','email','department','specialization','answers'].sort().join(','))throw new Error('Unexpected application fields')
 for(const k of ['formId','submissionId','receiptToken','fullName','email','department','specialization'])if(typeof value[k]!=='string')throw new Error('Invalid application')
 if(value.formId!==form.id||!uuidPattern.test(value.submissionId as string)||!/^[A-Za-z0-9_-]{43}$/.test(value.receiptToken as string))throw new Error('Invalid application reference')
 const name=(value.fullName as string).trim(),email=(value.email as string).trim().toLowerCase(),specialization=(value.specialization as string).trim()
 if(!name||name.length>160||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||specialization.length>120||!['CS','DB','TN','EXTERNAL'].includes(value.department as string))throw new Error('Check your contact and department information')
 if(!validateQuestions(form.questions)||!record(value.answers))throw new Error('Invalid form answers')
 const questions=form.questions,answers:Record<string,string>={}
 if(Object.keys(value.answers).some(k=>!questions.some(q=>q.id===k)))throw new Error('Unexpected answer field')
 for(const q of questions){const answer=value.answers[q.id]??'';if(typeof answer!=='string'||answer.length>1000||(q.required&&!answer.trim())||(q.type==='select'&&answer!==''&&!q.options?.includes(answer)))throw new Error(`Check your answer: ${q.label}`);answers[q.id]=answer.trim()}
 return {formId:form.id,submissionId:value.submissionId as string,receiptToken:value.receiptToken as string,fullName:name,email,department:value.department as Department,specialization,answers}
}
export function canReviewTransition(from:ApplicationState,to:ApplicationState){return (from==='submitted'&&to==='under_review')||(from==='under_review'&&(to==='passed'||to==='failed'))}
export function createReceiptToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
export async function receiptHash(token:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
