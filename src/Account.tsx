import { useState } from 'react'
import { auth } from './lib'
import { MfaPanel } from './MfaPanel'
export function Account(){
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 async function updatePassword(e:React.FormEvent){
  e.preventDefault()
  if(!auth||busy)return
  if(password!==confirmation){setMessage('The passwords do not match.');return}
  setBusy(true)
  try{
   const {error}=await auth.auth.updateUser({password})
   if(error)throw new Error('Password update failed. Check the provider security requirements or contact the organizer.')
   setPassword('');setConfirmation('');setMessage('Password updated.')
  }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}
 }
 return <><form onSubmit={updatePassword}><p>Your program permissions come from active edition assignments. Set your password after accepting an invitation.</p><label>New password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button className="primary-button" disabled={busy}>Update password</button>{message&&<p role="status">{message}</p>}</form><MfaPanel allowEnrollment /></>
}
