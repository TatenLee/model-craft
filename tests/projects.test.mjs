import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {projects,projectStages,projectExercises,capabilityMap} from '../dist/data/projects.js';
import {lessons} from '../dist/data/curriculum.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';
import {codeFingerprint} from '../dist/daily-state.js';
import {projectStatus,validateWorldReport,validateSourceMap} from '../dist/project-state.js';
import {sourceHTML,reportHTML} from '../dist/project-ui.js';

test('project stages teach before asking, connect real assets and distinguish mechanisms from experiments',async()=>{
 assert.equal(projects.length,3);assert.equal(projectStages.length,16);
 assert.equal(new Set(projectStages.map(s=>s.id)).size,16);
 const lessonIds=new Set(lessons.map(l=>l.id));
 for(const stage of projectStages){
  assert.ok(projects.some(p=>p.id===stage.projectId));
  assert.ok(stage.story.length>80);assert.equal(stage.explanation.length,2);
  assert.ok(stage.decision.length>10);assert.ok(stage.alternative.length>10);
  assert.equal(stage.experiment.length,3);assert.equal(stage.walkthrough.length,3);
  assert.ok(stage.expected);assert.ok(stage.failure);assert.ok(stage.transfer);
  assert.ok(stage.check.options[stage.check.answer]);assert.ok(stage.check.explanation.length>20);
  for(const id of stage.links)assert.ok(lessonIds.has(id),id);
  for(const source of stage.sources)assert.ok(source.url.startsWith('https://'));
  assert.ok(stage.exercise.tests.length>=3);
  const path=stage.command.split(' ')[1];assert.ok((await readFile(path,'utf8')).length>0,path);
 }
 for(const [,,id] of capabilityMap)assert.ok(lessonIds.has(id),id);
 assert.match(projectStages.find(s=>s.id==='world-memory').story,/不是完整 KDA/);
 assert.match(projectStages.find(s=>s.id==='omnifm-audit').expected,/未验证/);
});

test('project evidence survives backups and stale code or wrong answers cannot complete a stage',()=>{
 const stage=projectStages[0],state=createState(),ex=stage.exercise;
 state.projects[stage.id]={step:3,viewed:true,selected:stage.check.answer,notes:{observation:'真实观察'},completedAt:'2026-11-08'};
 state.code[ex.id]=ex.solution;
 assert.equal(projectStatus(stage,state).completed,false);
 state.codeResults[ex.id]={status:'success',passed:ex.tests.length,total:ex.tests.length,codeHash:codeFingerprint(ex.solution)};
 assert.equal(projectStatus(stage,state).completed,true);
 const restored=normalizeState(state,{projectStages,exercises:projectExercises});
 assert.equal(projectStatus(stage,restored).completed,true);
 assert.equal(restored.projects[stage.id].notes.observation,'真实观察');
 restored.projects[stage.id].step=0;assert.equal(projectStatus(stage,restored).completed,true,'reviewing earlier prose does not erase reading');
 restored.code[ex.id]+='\n# changed';assert.equal(projectStatus(stage,restored).completed,false);
 state.projects[stage.id].selected=99;state.projects.unknown={};
 const invalid=normalizeState(state,{projectStages,exercises:projectExercises});
 assert.equal(projectStatus(stage,invalid).ready,false);assert.equal(invalid.projects.unknown,undefined);
 assert.deepEqual(normalizeState({version:1},{projectStages}).projects,{});
});

test('local report readers reject invalid schemas and render source text without executing it',()=>{
 assert.throws(()=>validateWorldReport({schema:'other'}));
 const raw={schema:'model-craft-world-v1',config:{arch:'mlp',observation:'full',seed:42,width:32,lr:.003,batch_size:16},step:2,parameters:50,device:'cpu',validation:{one_step_mse:.1,rollout_mse:.2,persistence_rollout_mse:.3},latency:{p50_ms:1,p95_ms:2}};
 const report=validateWorldReport(raw);assert.match(reportHTML(report),/自报实验/);
 raw.validation.rollout_mse=NaN;assert.throws(()=>validateWorldReport(raw));
 const map={schema:'model-craft-source-v1',revision:'<script>bad</script>',groups:Object.fromEntries(['data','vision','backbone','loss','state','training','inference'].map(k=>[k,[]]))};
 map.groups.data.push({file:'src/model.py',line:3,symbol:'<img src=x onerror=alert(1)>'});
 const html=sourceHTML(validateSourceMap(map));assert.doesNotMatch(html,/<script>|<img /);assert.match(html,/&lt;img/);
 map.groups.data[0].file='../secret.py';assert.throws(()=>validateSourceMap(map));
});

test('project routes, guided teaching, code submission, notes and navigation work together',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/',pretendToBeVisual:true});
 const w=dom.window,errors=[];w.addEventListener('error',ev=>errors.push(ev.error));
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
 await import('../dist/app.js');
 const tick=()=>new Promise(resolve=>w.setTimeout(resolve,12));
 const nav=async path=>{w.location.hash='#/'+path;await tick();assert.deepEqual(errors,[]);};
 const node=selector=>{const n=w.document.querySelector(selector);assert.ok(n,selector);return n;};
 const click=selector=>node(selector).click();
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 await nav('projects');assert.equal(w.document.querySelectorAll('.project-stage-card').length,16);
 assert.equal(node('.nav-link.active').textContent,'项目实战');
 for(const stage of projectStages){await nav('projects/'+stage.id);assert.equal(node('h1').textContent,stage.title);assert.equal(node('#code-editor').dataset.exercise,stage.exercise.id);}
 const stage=projectStages[0],ex=stage.exercise;await nav('projects/'+stage.id);
 assert.equal(node('[data-action="project-complete"]').disabled,true);
 for(let i=1;i<=3;i++)click(`[data-action="project-step"][data-index="${i}"]`);
 const answer=n=>{node(`.project-question input[value="${n}"]`).checked=true;node('.project-question').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 answer((stage.check.answer+1)%stage.check.options.length);assert.match(node('#project-question').textContent,/再想一想/);
 answer(stage.check.answer);assert.match(node('#project-question').textContent,/理解正确/);
 const editor=node('#code-editor');editor.value=ex.solution;editor.dispatchEvent(new w.Event('input',{bubbles:true}));
 // Transport stub checks UI state. Real Python is separately run in Pyodide.
 globalThis.Worker=class{postMessage(message){setTimeout(()=>this.onmessage({data:{type:'result',result:{error:null,stdout:'',tests:message.tests.map(t=>({name:t.name,passed:true,error:null}))}}}),0);}terminate(){}};
 click('[data-action="sample-code"]');await tick();assert.equal(node('[data-action="project-complete"]').disabled,true);
 click('[data-action="run-code"]');await tick();assert.equal(node('[data-action="project-complete"]').disabled,false);
 click('[data-action="project-complete"]');assert.match(node('#project-completion').textContent,/本关机制验证通过/);
 const note=node('[data-field="observation"]');note.value='本次我只改了动作。';note.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(saved().projects[stage.id].notes.observation,note.value);
 click('[data-action="lesson-section"][data-id="project-question"]');await tick();assert.equal(w.location.hash,'#/projects/'+stage.id,'section navigation must not corrupt hash routing');
 await nav('code/'+ex.id);assert.equal(node('h1').textContent,stage.title);
 const changed=node('#code-editor');changed.value+='\n# changed';changed.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(node('[data-action="project-complete"]').disabled,true);
 await nav('projects/omnifm-audit');assert.ok(node('#project-source-file'));assert.ok(node('#project-report-file'));
 assert.deepEqual(errors,[]);dom.window.close();
});
