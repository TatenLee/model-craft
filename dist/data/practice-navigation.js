import {practiceProjects} from './practice-projects.js';

export const practiceGroups=[
 {id:'basics',title:'训练基本功',projects:['vision-baseline','language']},
 {id:'alignment',title:'语言后训练',projects:['sft','preference','rl']},
 {id:'engineering',title:'应用与推理工程',projects:['retrieval','serving']},
 {id:'generation',title:'视觉、图像与视频',projects:['representation','image','video']},
 {id:'embodied',title:'世界模型与具身',projects:['imitation','world','vla','brain']},
];
export function matchingProjects(query){
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return practiceProjects.filter(p=>{
  const group=practiceGroups.find(g=>g.projects.includes(p.id));
  const text=[p.title,p.kind,p.output,group?.title,...p.reads.map(r=>r[0]),...p.assets.map(a=>a.label)].join(' ').toLocaleLowerCase();
  return words.every(word=>text.includes(word));
 }).map(p=>p.id);
}
