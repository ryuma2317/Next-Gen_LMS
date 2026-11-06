import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateProject,validateTask,validateMember,validateSprint} from '../shared/projects.ts'
const id='a0000000-0000-4000-8000-000000000001'
const project=()=>({title:'Synthetic project',theme:'Plain text',columns:[{id:'todo',title:'To do',complete:false},{id:'done',title:'Done',complete:true}],limits:{participant:8,mentor:1,advisor:0}})
test('project setup requires explicitly supplied capacities and unique configured columns',()=>{
 assert.equal(validateProject(project()).limits.participant,8)
 assert.throws(()=>validateProject({...project(),limits:{participant:8,mentor:null,advisor:0}}))
 assert.throws(()=>validateProject({...project(),columns:[project().columns[0],project().columns[0]]}))
 assert.throws(()=>validateProject({...project(),columns:[{id:'constructor',title:'Unsafe key',complete:false},project().columns[1]]}))
})
test('project configuration and tasks reject authority fields, unknown keys and unsafe text',()=>{
 assert.throws(()=>validateProject({...project(),can_manage:true}))
 const task={title:'Task',description:'<script>not executable</script>',column_id:'todo',assignee_id:null,sprint_id:null}
 assert.equal(validateTask(task).description,task.description)
 assert.throws(()=>validateTask({...task,user_id:id}))
 assert.throws(()=>validateTask({...task,description:'bad\u0001text'}))
 assert.throws(()=>validateTask({...task,assignee_id:'someone'}))
})
test('project access requires target ID, current revision, all explicit permissions and reason',()=>{
 const member={userId:id,version:0,role:'mentor',active:true,canTasks:false,canComment:true,canSprints:false,reason:'Approved assignment'}
 assert.equal(validateMember(member).canTasks,false)
 assert.throws(()=>validateMember({...member,version:null}))
 assert.throws(()=>validateMember({...member,canManage:true}))
 assert.throws(()=>validateMember({...member,reason:''}))
})
test('sprints need valid explicit dates and cannot end before they start',()=>{
 const sprint={title:'First sprint',goal:'Prototype',startsAt:'2027-04-01T09:00:00+07:00',endsAt:'2027-04-08T09:00:00+07:00'}
 assert.equal(validateSprint(sprint).title,sprint.title)
 assert.throws(()=>validateSprint({...sprint,endsAt:sprint.startsAt}))
 assert.throws(()=>validateSprint({...sprint,startsAt:'tomorrow'}))
 assert.throws(()=>validateSprint({...sprint,state:'active'}))
})
