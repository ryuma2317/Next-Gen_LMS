import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomSecret,sealSession,openSession,sessionHash,equalSecret} from '../server/session-crypto.ts'
import {inspectPath,inspectText} from '../scripts/publication-safety.mjs'
test('session handles are random, hashed and never embedded in encrypted credential envelopes',async()=>{
 const handle=randomSecret(),key=randomSecret(),hash=await sessionHash(handle)
 assert.match(handle,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(handle,randomSecret());assert.match(hash,/^[0-9a-f]{64}$/)
 const value={access_token:'synthetic access credential',refresh_token:'synthetic refresh credential',expires_at:2000000000,csrfToken:randomSecret()}
 const envelope=await sealSession(value,key,hash+':user')
 assert(!envelope.includes(value.access_token));assert(!envelope.includes(value.refresh_token));assert(!envelope.includes(handle))
 assert.deepEqual(await openSession(envelope,key,hash+':user'),value)
 assert.notEqual(await sealSession(value,key,hash+':user'),envelope)
})
test('authenticated encryption rejects wrong keys, swapped sessions, tampering and malformed payloads',async()=>{
 const key=randomSecret(),data={access_token:'synthetic access',refresh_token:'synthetic refresh',expires_at:2000000000,csrfToken:randomSecret()},envelope=await sealSession(data,key,'user:session')
 await assert.rejects(openSession(envelope,randomSecret(),'user:session'))
 await assert.rejects(openSession(envelope,key,'other:session'))
 await assert.rejects(openSession(envelope.slice(0,25)+(envelope[25]==='A'?'B':'A')+envelope.slice(26),key,'user:session'))
 await assert.rejects(openSession('v0.invalid.envelope',key,'user:session'))
 await assert.rejects(sealSession(data,'bad','user:session'))
 assert(equalSecret(data.csrfToken,data.csrfToken));assert(!equalSecret('',data.csrfToken));assert(!equalSecret(data.csrfToken+'a',data.csrfToken))
})
test('publication guard rejects sensitive paths, privileged fixtures and browser credential storage without echoing values',()=>{
 for(const path of ['.env','.env.local','private-data/roster.csv','tmp/extracted.txt','backups/database.sql','reference.pdf','key.pem'])assert(inspectPath(path),path)
 for(const path of ['.env.example','.dev.vars.example','shared/session.ts','SECURITY.md'])assert(!inspectPath(path),path)
 assert(inspectText('src/test.ts',"import {createClient} from '@supabase/supabase-js'").length)
 assert(inspectText('src/test.ts','localStorage.setItem(key,value)').length)
 assert(inspectText('server/test.ts','sb_secret_'+'a'.repeat(40)).includes('privileged provider key'))
 assert.deepEqual(inspectText('src/test.ts','const safe={user:{id:"synthetic"},csrfToken:"synthetic"}'),[])
})
