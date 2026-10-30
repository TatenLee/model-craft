import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {days,dailyQuestions,weeklyConnections} from '../dist/data/days.js';
import {dailyChallenges} from '../dist/data/practice/index.js';
import {lessons,weeks,lessonExamples} from '../dist/data/curriculum.js';
import {exercises} from '../dist/data/exercises.js';
import {categories,concepts,questions} from '../dist/data/concepts.js';
import {codeFingerprint,dayStatus} from '../dist/daily-state.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';
const allExercises=[...exercises,...lessonExamples,...dailyChallenges];
const catalog={days,weeks,lessons,categories,concepts,questions,exercises:allExercises};

test('84 daily units have a taught objective, interactive feedback, coding and weekly synthesis',()=>{
 assert.equal(days.length,84);assert.equal(new Set(days.map(d=>d.id)).size,84);
 assert.equal(dailyChallenges.length,48);assert.equal(dailyQuestions.length,132);
 assert.equal(new Set(dailyQuestions.map(q=>q.id)).size,dailyQuestions.length);
 for(const week of weeks){
  const group=days.filter(d=>d.week===week.id);assert.deepEqual(group.map(d=>d.day),[1,2,3,4,5,6,7]);
  assert.equal(group.reduce((sum,d)=>sum+d.minutes,0),week.hours*60);
  assert.equal(group.at(-1).isReview,true);assert.equal(group.at(-1).checks.length,5);
  assert.equal(weeklyConnections[week.id].length,4);
 }
 for(const d of days){
  const ex=allExercises.find(x=>x.id===d.exerciseId);assert.ok(ex,d.id);
  assert.ok(d.goals.length>=2);assert.ok(d.trace.length>=3);assert.ok(d.reflection);
  assert.equal(d.blocks.reduce((n,b)=>n+b.minutes,0),d.minutes);
  for(const q of d.checks){assert.ok(q.options[q.answer]);assert.ok(q.explanation.length>10);}
  if(d.isLesson){assert.ok(d.guide.caseStudy.length>60);assert.ok(d.guide.reasoning.length>60);assert.ok(d.guide.experiment.length>60);}
  else{assert.ok(ex.context.length>50);assert.ok(ex.contract);assert.equal(ex.steps.length,3);assert.ok(ex.examples.length>=2);assert.ok(ex.tests.length>=3);assert.ok(ex.starter.includes('NotImplementedError'));}
 }
 assert.doesNotMatch(JSON.stringify(days.filter(d=>d.week===1).flatMap(d=>d.checks)),/LoRA|SFT|JEPA|KDA/);
});

test('daily completion requires current submitted code, correct answers and reading; imports preserve evidence',()=>{
 const d=days[1],ex=allExercises.find(x=>x.id===d.exerciseId),state=createState();
 state.days[d.id]={read:true,answers:Object.fromEntries(d.checks.map(q=>[q.id,{selected:q.answer,attempts:1}])),reflection:'一次修改观察',completedAt:new Date().toISOString()};
 state.code[ex.id]=ex.solution;
 assert.equal(dayStatus(d,state,ex).completed,false);
 state.codeResults[ex.id]={status:'success',passed:ex.tests.length,total:ex.tests.length,codeHash:codeFingerprint(ex.solution)};
 assert.equal(dayStatus(d,state,ex).completed,true);
 const restored=normalizeState(state,catalog);assert.equal(dayStatus(d,restored,ex).completed,true);assert.equal(restored.days[d.id].reflection,'一次修改观察');
 restored.code[ex.id]+='\n# changed';assert.equal(dayStatus(d,restored,ex).ready,false);
 state.codeResults[ex.id].status='error';assert.equal(dayStatus(d,state,ex).ready,false);
 state.days[d.id].answers[d.checks[0].id]={selected:99,correct:true};state.days.fake={read:true};
 const invalid=normalizeState(state,catalog);assert.equal(invalid.days.fake,undefined);assert.equal(dayStatus(d,invalid,ex).correct,0);
 assert.deepEqual(normalizeState({version:1},catalog).days,{});
});

test('day pages, walkthrough, feedback, sample/custom/submit modes and retained progress work together',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/',pretendToBeVisual:true});
 const w=dom.window,errors=[];
 w.addEventListener('error',ev=>errors.push(ev.error));
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
 await import('../dist/app.js');
 const tick=()=>new Promise(resolve=>w.setTimeout(resolve,8));
 const nav=async route=>{w.location.hash='#/'+route;await tick();assert.deepEqual(errors,[]);};
 const node=selector=>{const found=w.document.querySelector(selector);assert.ok(found,selector);return found;};
 const click=selector=>node(selector).click();
 const input=(selector,value)=>{node(selector).value=value;node(selector).dispatchEvent(new w.Event('input',{bubbles:true}));};
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 for(const d of days){await nav('day/'+d.id);assert.equal(node('h1').textContent,d.title);assert.equal(w.document.querySelectorAll('.daily-question').length,d.checks.length);assert.equal(node('#code-editor').dataset.exercise,d.exerciseId);}
 await nav('code');assert.equal(w.document.querySelectorAll('.practice-card').length,56);
 const d=days[1],ex=dailyChallenges[0];await nav('day/'+d.id);
 assert.equal(node('[data-action="complete-day"]').disabled,true);
 click('[data-action="trace-next"]');assert.equal(node('#trace-count').textContent,'2 / 3');
 click('[data-action="day-read"]');
 const answer=(choice)=>{node(`.daily-question input[value="${choice}"]`).checked=true;node('.daily-question').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 answer((d.checks[0].answer+1)%d.checks[0].options.length);assert.match(node('.daily-feedback').textContent,/还需要修正/);
 answer(d.checks[0].answer);assert.match(node('.daily-feedback').textContent,/判断正确/);
 input('#code-editor',ex.solution);input('#day-reflection','通过反例发现 return 放早了。');
 let lastPayload,fail=false;
 globalThis.Worker=class{
  postMessage(data){lastPayload=data;queueMicrotask(()=>this.onmessage({data:{type:'result',result:{error:null,stdout:data.tests.length?'':'custom output',tests:data.tests.map((t,i)=>({name:t.name,passed:!(fail&&i===0),error:fail&&i===0?'AssertionError: 预期 [4,7]，实际 [0,0]':null}))}}}));}
  terminate(){}
 };
 click('[data-action="sample-code"]');await tick();assert.equal(lastPayload.tests.length,2);assert.equal(node('[data-action="complete-day"]').disabled,true);assert.equal(saved().codeResults[ex.id],undefined);
 node('#custom-call').value='print(predict([2],3,1))';click('[data-action="custom-code"]');await tick();assert.equal(lastPayload.tests.length,0);assert.match(lastPayload.code,/print\(predict/);assert.equal(saved().codeResults[ex.id],undefined);
 fail=true;click('#run-code');await tick();assert.match(node('#code-result').textContent,/预期.*实际/s);assert.equal(node('[data-action="complete-day"]').disabled,true);
 fail=false;click('#run-code');await tick();assert.equal(lastPayload.tests.length,ex.tests.length);assert.equal(node('[data-action="complete-day"]').disabled,false);
 click('[data-action="complete-day"]');assert.ok(saved().days[d.id].completedAt);assert.match(node('#day-completion').textContent,/当天学习已完成/);
 assert.equal(saved().submissions.length,4);assert.match(saved().days[d.id].reflection,/return/);
 input('#code-editor',ex.solution+'\n# modified');assert.match(node('#day-completion').textContent,/还需/);assert.equal(node('[data-action="complete-day"]').disabled,true);
 await nav('dashboard');await nav('day/'+d.id);assert.match(node('#code-editor').value,/# modified/);assert.match(node('#day-reflection').value,/return/);
 assert.ok(node('#submission-history').textContent.includes('自定义调用'));
 await nav('day/w1-d7');assert.ok(node('#day-review'));assert.equal(w.document.querySelectorAll('.week-evidence a').length,6);
 assert.deepEqual(errors,[]);delete globalThis.Worker;dom.window.close();
});
