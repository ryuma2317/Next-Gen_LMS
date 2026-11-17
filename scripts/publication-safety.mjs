import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
export const detectors=[
 ['privileged provider key',/sb_secret_[A-Za-z0-9_-]{16,}/],
 ['embedded JWT',/eyJ[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{25,}\.[A-Za-z0-9_-]{20,}/],
 ['private key',/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
 ['GitHub credential',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/]
]
export function inspectText(path,content){
 const failures=detectors.filter(([,pattern])=>pattern.test(content)).map(([name])=>name)
 if(path.startsWith('src/')&&(/from\s*['"]@supabase\//.test(content)||/import\.meta\.env/.test(content)||/(?:localStorage|sessionStorage)\s*\./.test(content)))failures.push('browser credential/environment storage boundary')
 return failures
}
export function inspectPath(path){return /(?:^|\/)(?:tmp|private-data|backups|exports|node_modules|\.git)(?:\/|$)/i.test(path)||/(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/.test(path)&&!path.endsWith('.example')||/\.(?:pem|key|p12|pfx|pdf)$/i.test(path)}
export function checkPublication(root=process.cwd(),bundle=false){
 const files=bundle?walk(resolve(root,'dist/client')).map(path=>relative(root,path).replaceAll('\\','/')):execFileSync('git',['-C',root,'ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean)
 const failures=[]
 for(const path of files){
  if(!bundle&&inspectPath(path))failures.push(path+': excluded publication path')
  const full=resolve(root,path)
  if(!existsSync(full)||!statSync(full).isFile())continue
  const content=readFileSync(full,'utf8')
  for(const reason of inspectText(path,content))failures.push(path+': '+reason)
  if(bundle&&/\.(?:js|html|map)$/.test(path)&&(/supabase\.auth\.|sb-[A-Za-z0-9_-]+-auth-token|SUPABASE_SECRET_KEY|SESSION_ENCRYPTION_KEY|ATTENDANCE_SIGNING_KEY|PRIVATE_SESSION_SENTINEL_26/.test(content)))failures.push(path+': server-only configuration/provider credential artifact')
 }
 if(failures.length)throw new Error('Publication safety failed (values withheld):\n'+failures.join('\n'))
 return files.length
}
function walk(dir){if(!existsSync(dir))throw new Error('Client build missing');return readdirSync(dir).flatMap(name=>{const path=resolve(dir,name);return statSync(path).isDirectory()?walk(path):[path]})}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const count=checkPublication(process.cwd(),process.argv.includes('--bundle'));process.stdout.write('Publication safety passed for '+count+' files (bounded scan; no secret values printed).\n')}
 catch(error){process.stderr.write(error.message+'\n');process.exitCode=1}
}
