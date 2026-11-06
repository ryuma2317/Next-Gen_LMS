import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { buildOpenAPI, serializeOpenAPI } from '../api/openapi.mjs'
import { assertSchema } from './helpers/schema-match.mjs'
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n')
const doc = buildOpenAPI()
const entries = Object.entries(doc.paths).flatMap(([path,methods])=>Object.entries(methods).map(([method,operation])=>({path,method,...operation})))
const walk = (value,fn) => { if (!value || typeof value !== 'object') return; fn(value); Object.values(value).forEach(child=>walk(child,fn)) }
test('OpenAPI export is deterministic and matches the current application version',()=>{
 assert.equal(read('public/openapi.json'),serializeOpenAPI())
 assert.equal(doc.openapi,'3.1.0')
 assert.equal(doc.info.version,JSON.parse(read('package.json')).version)
 assert(read('server/index.ts').includes("version: '"+doc.info.version+"'"))
 assert.deepEqual(doc.servers.map(s=>s.url),['http://127.0.0.1:5173'])
})
test('references resolve; operation IDs, path parameters and responses are well formed',()=>{
 const ids = new Set()
 walk(doc,node=>{
  if (node.$ref) {
   assert(node.$ref.startsWith('#/components/'))
   assert(node.$ref.slice(2).split('/').reduce((value,key)=>value?.[key],doc),'Missing '+node.$ref)
  }
  if (node.pattern) assert.doesNotThrow(()=>new RegExp(node.pattern))
 })
 for (const op of entries) {
  assert(!ids.has(op.operationId),'Duplicate operationId'); ids.add(op.operationId)
  const params = (op.parameters ?? []).filter(p=>p.in==='path')
  assert.deepEqual(params.map(p=>p.name),[...op.path.matchAll(/\{([^}]+)\}/g)].map(m=>m[1]))
  params.forEach(p=>{assert.equal(p.required,true);assert.equal(p.schema.$ref,'#/components/schemas/UUID')})
  assert(Object.keys(op.responses).some(status=>/^2\d\d$/.test(status)))
  for (const response of Object.values(op.responses)) {
   assert(response.description)
   assert(response.content['application/json'].schema)
   assert.equal(response.headers['Cache-Control'].schema.const,'no-store')
  }
 }
})
test('only the four intended public operations opt out of Bearer authentication',()=>{
 assert.deepEqual(doc.security,[{BearerAuth:[]}])
 assert.deepEqual(entries.filter(op=>op.security?.length===0).map(op=>op.operationId).sort(),['applicationReceipt','health','publishedRecruitmentForm','submitApplication'])
 for (const op of entries.filter(op=>!op.security)) assert(op.responses['401'],op.operationId)
 assert.equal(doc.components.securitySchemes.BearerAuth.scheme,'bearer')
 for (const name of ['quizDefinition','quizReport','saveQuiz','draftGrade','reviewApplication'])
  assert.equal(entries.find(op=>op.operationId===name)['x-requires-mfa'],true,name)
})
test('every registered Hono endpoint and concrete action/resource variant is documented',()=>{
 const sources = readdirSync(new URL('../server/',import.meta.url)).filter(name=>name.endsWith('.ts')).sort().map(name=>read('server/'+name)).join('\n')
 const routers = [...sources.matchAll(/export const (\w+)\s*=\s*new Hono/g)].map(m=>m[1])
 assert(routers.includes('app'))
 const mounts = new Map([...sources.matchAll(/app\.route\('([^']+)',\s*(\w+)\)/g)].map(m=>[m[2],m[1]]))
 for(const router of routers) if(router!=='app') assert(mounts.has(router),'Unmapped Hono router: '+router)
 const routes = new Map()
 const registration = new RegExp('\\b('+routers.join('|')+')\\.(get|post|put|patch|delete)\\(\\x27([^\\x27]+)\\x27','g')
 const matches = [...sources.matchAll(registration)]
 assert(matches.length,'No registered routes found; review the coverage parser if the routing style changed')
 for (let index=0;index<matches.length;index++) {
  const match=matches[index], prefix=match[1]==='app'?'':mounts.get(match[1])
  const path=prefix+match[3], method=match[2], key=method+' '+path
  const body=sources.slice(match.index,(matches[index+1]?.index ?? sources.length))
  const variants=new Set([...body.matchAll(/\b(?:action|resource)\s*(?:===|!==)\s*'([^']+)'/g)].map(m=>m[1]))
  for(const list of body.matchAll(/\[([^\]]+)\]\.includes\(action\)/g))
   for(const item of list[1].matchAll(/'([^']+)'/g)) variants.add(item[1])
  const names=body.match(/const names:[^=]+=\s*\{([^}]+)\}/)
  if(names) for(const item of names[1].matchAll(/(\w+):\s*'/g)) variants.add(item[1])
  routes.set(key,{path,method,variants})
 }
 for (const op of entries) {
  const route=routes.get(op.method+' '+op['x-handler-route'])
  assert(route,'Documented route is not registered: '+op.path)
  const expected=route.path.replace(/:id\b/,'{id}').replace(/\/:(?:action|resource)\??/,op['x-handler-variant']?'/'+op['x-handler-variant']:'')
  assert.equal(op.path,expected)
 }
 for (const [key,route] of routes) {
  const docs=entries.filter(op=>op.method+' '+op['x-handler-route']===key)
  assert(docs.length,'Undocumented registered endpoint: '+key)
  const variants=docs.map(op=>op['x-handler-variant']).filter(Boolean)
  assert.deepEqual([...new Set(variants)].sort(),[...route.variants].sort(),'Missing/extra variants: '+key)
  if(route.path.endsWith('?')) assert(docs.some(op=>!op['x-handler-variant']),'Missing optional-resource base path')
 }
})
test('contract rejects private score/identity injection and distinguishes nullable released data',()=>{
 const check=(name,value)=>assertSchema(doc.components.schemas[name],value,doc)
 check('QuizSignalRequest',{id:'00000000-0000-4000-8000-000000000001',kind:'hidden'})
 assert.throws(()=>check('QuizSignalRequest',{id:'00000000-0000-4000-8000-000000000001',kind:'hidden',score:100}))
 assert.throws(()=>check('Empty',{userId:'someone'}))
 assert.throws(()=>check('QuizAttemptSave',{version:null,answers:{},submit:true}))
 assert.throws(()=>check('QuizAnswers',{constructor:['a']}))
 check('ScoreUnits',0)
 assert.throws(()=>check('ScoreUnits',1.5))
 check('ResourceUrl','https://example.com/lesson@home')
 assert.throws(()=>check('ResourceUrl','https://user:password@example.com/lesson'))
 const attempt={id:'00000000-0000-4000-8000-000000000001',status:'active',version:1,deadline:'2027-04-01T03:00:00Z',server_now:'2027-04-01T02:00:00Z',answers:{},questions:[],score_units:null,max_units:100,flags:0}
 check('QuizAttempt',attempt)
 assert.throws(()=>check('QuizAttempt',{...attempt,correct:['a']}))
})
