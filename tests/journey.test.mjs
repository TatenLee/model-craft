import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {journeyStages,robotModules,robotRoot} from '../dist/data/journey.js';
import {journeyExercises} from '../dist/data/journey-practice.js';
import {journeyStatus,nextJourneyStage,normalizeJourney} from '../dist/journey-state.js';
import {journeyPage,blueprintPage,libraryPage,placementFor,calibration,distillExample} from '../dist/journey-ui.js';
import {lessons,lessonExamples} from '../dist/data/curriculum.js';
import {days} from '../dist/data/days.js';
import {exercises} from '../dist/data/exercises.js';
import {dailyChallenges} from '../dist/data/practice/index.js';
import {projectExercises,projectStages} from '../dist/data/projects.js';
import {workshops} from '../dist/data/workshops.js';
import {architectureExercises} from '../dist/data/architecture-practice.js';
import {architectures} from '../dist/data/architectures.js';
import {concepts} from '../dist/data/concepts.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';
import {codeFingerprint} from '../dist/daily-state.js';
const allExercises=[...exercises,...dailyChallenges,...projectExercises,...architectureExercises,...journeyExercises,...lessonExamples];

test('one causal spine maps every original lesson, project, concept and architecture to a stage',async()=>{
 const ids=new Set(journeyStages.map(s=>s.id));assert.equal(ids.size,20);assert.ok(journeyStages.reduce((n,s)=>n+s.hours,0)<=130);
 assert.equal(journeyStages[0].id,'scalar');assert.equal(journeyStages.at(-1).id,'audit');
 for(const [i,s] of journeyStages.entries()){
  assert.equal(s.previous,journeyStages[i-1]?.id||null);assert.equal(s.nextId,journeyStages[i+1]?.id||null);
  assert.deepEqual(s.requires,i?[journeyStages[i-1].id]:[]);assert.ok(robotModules.some(m=>m.id===s.module));
  for(const field of ['before','problem','diagnosis','upgrade','reuse','next'])assert.ok(s[field],s.id+field);
  assert.ok(s.teaching.length>=2&&s.worked.length>=3&&s.tasks.length===3&&s.checks.length===2);
  assert.ok(allExercises.some(ex=>ex.id===s.exerciseId));for(const file of s.files)await access(new URL('../'+robotRoot+file,import.meta.url));
  s.lessons.forEach(id=>assert.ok(lessons.some(l=>l.id===id)));
 }
 for(const m of robotModules){await access(new URL('../'+robotRoot+m.path,import.meta.url));assert.ok(ids.has(m.stage));}
 for(const l of lessons){assert.ok(journeyStages.some(s=>s.lessons.includes(l.id)),l.id);assert.ok(ids.has(placementFor('lesson',l.id)));}
 for(const d of days)assert.ok(ids.has(placementFor('day',d.id)),d.id);
 for(const w of workshops)assert.ok(ids.has(placementFor('projects','workshop-'+w.id)),w.id);
 for(const m of projectStages)assert.ok(ids.has(placementFor('projects',m.id)),m.id);
 for(const a of architectures)assert.ok(ids.has(placementFor('architectures','catalog/'+a.id)),a.id);
 for(const c of concepts)assert.ok(ids.has(placementFor('concepts',c.id)),c.id);
 assert.equal(placementFor('concepts','mopd'),'mopd');assert.equal(placementFor('concepts','mopd-prompts'),'vision');assert.equal(placementFor('concepts','agentic'),'agent');
});

test('completion requires fresh full code, understood causes and an observation in either build mode',()=>{
 const s=journeyStages[0],ex=allExercises.find(x=>x.id===s.exerciseId),state=createState();assert.equal(nextJourneyStage(state,allExercises).id,'scalar');
 state.journey[s.id]={mode:'reuse',tasks:[0,1,2],answers:Object.fromEntries(s.checks.map((q,i)=>[i,q.answer])),note:'我运行了样例并修改输入，看到参数共享和输入顺序都保持，空列表也通过。',completedAt:'2026-11-10'};
 assert.equal(journeyStatus(s,state,ex).complete,false);
 state.code[ex.id]=ex.solution;state.codeResults[ex.id]={status:'success',passed:ex.tests.length,total:ex.tests.length,codeHash:codeFingerprint(ex.solution)};
 assert.equal(journeyStatus(s,state,ex).complete,true);assert.equal(nextJourneyStage(state,allExercises).id,'fit');
 state.code[ex.id]+='\n# changed';assert.equal(journeyStatus(s,state,ex).complete,false);
 const imported=normalizeState(state,{exercises:allExercises});assert.equal(imported.journey[s.id].mode,'reuse');assert.equal(journeyStatus(s,imported,ex).complete,false);
 assert.deepEqual(normalizeState({version:1},{}).journey,{});
 const cleaned=normalizeJourney({scalar:{mode:'fake',answers:{0:100,1:'1'},tasks:[0,0,-1,9],note:123,completedAt:true},unknown:{}});assert.deepEqual(cleaned.scalar.tasks,[0]);assert.deepEqual(cleaned.scalar.answers,{});assert.equal(cleaned.scalar.note,'');assert.equal(cleaned.scalar.mode,'build');
});

test('live calibration and distillation teach distinct numerical signals',()=>{
 const r=calibration(2,1);assert.equal(r.loss,0);assert.deepEqual(r.pred,[-1,1,3,5]);
 const old=calibration(0,0);assert.ok(calibration(-.05*old.dw,-.05*old.db).loss<old.loss);assert.throws(()=>calibration(NaN,0));
 const signal=distillExample(.2,.6);assert.ok(Math.abs(signal.signal-Math.log(3))<1e-12);assert.ok(signal.reverseKL>=0);assert.notEqual(signal.reverseKL,signal.signal);assert.equal(distillExample(.5,.5).reverseKL,0);assert.throws(()=>distillExample(0,.6));
});

test('every stage includes an embedded exercise, before/after story, real file references and inline course material',()=>{
 const state=createState(),editor=ex=>`<textarea id="code-editor" data-exercise="${ex.id}"></textarea>`;
 for(const s of journeyStages){const html=journeyPage(s.id,state,allExercises,editor);assert.ok(!html.includes('undefined'),s.id);const dom=new JSDOM(html),doc=dom.window.document;assert.equal(doc.querySelectorAll('#code-editor').length,1);assert.equal(doc.querySelectorAll('.journey-cause>div').length,4);assert.equal(doc.querySelectorAll('.journey-question').length,2);assert.equal(doc.querySelectorAll('.journey-reference').length,s.lessons.length);assert.equal(doc.querySelectorAll('.journey-task').length,3);dom.window.close();}
 for(const m of robotModules)assert.ok(!blueprintPage(m.id).includes('undefined'));
 assert.ok(!libraryPage().includes('undefined'));
});

test('mainline navigation, module placement, embedded grading, reuse, time choice and old links work together',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),css=await readFile(new URL('../dist/journey.css',import.meta.url),'utf8');
 const dom=new JSDOM(html.replace('</head>','<style>'+css+'</style></head>'),{url:'http://localhost:4173',pretendToBeVisual:true}),w=dom.window,errors=[];
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 w.scrollTo=()=>{};w.addEventListener('error',ev=>errors.push(ev.error));globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const workers=[];globalThis.Worker=class{constructor(){workers.push(this);}postMessage(message){this.message=message;}terminate(){this.stopped=true;}};
 await import('../dist/app.js');
 const q=s=>{const el=w.document.querySelector(s);assert.ok(el,s);return el;};
 const nav=async path=>{w.location.hash='#/'+path;await new Promise(resolve=>w.setTimeout(resolve,12));assert.deepEqual(errors,[]);};
 const input=(sel,value,event='input')=>{const el=q(sel);el.value=value;el.dispatchEvent(new w.Event(event,{bubbles:true}));};
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 assert.match(q('h1').textContent,/wx\+b/);assert.equal(q('.nav-reference').open,false);assert.equal(w.document.querySelectorAll('.journey-road-card').length,20);
 q('[data-journey-minutes="30"]').click();assert.equal(saved().journeyMinutes,30);assert.match(q('#journey-session-plan').textContent,/今天只完成/);
 for(const s of journeyStages){await nav('journey/'+s.id);assert.equal(q('#code-editor').dataset.exercise,s.exerciseId);assert.match(q('h1').textContent,new RegExp(s.number));}
 await nav('journey/scalar');assert.equal(w.document.querySelector('#journey-update'),null);input('#journey-w','2');input('#journey-b','1');assert.match(q('#journey-calibration').textContent,/MSE：0/);
 q('[name="journey-mode"][value="reuse"]').click();assert.equal(saved().journey.scalar.mode,'reuse');assert.match(q('#journey-reuse-note').textContent,/复用/);
 const s=journeyStages[0],ex=allExercises.find(x=>x.id===s.exerciseId);s.checks.forEach((check,i)=>q(`.journey-question[data-index="${i}"] input[value="${check.answer}"]`).click());w.document.querySelectorAll('.journey-task').forEach(el=>el.click());input('#journey-note','输入与参数共享的契约已核对；修改 w 后每个样本同步变化，空列表仍返回空列表。');assert.equal(q('#journey-complete').disabled,true);
 input('#code-editor',ex.solution);q('[data-action="sample-code"]').click();workers.at(-1).onmessage({data:{type:'result',result:{tests:ex.tests.slice(0,2).map(t=>({name:t.name,passed:true})),stdout:'',error:null}}});assert.equal(q('#journey-complete').disabled,true);
 q('[data-action="run-code"]').click();workers.at(-1).onmessage({data:{type:'result',result:{tests:ex.tests.map(t=>({name:t.name,passed:true})),stdout:'',error:null}}});assert.equal(q('#journey-complete').disabled,false);q('#journey-complete').click();assert.ok(saved().journey.scalar.completedAt);assert.match(q('#journey-overall-count').textContent,/1 \/ 20/);
 input('#code-editor',ex.solution+'\n# edited');assert.equal(q('#journey-complete').disabled,true);assert.match(q('#journey-overall-count').textContent,/0 \/ 20/);
 const editor=q('#code-editor');input('[data-ui-theme]','dark','change');q('[data-action="sidebar-toggle"]').click();assert.equal(q('#code-editor'),editor);
 await nav('journey/fit');q('#journey-update').click();assert.match(q('#journey-calibration').textContent,/更新前/);
 await nav('journey/mopd');assert.match(q('#journey-distill-output').textContent,/1.09861/);input('#journey-student-p','0');assert.ok(q('#journey-distill-output [role="alert"]'));
 await nav('blueprint/training');assert.match(q('h1').textContent,/骨架/);assert.match(q('.journey-blueprint-layout').textContent,/distill/);
 await nav('library');input('#journey-library-search','MOPD');assert.match(q('#journey-library-results').textContent,/R15/);
 await nav('lesson/w1-l1');assert.ok(q('.journey-resource-context a[href="#/journey/scalar"]'));assert.equal(q('.nav-reference').open,true);
 await nav('concepts/mopd');assert.ok(q('.journey-resource-context a[href="#/journey/mopd"]'));assert.match(q('.concept-detail').textContent,/Multi-Teacher/);
 await nav('journey/scalar');assert.equal(q('#journey-note').value,saved().journey.scalar.note);assert.equal(q('#code-editor').value,saved().code[ex.id]);
 await nav('code/journey-distill-signal');assert.equal(q('#code-editor').dataset.exercise,'journey-distill-signal');assert.ok(q('#journey-note'));assert.deepEqual(errors,[]);dom.window.close();
});
