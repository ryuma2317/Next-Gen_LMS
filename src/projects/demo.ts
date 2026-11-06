import type { ProjectBoard, ProjectTask } from '../../shared/projects'
export const sampleProject='a0000000-0000-4000-8000-000000000001'
export const sampleMember='a1000000-0000-4000-8000-000000000001'
export const sampleTask='a2000000-0000-4000-8000-000000000001'
export const sampleColumns=[{id:'backlog',title:'Backlog',complete:false},{id:'in_progress',title:'In progress',complete:false},{id:'done',title:'Done',complete:true}]
export function previewBoard(role:string):ProjectBoard {
 const manager=['Organizer','Admin','Super admin'].includes(role),writer=manager||role==='Trainer',comment=writer||role==='Mentor'||role==='Advisor'
 return {id:sampleProject,title:'Campus Connect',theme:'Synthetic theme: make it easier for students to find help across departments.',version:1,archived:false,columns:sampleColumns,limits:{participant:8,mentor:2,advisor:1},can_manage:manager,can_tasks:writer,can_comment:comment,can_sprints:writer,
 members:[{user_id:sampleMember,display_name:'River Demo',role:'participant',active:true,version:1,can_tasks:true,can_comment:true,can_sprints:true}],sprints:[]}
}
export function previewTasks():ProjectTask[] {
 const time='2027-04-01T02:00:00Z'
 return [{id:sampleTask,project_id:sampleProject,title:'Map the student support journey',description:'Interview fictional users, then outline the first prototype. No real participant information belongs in this preview.',column_id:'backlog',assignee_id:sampleMember,sprint_id:null,archived:false,version:1,created_at:time,updated_at:time}]
}
