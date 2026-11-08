import {codeAccepted} from './daily-state.js';

export function projectStatus(stage,state){
 const record=state.projects?.[stage.id]||{};
 const quiz=record.selected===stage.check.answer;
 const code=codeAccepted(stage.exercise,state);
 const taught=record.viewed===true;
 return {quiz,code,taught,ready:quiz&&code&&taught,completed:!!record.completedAt&&quiz&&code&&taught,
  hasNotes:!!record.notes?.observation,usedSolution:state.solutionsViewed.includes(stage.exercise.id)};
}
export function normalizeProjects(value,stages=[]){
 const out={};
 for(const stage of stages){
  const row=value?.[stage.id];if(!row||typeof row!=='object')continue;
  const notes={};for(const key of ['hypothesis','observation','explanation','next'])notes[key]=typeof row.notes?.[key]==='string'?row.notes[key].slice(0,8000):'';
  out[stage.id]={viewed:row.viewed===true,step:Number.isInteger(row.step)?Math.max(0,Math.min(3,row.step)):0,
   selected:Number.isInteger(row.selected)&&row.selected>=0&&row.selected<stage.check.options.length?row.selected:null,
   completedAt:typeof row.completedAt==='string'?row.completedAt.slice(0,50):'',notes};
 }
 return out;
}
// A report is a learner-provided observation, not proof that training happened.
export function validateWorldReport(raw){
 if(!raw||raw.schema!=='model-craft-world-v1')throw new Error('请选择 world-lab 生成的 report.json。');
 const number=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0)throw new Error(label+' 无效');return n;};
 if(!['mlp','transformer','gru'].includes(raw.config?.arch)||!['full','partial'].includes(raw.config?.observation))throw new Error('未知实验配置');
 const metrics=v=>({one_step_mse:number(v?.one_step_mse,'单步误差'),rollout_mse:number(v?.rollout_mse,'rollout 误差'),persistence_rollout_mse:number(v?.persistence_rollout_mse,'基线误差')});
 return {schema:raw.schema,config:{arch:raw.config.arch,observation:raw.config.observation,seed:number(raw.config.seed,'seed'),width:number(raw.config.width,'width'),lr:number(raw.config.lr,'lr'),batch_size:number(raw.config.batch_size,'batch')},
  step:number(raw.step,'step'),parameters:number(raw.parameters,'parameters'),device:String(raw.device||'').slice(0,20),
  source_sha256:/^[a-f0-9]{64}$/.test(raw.source_sha256)?raw.source_sha256:'unknown',validation:metrics(raw.validation),
  latency:{p50_ms:number(raw.latency?.p50_ms,'p50'),p95_ms:number(raw.latency?.p95_ms,'p95'),mode:'full_prefix_no_cache'}};
}
export function validateSourceMap(raw){
 if(!raw||raw.schema!=='model-craft-source-v1')throw new Error('请选择本地 inspect_repo.py 生成的索引。');
 const groups={};
 for(const key of ['data','vision','backbone','loss','state','training','inference']){
  const rows=raw.groups?.[key];if(!Array.isArray(rows))throw new Error('源码索引缺少 '+key+' 分组');
  groups[key]=rows.slice(0,12).map(r=>{
   if(typeof r.file!=='string'||r.file.startsWith('/')||r.file.split('/').includes('..')||!r.file.endsWith('.py')||!Number.isInteger(r.line)||r.line<1)throw new Error('源码位置无效');
   return {file:r.file.slice(0,300),line:r.line,symbol:String(r.symbol||'').slice(0,120),sha256:/^[a-f0-9]{64}$/.test(r.sha256)?r.sha256:'unknown'};
  });
 }
 return {revision:String(raw.revision||'unknown').slice(0,80),dirty:raw.dirty===true,groups};
}
