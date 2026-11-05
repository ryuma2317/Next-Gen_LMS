const periodMs = 6000
async function keyFromSecret(secret: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) throw new Error('Attendance signing key is not configured')
  const bytes = Uint8Array.from(atob(secret.replaceAll('-', '+').replaceAll('_', '/') + '='), ch => ch.charCodeAt(0))
  if (bytes.byteLength !== 32) throw new Error('Invalid signing key')
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}
async function codeFor(secret: string, sessionId: string, generation: string, step: number) {
  const key = await keyFromSecret(secret)
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`attendance:v1:${sessionId}:${generation}:${step}`)))
  const offset = mac[mac.length - 1] & 15
  const number = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]
  return String(number % 100000000).padStart(8, '0')
}
function equalCode(a: string, b: string) {
  let different = 0
  for (let i = 0; i < 8; i++) different |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return different === 0
}
export async function attendanceChallenge(secret: string, sessionId: string, generation: string, now = Date.now()) {
  const step = Math.floor(now / periodMs)
  const code = await codeFor(secret, sessionId, generation, step)
  return { code, qr: `nextgen-attendance:v1:${sessionId}:${code}`, serverTime: now, rotatesAt: (step + 1) * periodMs, expiresAt: (step + 2) * periodMs }
}
export async function verifyAttendanceCode(secret: string, sessionId: string, generation: string, code: string, now = Date.now()) {
  if (!/^[0-9]{8}$/.test(code)) return false
  const step = Math.floor(now / periodMs)
  const candidates = await Promise.all([codeFor(secret, sessionId, generation, step), codeFor(secret, sessionId, generation, step - 1)])
  const current = equalCode(code, candidates[0]), previous = equalCode(code, candidates[1])
  return current || previous
}
