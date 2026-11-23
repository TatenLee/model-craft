import {practiceProjects,practiceById} from './data/practice-projects.js';
export const emptyPractice=()=>({active:'vision-baseline',projects:{}});
export function normalizePractice(raw){
 const result=emptyPractice();if(practiceById.has(raw?.active))result.active=raw.active;
 for(const p of practiceProjects){const r=raw?.projects?.[p.id];if(!r||typeof r!=='object')continue;const notes={},reviewed=[];
 p.steps.forEach((_,i)=>{const n=r.notes?.[i];if(typeof n==='string')notes[i]=n.slice(0,6000);if(Array.isArray(r.reviewed)&&r.reviewed.includes(i)&&(notes[i]||'').trim().length>=40)reviewed.push(i);});
 result.projects[p.id]={notes,reviewed};}return result;
}
export const practiceRecord=(state,id)=>state.practice.projects[id]??={notes:{},reviewed:[]};
export function validateVisionReport(r){
 if(r?.schema!=='model-craft-real-vision-v1'||!Array.isArray(r.history)||r.history.length<1||r.history.length>10000)throw new Error('需要 real-vision 训练器生成的 report.json');
 if(!['cnn','linear'].includes(r.config?.arch)||typeof r.config?.data_sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.config.data_sha256))throw new Error('缺少模型配置或数据指纹');
 let previous=0;for(const h of r.history){if(!Number.isInteger(h.epoch)||h.epoch<=previous)throw new Error('epoch 记录无效');previous=h.epoch;for(const k of ['train_loss','val_loss','train_accuracy','val_accuracy'])if(!Number.isFinite(h[k])||h[k]<0||(k.includes('accuracy')&&h[k]>1))throw new Error('训练指标无效');}
 return {arch:r.config.arch,hash:r.config.data_sha256,history:r.history.map(h=>({...h})),majority:r.majority_validation_accuracy};
}
