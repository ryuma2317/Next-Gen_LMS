import { test } from 'node:test'
import assert from 'node:assert/strict'
import { attendancePoints, attendancePasses, audienceWinner } from '../shared/domain.ts'
test('attendance preserves exact quarter points and approved leave conversion',()=>{
 assert.equal(attendancePoints(0,1),.25)
 assert.equal(attendancePoints(0,4),attendancePoints(2,0))
 assert.equal(attendancePoints(1,1),.75)
 assert.equal(attendancePasses(attendancePoints(5,1)),true)
 assert.equal(attendancePasses(attendancePoints(6,0)),false)
 assert.throws(()=>attendancePoints(-1,0)); assert.throws(()=>attendancePoints(0,1.5))
 assert.equal(attendancePasses(NaN),false)
})
test('audience award skips all jury winners without modifying raw votes',()=>{
 const jury=['a','b','c','d','e'];const votes=[{teamId:'a',votes:100},{teamId:'b',votes:90},{teamId:'f',votes:80},{teamId:'g',votes:70}]
 const original=JSON.stringify(votes)
 assert.deepEqual(audienceWinner(votes,jury),{status:'winner',teamId:'f'})
 assert.equal(JSON.stringify(votes),original)
})
test('audience ties and insufficient eligible teams require a decision',()=>{
 const jury=['a','b','c','d','e']
 assert.deepEqual(audienceWinner([{teamId:'f',votes:2},{teamId:'g',votes:2}],jury),{status:'tie'})
 assert.deepEqual(audienceWinner([{teamId:'a',votes:10}],jury),{status:'no-eligible-team'})
 assert.deepEqual(audienceWinner([{teamId:'f',votes:0}],jury),{status:'no-eligible-votes'})
 assert.throws(()=>audienceWinner([],['a','a','c','d','e']))
 assert.throws(()=>audienceWinner([{teamId:'f',votes:-1}],jury))
 assert.throws(()=>audienceWinner([{teamId:'f',votes:1},{teamId:'f',votes:2}],jury))
})
