import { test } from 'node:test'
import assert from 'node:assert/strict'
import { attendanceChallenge, attendanceCodeExpiry, verifyAttendanceCode } from '../server/challenges.ts'
import { attendanceCondition, recordUnits, parseAttendanceQr } from '../shared/attendance.ts'
const key = 'A'.repeat(43), session = '70000000-0000-0000-0000-000000000001', generation = 'generation-one'
test('challenge rotates at six seconds and accepts only current/previous twelve-second window', async () => {
  const first = await attendanceChallenge(key, session, generation, 600000)
  const same = await attendanceChallenge(key, session, generation, 605999)
  const next = await attendanceChallenge(key, session, generation, 606000)
  assert.match(first.code, /^[0-9]{8}$/)
  assert.equal(first.code, same.code); assert.notEqual(first.code, next.code)
  assert.equal(first.rotatesAt, 606000); assert.equal(first.expiresAt, 612000)
  assert.equal(await verifyAttendanceCode(key, session, generation, first.code, 611999), true)
  assert.equal(await attendanceCodeExpiry(key, session, generation, first.code, 611999), 612000)
  assert.equal(await attendanceCodeExpiry(key, session, generation, first.code, 612000), null)
  assert.equal(await verifyAttendanceCode(key, session, generation, first.code, 612000), false)
  assert.equal(await verifyAttendanceCode(key, session, generation, next.code, 600000), false)
})
test('attendance code cannot be reused for another class, generation or signing key', async () => {
  const value = await attendanceChallenge(key, session, generation, 600000)
  assert.equal(await verifyAttendanceCode(key, 'other-session', generation, value.code, 600000), false)
  assert.equal(await verifyAttendanceCode(key, session, 'reopened-session', value.code, 600000), false)
  assert.equal(await verifyAttendanceCode('B'.repeat(43), session, generation, value.code, 600000), false)
  assert.equal(await verifyAttendanceCode(key, session, generation, 'not-code', 600000), false)
  await assert.rejects(() => attendanceChallenge('weak', session, generation, 600000))
})
test('QR decoder accepts only attendance data, never arbitrary links or markup', () => {
  assert.deepEqual(parseAttendanceQr(`nextgen-attendance:v1:${session}:12345678`), { sessionId: session, code: '12345678' })
  for (const value of ['https://example.test', 'javascript:alert(1)', '<svg/>', `nextgen-attendance:v1:${session}:1234`, 'x'.repeat(200)]) assert.throws(() => parseAttendanceQr(value))
})
test('attendance ledger uses exact quarter-units with a two-to-one leave ratio', () => {
  assert.equal(recordUnits('present'), 0); assert.equal(recordUnits('absent'), 2); assert.equal(recordUnits('approved_leave'), 1)
  assert.equal(recordUnits('approved_leave') * 2, recordUnits('absent'))
  assert.equal(recordUnits('pending_review'), null); assert.equal(recordUnits('unverified'), null)
  assert.equal(recordUnits('approved_leave', 4), 2)
  assert.throws(() => recordUnits('absent', 3)); assert.throws(() => recordUnits('unknown'))
})
test('unresolved or missing policy blocks a final attendance condition', () => {
  const value = { units: 11, pending: 0, failure_units: 12, policy_version: 1, warning: 2 }
  assert.equal(attendanceCondition(value), 'passing-so-far')
  assert.equal(attendanceCondition({ ...value, units: 12 }), 'failed')
  assert.equal(attendanceCondition({ ...value, units: 12, pending: 1 }), 'pending')
  assert.equal(attendanceCondition({ ...value, policy_version: null }), 'pending')
  assert.equal(attendanceCondition({ ...value, units: NaN }), 'pending')
})
