import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {architectures,architectureGroups,architectureRelations,architectureModels,architectureSources} from '../dist/data/architectures.js';
import {architectureLessons} from '../dist/data/architecture-lessons.js';
import {architectureExercises} from '../dist/data/architecture-practice.js';
import {architectureBudget,causalSelection,deltaStep,scalarSSM} from '../dist/architecture-lab.js';
import {architecturePage} from '../dist/architecture-ui.js';
import {workshops} from '../dist/data/workshops.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';

test('architecture map has connected families, real source keys and runnable learning links',()=>{
 const ids=new Set(architectures.map(x=>x.id)),lessons=new Set(architectureLessons.map(x=>x.id)),codes=new Set(architectureExercises.map(x=>x.id)),projects=new Set(workshops.map(x=>x.id));
 assert.equal(ids.size,architectures.length);assert.ok(architectures.length>=80);assert.equal(architectureGroups.length,11);
 for(const id of ['swa','ssm','s4','mamba','mamba2','mamba3','dsa','kda','gdn','moe','dino','decoder-only','mla','gqa','nsa','moba','titans'])assert.ok(ids.has(id),id);
 for(const x of architectures){assert.ok(architectureGroups.some(g=>g.id===x.group));for(const k of ['purpose','mechanism','cost','experiment'])assert.ok(x[k],x.id+':'+k);assert.ok(x.sources.length);for(const s of x.sources)assert.ok(architectureSources[s],s);assert.ok(architectureRelations.some(r=>r.from===x.id||r.to===x.id),x.id+' must have a relation');}
 for(const g of architectureGroups){assert.ok(lessons.has(g.lesson));g.projects.forEach(p=>assert.ok(projects.has(p)));}
 for(const r of architectureRelations){assert.ok(ids.has(r.from)&&ids.has(r.to));assert.ok(r.kind&&r.label);}
 for(const m of architectureModels){m.parts.forEach(id=>assert.ok(ids.has(id)));assert.ok(architectureSources[m.source]);}
 for(const l of architectureLessons){assert.ok(l.sections.length>=4);assert.ok(l.sections.flatMap(s=>s.body).join('').length>600,l.id);assert.ok(l.worked.steps.length>=4);assert.ok(l.checks.length>=2);l.terms.forEach(t=>assert.ok(ids.has(t)));l.code.forEach(c=>assert.ok(codes.has(c)));l.projects.forEach(p=>assert.ok(projects.has(p)));l.sources.forEach(s=>assert.ok(architectureSources[s]));for(const q of l.checks){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.ok(q.explanation.length>20);}}
 for(const s of Object.values(architectureSources))assert.ok(['arxiv.org','github.com','huggingface.co'].includes(new URL(s.url).hostname));
 for(const ex of architectureExercises){assert.ok(ex.architecture&&ex.tests.length>=5&&ex.examples.length===2);assert.ok(ex.solution.includes('def '));assert.ok(architectureLessons.some(l=>l.code.includes(ex.id)));}
});

test('cache budgets include both K/V, causal warmup and correct state dtype',()=>{
 const r=architectureBudget();assert.equal(r.mha,4*1024**3);assert.equal(r.gqa,1024**3);assert.equal(r.mqa,128*1024**2);assert.equal(r.swa,128*1024**2);assert.equal(r.mla,288*1024**2);assert.equal(r.state,64*1024**2);
 const small=architectureBudget({tokens:4,window:2,topk:3,kvHeads:8});assert.equal(small.densePairs,10);assert.equal(small.windowPairs,7);assert.equal(small.sparsePairs,9);assert.equal(small.indexPairs,10);
 const whole=architectureBudget({tokens:4,window:8,topk:8,kvHeads:8});assert.equal(whole.swa,whole.gqa);assert.equal(whole.windowPairs,10);
 for(const bad of [{tokens:0},{tokens:1.5},{tokens:NaN},{window:-1},{kvHeads:3},{topk:Infinity}])assert.throws(()=>architectureBudget(bad));
});

test('causal selection and state updates expose future, order and streaming errors',()=>{
 assert.deepEqual(causalSelection([2,9,4,100],2,2),[1,2]);assert.deepEqual(causalSelection([3,3,1],2,2),[0,1]);assert.deepEqual(causalSelection([-1,-2],0,2),[0]);assert.deepEqual(causalSelection([1],0,0),[]);assert.throws(()=>causalSelection([NaN],0,1));
 const r=deltaStep();assert.deepEqual(r.decayed,[[1,0],[0,4]]);assert.deepEqual(r.prediction,[1,0]);assert.deepEqual(r.error,[4,1]);assert.deepEqual(r.state,[[3,.5],[0,4]]);assert.deepEqual(r.output,[3,4.5]);assert.deepEqual(deltaStep([.5,1],0).state,[[1,0],[0,4]]);assert.throws(()=>deltaStep([2,1],.5));
 const whole=scalarSSM(.8,[1,0,0,0]),first=scalarSSM(.8,[1,0]),last=scalarSSM(.8,[0,0],first.at(-1));assert.deepEqual(whole,[...first,...last]);assert.equal(scalarSSM(0,[1,0]).at(-1),0);assert.deepEqual(scalarSSM(1,[1,0,0]),[1,1,1]);
});

test('architecture assessment normalization preserves old backups and rejects forged answer records',()=>{
 const catalog={architectureLessons,exercises:architectureExercises};
 assert.deepEqual(normalizeState({version:1},catalog).architectureChecks,{});
 const state=createState();state.architectureChecks={'foundation:0':1,'state:1':100,'fake:0':0,'delta:0':'1'};state.code={'arch-ssm-scan':'# my code'};
 const loaded=normalizeState(state,catalog);assert.deepEqual(loaded.architectureChecks,{'foundation:0':1});assert.equal(loaded.code['arch-ssm-scan'],'# my code');
});

test('all architecture views render, with source links, exercises and accessible selectors',()=>{
 for(const path of ['','map','catalog','compare','models','lab',...architectures.map(x=>'catalog/'+x.id),...architectureLessons.map(x=>'learn/'+x.id)]){
  const html=architecturePage(path,createState());assert.ok(!html.includes('undefined'),path);const dom=new JSDOM(html);assert.equal(dom.window.document.querySelectorAll('h1').length,1);assert.ok(dom.window.document.querySelector('nav[aria-label]'));dom.window.close();
 }
});

test('integrated structure routes grade, persist, compare, filter and execute through the shared code runner',async()=>{
 const css=await readFile(new URL('../dist/architecture.css',import.meta.url),'utf8');
 const dom=new JSDOM((await readFile(new URL('../dist/index.html',import.meta.url),'utf8')).replace('</head>','<style>'+css+'</style></head>'),{url:'http://localhost:4173',pretendToBeVisual:true}),w=dom.window,errors=[];
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 w.scrollTo=()=>{};w.addEventListener('error',ev=>errors.push(ev.error));globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const workers=[];globalThis.Worker=class{constructor(){workers.push(this);}postMessage(msg){this.message=msg;}terminate(){this.stopped=true;}};
 await import('../dist/app.js');
 const q=s=>{const el=w.document.querySelector(s);assert.ok(el,s);return el;};
 const nav=async path=>{w.location.hash='#/'+path;await new Promise(resolve=>w.setTimeout(resolve,10));assert.deepEqual(errors,[]);};
 const input=(sel,value,event='input')=>{const el=q(sel);el.value=value;el.dispatchEvent(new w.Event(event,{bubbles:true}));};
 q('a[href="#/architectures"]');
 await nav('architectures');assert.equal(w.document.querySelectorAll('.arch-lesson-card').length,11);
 await nav('architectures/learn/state');q('[data-check="state:0"] input[value="0"]').click();assert.match(q('[data-check="state:0"] .arch-feedback').textContent,/还差一步/);q('[data-check="state:0"] input[value="1"]').click();assert.match(q('[data-check="state:0"] .arch-feedback').textContent,/理解正确/);assert.equal(JSON.parse(w.localStorage.getItem(STORAGE_KEY)).architectureChecks['state:0'],1);
 await nav('architectures/learn/foundation');await nav('architectures/learn/state');assert.equal(q('[data-check="state:0"] input[value="1"]').checked,true);
 await nav('architectures/catalog');input('#architecture-search','mamba');assert.equal(w.document.querySelectorAll('.arch-catalog-card').length>0,true);input('#architecture-category','vision','change');assert.ok(q('.arch-empty'));q('#architecture-clear').click();assert.equal(w.document.querySelectorAll('.arch-catalog-card').length,architectures.length);
 await nav('architectures/catalog/ssm');assert.match(q('#architecture-detail').textContent,/状态空间/);q('a[href="#/architectures/learn/state"]');
 await nav('architectures/compare/ssm');assert.equal(q('.arch-compare-select').value,'ssm');input('.arch-compare-select[data-slot="1"]','moe','change');assert.match(q('#architecture-comparison').textContent,/不同设计轴/);
 await nav('architectures/lab');assert.match(q('#arch-budget-output').textContent,/4096 MiB/);input('#arch-tokens','0');assert.match(q('#arch-budget-output').textContent,/1–65536/);input('#arch-tokens','4');assert.match(q('#arch-budget-output').textContent,/MiB/);
 input('#arch-query','2');assert.equal(w.document.querySelectorAll('.arch-mask-row:last-child .visible').length,3);assert.match(q('#arch-delta-output').textContent,/\[3,4.5\]/);input('#arch-beta','0');assert.match(q('#arch-delta-output').textContent,/\[1,4\]/);input('#arch-ssm-a','1');assert.match(q('#arch-ssm-output').textContent,/状态保持/);
 await nav('code');assert.equal(w.document.querySelectorAll('a[href^="#/code/arch-"]').length,7);
 for(const ex of architectureExercises){await nav('code/'+ex.id);assert.equal(q('#code-editor').dataset.exercise,ex.id);assert.ok(q('#custom-call'));assert.match(q('h1').textContent,new RegExp(ex.title.slice(0,3)));}
 const ex=architectureExercises[0];await nav('code/'+ex.id);input('#code-editor',ex.solution);q('[data-action="sample-code"]').click();assert.equal(workers.at(-1).message.tests.length,2);workers.at(-1).onmessage({data:{type:'result',result:{tests:ex.tests.slice(0,2).map(t=>({name:t.name,passed:true})),stdout:'',error:null}}});assert.equal(JSON.parse(w.localStorage.getItem(STORAGE_KEY)).codeResults[ex.id],undefined);
 q('[data-action="run-code"]').click();assert.equal(workers.at(-1).message.tests.length,ex.tests.length);workers.at(-1).onmessage({data:{type:'result',result:{tests:ex.tests.map(t=>({name:t.name,passed:true})),stdout:'',error:null}}});assert.equal(JSON.parse(w.localStorage.getItem(STORAGE_KEY)).codeResults[ex.id].passed,ex.tests.length);
 await nav('architectures/learn/state');assert.equal(q('[data-check="state:0"] input[value="1"]').checked,true);assert.deepEqual(errors,[]);dom.window.close();
});
