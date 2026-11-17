import {test,expect} from '@playwright/test'
const id='ef000000-0000-4000-8000-000000000001',csrf='s'.repeat(43)
test('browser login uses same-origin server requests and safe metadata without provider credentials',async({page})=>{
 let signedIn=false
 const requests:{path:string;authorization?:string;body:unknown}[]=[]
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,headers=request.headers()
  requests.push({path,authorization:headers.authorization,body:request.postDataJSON()})
  let body:unknown={error:'Unavailable synthetic route'}
  if(path==='/api/auth/session')body={configured:true,session:signedIn?{user:{id},csrfToken:csrf}:null}
  if(path==='/api/auth/login'){signedIn=true;body={configured:true,session:{user:{id},csrfToken:csrf}}}
  if(path==='/api/auth/logout'){expect(headers['x-lms-csrf']).toBe(csrf);expect(headers['x-lms-request']).toBe('1');signedIn=false;body={status:'signed_out'}}
  if(path==='/api/editions')body=[]
  if(path==='/api/me')body={userId:id,memberships:[]}
  if(path==='/api/admissions/eligible')body=[]
  await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(body)})
 })
 await page.goto('/')
 await page.getByRole('button',{name:'Sign in',exact:true}).first().click()
 await page.getByLabel('Email',{exact:true}).fill('synthetic@example.test')
 await page.getByLabel('Password',{exact:true}).fill('synthetic-password')
 await page.getByRole('button',{name:'Sign in',exact:true}).last().click()
 await expect(page.getByText('Live connection',{exact:true})).toBeVisible()
 await page.reload()
 await expect(page.getByText('Live connection',{exact:true})).toBeVisible()
 expect(requests.every(r=>r.authorization===undefined)).toBe(true)
 expect(requests.find(r=>r.path==='/api/auth/login')?.body).toEqual({email:'synthetic@example.test',password:'synthetic-password'})
 const storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage},cookie:document.cookie}))
 expect(JSON.stringify(storage)).not.toMatch(/access_token|refresh_token|synthetic-password|supabase/)
 await page.getByRole('button',{name:'Sign out',exact:true}).click()
 await expect(page.getByText('Interactive preview',{exact:true})).toBeVisible()
})
test('invitation URL is scrubbed and requires an explicit accept action before redemption',async({page})=>{
 let redemptions=0
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/auth/invite')redemptions++
  const data=path==='/api/auth/session'?{configured:true,session:null}:{error:'Synthetic invitation unavailable'}
  await route.fulfill({status:path==='/api/auth/invite'?401:200,contentType:'application/json',body:JSON.stringify(data)})
 })
 await page.goto('/?token_hash=synthetic-private-invitation&type=invite')
 await expect(page).toHaveURL(/\/$/)
 await expect(page.getByRole('button',{name:'Accept invitation',exact:true})).toBeEnabled()
 expect(redemptions).toBe(0)
 await page.getByRole('button',{name:'Accept invitation',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Synthetic invitation unavailable')
 expect(redemptions).toBe(1)
})
