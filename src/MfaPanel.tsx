import { useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { accountAction, authFactors } from './lib'
export function MfaPanel({ allowEnrollment = false }: { allowEnrollment?: boolean }) {
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  // Enrollment material stays in component memory; never log, persist or send it to a QR service.
  const [setup, setSetup] = useState<{ id: string; uri: string } | null>(null)
  async function enroll() {
    if (busy || setup) return
    setBusy(true); setMessage('')
    try {
      const factors = await authFactors()
      if (factors.some(f => f.status === 'verified')) throw new Error('An authenticator is already enrolled. Verify with its current code below. Contact the platform owner if you have lost access.')
      if (factors.some(f => f.status === 'unverified')) throw new Error('An incomplete authenticator setup already exists. Contact the platform owner to safely clear it before starting again.')
      const result = await accountAction<{id:string;uri:string}>('enroll',{})
      setSetup({ id: result.id, uri: result.uri }); setCode('')
    } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) }
  }
  async function verify(e: FormEvent) {
    e.preventDefault(); if (busy) return
    setBusy(true); setMessage('')
    try {
      const factors = await authFactors()
      const factor = setup ?? factors.find(f => f.status === 'verified')
      if (!factor) throw new Error('Set up an authenticator in Account settings first.')
      await accountAction('verify',{factorId:factor.id,code})
      setSetup(null); setCode(''); setMessage('MFA verified. Your assigned program permissions still apply.')
    } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) }
  }
  return <form className="learning-mfa" onSubmit={verify}>
    <h3><ShieldCheck size={17} />{allowEnrollment ? 'Authenticator security' : 'Verify your teaching access'}</h3>
    <p>{allowEnrollment ? 'Set up an authenticator app, then enter its current code. MFA protects your account; program permissions are assigned separately.' : 'Editing and grading require assigned class permissions and MFA. New authenticators can be set up in Account settings.'}</p>
    {allowEnrollment && !setup && <button type="button" className="secondary-button" disabled={busy} onClick={enroll}>Set up authenticator</button>}
    {setup && <div className="mfa-enrollment"><p>Scan this private QR code in your authenticator app. Keep this page open until verification succeeds. Do not share or screenshot this code.</p><QRCodeSVG value={setup.uri} size={200} marginSize={4} title="Private authenticator enrollment QR code" /><p>Completing setup can sign you out of other sessions. Leaving now keeps an incomplete setup. Contact the platform owner if you need to restart. Verified authenticators are never automatically removed.</p></div>}
    <label>Six-digit authenticator code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></label>
    <button className="secondary-button" disabled={busy}>Verify MFA</button>{message && <p role="status">{message}</p>}
  </form>
}
