import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {workshops,portfolioRubric} from '../dist/data/workshops.js';
import {projectStages} from '../dist/data/projects.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';
import {missionKey,missionStatus,handoff} from '../dist/workshop-state.js';
import {workshopReportHTML} from '../dist/workshop-ui.js';

test('ten workshops connect fifty concrete milestones to runnable assets, comparisons and defenses',async()=>{
 assert.equal(workshops.length,10);assert.equal(workshops.filter(w=>w.core).length,7);
 assert.equal(workshops.filter(w=>w.core).reduce((n,w)=>n+w.hours,0),106);
 assert.equal(workshops.flatMap(w=>w.milestones).length,50);
 const ids=new Set(projectStages.map(s=>s.id));
 for(const w of workshops){
  assert.equal(w.milestones.length,5);assert.equal(new Set(w.milestones.map(m=>m.id)).size,5);
  assert.ok(w.intro.length>=2);assert.equal(w.terms.length,3);assert.ok(w.compare.length>=3);assert.ok(w.defense.length>=3);
  for(const id of w.prerequisites)assert.ok(ids.has(id),id);
  for(const [path] of w.files)assert.ok((await readFile(path)).length>0,path);
  for(const m of w.milestones){
   assert.ok(m.why.length>50);assert.equal(m.actions.length,3);assert.ok(m.expected&&m.debug);
   assert.ok(m.question&&m.answer);assert.equal(m.evidence.length,2);
   const entry=m.command.split(' ')[1];assert.ok((await readFile(entry)).length>0,entry);
  }
 }
 assert.match(workshops.find(w=>w.id==='vision').scope,/DINO.*未/);
 assert.match(workshops.find(w=>w.id==='memory').scope,/待验收/);
});

test('workshop self-review requires evidence but remains separate from graded mechanism results',()=>{
 const w=workshops[0],m=w.milestones[0],key=missionKey(w,m),state=createState();
 state.workshopProgress[key]={note:'待做',checked:[0,1],reviewedAt:'2026-11-08'};
 assert.equal(missionStatus(w,m,state).reviewed,false);
 state.workshopProgress[key].note='我固定数据与随机种子，只改变了一个变量；这里保存实际指标、错误信息和下一次验证方案。';
 assert.equal(missionStatus(w,m,state).reviewed,true);
 state.portfolio.task={score:null,evidence:'先记下样本审计证据，尚未选分档。'};
 const restored=normalizeState(state,{workshops,portfolioRubric});
 assert.equal(missionStatus(w,m,restored).reviewed,true);
 assert.equal(restored.portfolio.task.evidence,state.portfolio.task.evidence);
 assert.deepEqual(restored.codeResults,{});assert.deepEqual(restored.projects,{});
 restored.workshopProgress[key].checked=[0];assert.equal(missionStatus(w,m,restored).reviewed,false);
 state.workshopProgress[key].checked=[0,1,99,'bad'];state.workshopProgress.unknown={};state.portfolio.task.score=99;
 const safe=normalizeState(state,{workshops,portfolioRubric});assert.deepEqual(safe.workshopProgress[key].checked,[0,1]);assert.equal(safe.portfolio.task.score,null);assert.equal(safe.workshopProgress.unknown,undefined);
 assert.match(handoff(w,m,safe),/学习者自报/);
 assert.deepEqual(normalizeState({version:1},{workshops,portfolioRubric}).workshopProgress,{});
});

test('report rendering does not execute user content or accept unknown schemas',()=>{
 assert.throws(()=>workshopReportHTML({schema:'unknown'}));
 assert.match(workshopReportHTML([{step:0,validation_loss:3.2}]),/微型语言模型/);
 assert.throws(()=>workshopReportHTML([{step:0,validation_loss:'wrong'}]));
 const html=workshopReportHTML({schema:'model-craft-advanced-v1',experiment:'<script>alert(1)</script>',metrics:{score:1}});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/不会改变自查状态/);
});

test('all workshop routes, evidence controls, notes and rubric persist without awarding code points',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/',pretendToBeVisual:true});
 const w=dom.window,errors=[];w.addEventListener('error',ev=>errors.push(ev.error));
 for(const k of ['window','document','location','localStorage','FormData'])globalThis[k]=k==='window'?w:w[k];
 globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
 await import('../dist/app.js');
 const tick=()=>new Promise(resolve=>w.setTimeout(resolve,8));
 const nav=async p=>{w.location.hash='#/projects'+(p?'/'+p:'');await tick();assert.deepEqual(errors,[]);};
 const node=s=>{const n=w.document.querySelector(s);assert.ok(n,s);return n;};
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 await nav('');assert.equal(w.document.querySelectorAll('.workshop-card').length,10);
 for(const project of workshops)for(const m of project.milestones){await nav('workshop-'+project.id+'/'+m.id);assert.equal(node('h1').textContent,project.title);assert.equal(node('#workshop-note').dataset.mission,m.id);}
 const project=workshops[0],m=project.milestones[0],key=missionKey(project,m);await nav('workshop-'+project.id+'/'+m.id);
 assert.equal(node('[data-action="workshop-review"]').disabled,true);
 node('#workshop-note').value='我固定种子与数据，检查了输入和标签的对齐；实际第一目标来自第二个输入位置，下一次会验证 padding 不参与 loss。';
 node('#workshop-note').dispatchEvent(new w.Event('input',{bubbles:true}));
 for(const box of w.document.querySelectorAll('.workshop-check'))box.click();
 assert.equal(node('[data-action="workshop-review"]').disabled,false);
 node('[data-action="workshop-review"]').click();assert.match(node('#workshop-completion').textContent,/已记录自查/);
 assert.ok(saved().workshopProgress[key].reviewedAt);assert.deepEqual(saved().codeResults,{});
 await nav('workshop-vision');await nav('workshop-'+project.id+'/'+m.id);assert.match(node('#workshop-note').value,/padding/);
 node('.workshop-check').click();assert.equal(node('[data-action="workshop-review"]').disabled,true);
 await nav('');node('#rubric-evidence-task').value='数据审计在我自己的实验报告中，尚未选分档。';node('#rubric-evidence-task').dispatchEvent(new w.Event('input',{bubbles:true}));
 node('#rubric-task').value='2';node('#rubric-task').dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(saved().portfolio.task.score,2);assert.match(saved().portfolio.task.evidence,/数据审计/);
 await nav('workshop-pretrain/unknown');assert.equal(w.document.querySelector('#workshop-note'),null);
 assert.deepEqual(errors,[]);dom.window.close();
});
