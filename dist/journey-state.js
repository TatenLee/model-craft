import {journeyStages} from './data/journey.js';
import {codeAccepted} from './daily-state.js';
export function journeyStatus(stage,state,exercise){
 const record=state.journey?.[stage.id]||{},correct=stage.checks.filter((q,i)=>record.answers?.[i]===q.answer).length;
 const code=!!exercise&&codeAccepted(exercise,state),evidence=typeof record.note==='string'&&record.note.trim().length>=20;
 const reviewed=stage.tasks.every((_,i)=>record.tasks?.includes(i));
 const ready=correct===stage.checks.length&&code&&evidence&&reviewed;
 return {correct,code,evidence,reviewed,ready,complete:ready&&!!record.completedAt,mode:record.mode==='reuse'?'reuse':'build',missing:[...(correct<stage.checks.length?['完成理解检查']:[]),...(!code?['提交当前代码并通过全部检查']:[]),...(!reviewed?['核对本节动手任务与实验观察']:[]),...(!evidence?['记录至少 20 字实际观察']:[])]};
}
export function normalizeJourney(value){
 const out={};
 for(const s of journeyStages){const r=value?.[s.id];if(!r||typeof r!=='object')continue;
  const answers={};s.checks.forEach((q,i)=>{const selected=r.answers?.[i];if(Number.isInteger(selected)&&selected>=0&&selected<q.options.length)answers[i]=selected;});
  out[s.id]={mode:r.mode==='reuse'?'reuse':'build',answers,note:typeof r.note==='string'?r.note.slice(0,12000):'',tasks:Array.isArray(r.tasks)?[...new Set(r.tasks.filter(i=>Number.isInteger(i)&&i>=0&&i<s.tasks.length))]:[],completedAt:typeof r.completedAt==='string'?r.completedAt.slice(0,50):''};
 }return out;
}
export function nextJourneyStage(state,exercises){return journeyStages.find(s=>!journeyStatus(s,state,exercises.find(e=>e.id===s.exerciseId)).complete)||journeyStages.at(-1);}
