import type { Role, Section } from '../shared/domain'
export const demoClasses: Section[] = [
  {id:'demo-web',offering_id:'web',title:'Web Development',department:'CS',kind:'core',capacity:30,enrolled:24,day:'Monday',room:'B-201',trainer:'Alex & teaching team'},
  {id:'demo-data',offering_id:'data',title:'Data Structures',department:'CS',kind:'core',capacity:30,enrolled:27,day:'Tuesday',room:'B-203',trainer:'Sam & teaching team'},
  {id:'demo-design',offering_id:'design',title:'Digital Product Design',department:'DB',kind:'elective',capacity:25,enrolled:18,day:'Wednesday',room:'A-102',trainer:'River & teaching team'},
  {id:'demo-security',offering_id:'security',title:'Cybersecurity Essentials',department:'TN',kind:'elective',capacity:30,enrolled:22,day:'Thursday',room:'C-104',trainer:'Kai & teaching team'},
  {id:'demo-commerce',offering_id:'commerce',title:'E-commerce Fundamentals',department:'DB',kind:'core',capacity:25,enrolled:20,day:'Monday',room:'A-101',trainer:'Digital Business team'},
  {id:'demo-network',offering_id:'network',title:'Network Foundations',department:'TN',kind:'elective',capacity:20,enrolled:20,day:'Thursday',room:'C-202',trainer:'Networking team'},
]
export const roleGoals: Record<Role,{ title:string; description:string; actions:string[] }> = {
  Trainee:{title:'Make room for what’s next.',description:'Your classes, your progress, and the people helping you take the next step.',actions:['Choose your subjects','View your timetable','Review your attendance']},
  Trainer:{title:'Teach. Build. Make an impact.',description:'Morning classes and afternoon projects, together in one workspace.',actions:['Prepare class materials','Take session attendance','Open your project board']},
  Volunteer:{title:'Great programs take a team.',description:'Keep your functional team’s responsibilities and next steps in view.',actions:['Review assigned tasks','Coordinate your team','Read program updates']},
  Organizer:{title:'See the whole program.',description:'Coordinate recruitment, learning, projects and the showcase.',actions:['Review admissions','Check program readiness','Prepare the competition']},
  Admin:{title:'Set this edition up for success.',description:'Manage participants, configuration and reviewed exceptions.',actions:['Review participant activation','Check selection readiness','Review access assignments']},
  'Super admin':{title:'Keep Next-Gen moving forward.',description:'Maintain continuity, access and oversight across annual editions.',actions:['Review edition configuration','Review privileged access','Check recovery readiness']},
  Mentor:{title:'Help a team find its way.',description:'Follow assigned projects and guide their next milestone.',actions:['Review team progress','Read deliverables','Provide feedback']},
  Advisor:{title:'Turn good ideas into stronger work.',description:'Review assigned projects and help teams make informed decisions.',actions:['Review project requests','Read deliverables','Share advice']},
  'Guest juror':{title:'Recognize the next generation.',description:'A private, limited workspace for your assigned round and teams.',actions:['Review round agenda','Open assigned scorecards','Check submission status']},
  Audience:{title:'Meet the ideas shaping tomorrow.',description:'Discover the showcase projects and support your favourite team.',actions:['Explore showcase projects','Verify voting eligibility','Cast one vote']},
  Applicant:{title:'Your next chapter starts here.',description:'Learn, teach and build with the Next-Gen community.',actions:['Explore the program','Apply as a trainee','Apply as a trainer']},
}
