export const missionKey=(workshop,mission)=>`${workshop.id}:${mission.id}`;
export function missionStatus(workshop,mission,state){
 const record=state.workshopProgress?.[missionKey(workshop,mission)]||{};
 const count=mission.evidence.filter((_,i)=>record.checked?.includes(i)).length;
 const hasEvidence=typeof record.note==='string'&&record.note.trim().length>=30;
 return {count,hasEvidence,ready:count===mission.evidence.length&&hasEvidence,
  reviewed:!!record.reviewedAt&&count===mission.evidence.length&&hasEvidence};
}
export function normalizeWorkshopProgress(value,workshops=[]){
 const result={};
 for(const workshop of workshops)for(const mission of workshop.milestones){
  const key=missionKey(workshop,mission),r=value?.[key];if(!r||typeof r!=='object')continue;
  result[key]={note:typeof r.note==='string'?r.note.slice(0,6000):'',
   checked:Array.isArray(r.checked)?[...new Set(r.checked.filter(i=>Number.isInteger(i)&&i>=0&&i<mission.evidence.length))]:[],
   reviewedAt:typeof r.reviewedAt==='string'?r.reviewedAt.slice(0,50):''};
 }
 return result;
}
export function normalizePortfolio(value,rubric=[]){
 const result={};for(const r of rubric){const row=value?.[r.id];if(!row||typeof row!=='object')continue;result[r.id]={score:Number.isInteger(row.score)&&row.score>=0&&row.score<r.levels.length?row.score:null,evidence:typeof row.evidence==='string'?row.evidence.slice(0,3000):''};}return result;
}
export function handoff(workshop,mission,state){
 const r=state.workshopProgress?.[missionKey(workshop,mission)]||{};
 return `${workshop.number} ${workshop.title}\n里程碑：${mission.title}\n\n要解决的问题：${mission.why}\n\n本次命令：\n${mission.command}\n\n实际证据（学习者自报）：\n${r.note||'尚未记录'}\n\n验收清单：\n${mission.evidence.map((x,i)=>`${r.checked?.includes(i)?'[x]':'[ ]'} ${x}`).join('\n')}\n\n下一轮带练：请先检查我对输入、目标、指标和结果的解释，再让我只修改一个变量。不要直接跳到更大的模型。\n`;
}
