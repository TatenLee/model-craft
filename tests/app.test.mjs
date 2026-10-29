import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {lessons,lessonExamples} from '../dist/data/curriculum.js';
import {concepts,questions} from '../dist/data/concepts.js';
import {exercises} from '../dist/data/exercises.js';
import {labDefinitions} from '../dist/labs.js';
import {STORAGE_KEY} from '../dist/state.js';

test('application navigation, learning progress, quiz grading and experiment workflow',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/',pretendToBeVisual:true});
 const w=dom.window,errors=[];
 w.addEventListener('error',event=>errors.push(event.error));
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 globalThis.confirm=()=>true;
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 w.scrollTo=()=>{};
 await import('../dist/app.js');
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 const q=selector=>{const node=w.document.querySelector(selector);assert.ok(node,selector);return node;};
 const click=selector=>q(selector).click();
 const input=(selector,value)=>{q(selector).value=value;q(selector).dispatchEvent(new w.Event('input',{bubbles:true}));};
 const navigate=async path=>{w.location.hash='#/'+path;await new Promise(resolve=>w.setTimeout(resolve,10));assert.equal(errors.length,0,errors.map(String).join('\n'));};
 assert.match(q('h1').textContent,/今天/);
 click('.skip-link');assert.equal(w.document.activeElement.id,'main');
 await navigate('assessment');assert.equal(q('#quiz-mode').value,'week-1');
 await navigate('course/1');assert.equal(w.document.querySelectorAll('.day-plan').length,7);
 await navigate('lesson/'+lessons[0].id);
 assert.match(q('.lesson-terms').textContent,/参数/);
 assert.equal(q('.reference-answer').open,false);
 click('.lesson-toc [data-id="lesson-worked"]');
 assert.equal(w.document.activeElement.id,'lesson-worked');
 assert.equal(w.location.hash,'#/lesson/'+lessons[0].id);
 input('#lesson-note','我的解释：loss 决定优化目标。');
 click('[data-action="complete-lesson"]');
 assert.deepEqual(saved().completedLessons,[lessons[0].id]);
 assert.match(saved().notes[lessons[0].id],/优化目标/);
 await navigate('concepts');input('#concept-search','LoRA');
 assert.match(q('.concept-list').textContent,/LoRA/);
 click('[data-action="bookmark"]');assert.equal(saved().bookmarks.length,1);
 input('#concept-search','__no_such_concept__');assert.match(q('.concept-list').textContent,/没有找到/);
 click('[data-action="clear-search"]');
 for(const c of concepts){await navigate('concepts/'+c.id);assert.equal(q('.concept-detail h2').textContent,c.term);}
 for(const l of lessons){await navigate('lesson/'+l.id);assert.equal(q('h1').textContent,l.title);}
 for(const lab of labDefinitions){await navigate('labs/'+lab.id);assert.ok(q('#lab-visual').innerHTML.length>100);}
 await navigate('labs/gradient');click('#many-steps');assert.match(q('#lab-metrics').textContent,/20/);
 click('#record-lab');q('[name="title"]').value='我的首次参数更新';
 q('#experiment-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(saved().experiments.length,1);assert.match(saved().experiments[0].result,/更新=20步/);
 await navigate('notebook');assert.match(q('.experiment-card').textContent,/我的首次参数更新/);
 click('[data-action="edit-experiment"]');q('[name="interpretation"]').value='学习率影响收敛。';
 q('#experiment-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(saved().experiments.length,1);assert.match(saved().experiments[0].interpretation,/收敛/);
 for(const exercise of exercises){await navigate('code/'+exercise.id);assert.equal(q('#code-editor').value,exercise.starter);}
 input('#code-editor','print("draft")');assert.equal(saved().code[exercises.at(-1).id],'print("draft")');
 for(const example of lessonExamples){
  await navigate('code/'+example.id);assert.equal(q('#code-editor').value,example.starter);
  assert.match(q('#run-code').textContent,/运行示例/);
  assert.equal(q('.example-expected pre').textContent,example.expectedOutput);
 }
 const example=lessonExamples.at(-1);
 input('#code-editor','print("edited example")');
 await navigate('lesson/'+example.sourceLessonId);
 click('.lesson-run');await new Promise(resolve=>w.setTimeout(resolve,10));
 assert.equal(q('#code-editor').value,'print("edited example")');
 click('[data-action="code-reset"]');assert.equal(q('#code-editor').value,example.starter);
 // A transport double checks the UI's ungraded-result behavior; test:python executes real code.
 globalThis.Worker=class{
  postMessage(data){assert.deepEqual(data.tests,[]);queueMicrotask(()=>this.onmessage({data:{type:'result',result:{error:null,stdout:'transport output',tests:[]}}}));}
  terminate(){}
 };
 click('#run-code');await new Promise(resolve=>w.setTimeout(resolve,10));
 assert.match(q('#code-result').textContent,/示例执行完成/);
 assert.match(q('#code-result').textContent,/transport output/);
 assert.equal(saved().codeResults[example.id].total,0);
 await navigate('dashboard');assert.match(w.document.querySelectorAll('.stat-value')[2].textContent,/^0/);
 delete globalThis.Worker;
 await navigate('lesson/'+lessons[0].id);click('[data-action="week-quiz"]');await new Promise(resolve=>w.setTimeout(resolve,10));
 const weekly=questions.filter(question=>question.week===1);
 for(const question of weekly){
  assert.ok(q('[data-action="quiz-submit"]').disabled);
  click(`[data-action="quiz-option"][data-index="${question.answer}"]`);
  click('[data-action="quiz-submit"]');
  assert.ok(w.document.querySelector(`a[href="#/lesson/${question.lessonId}"]`));
  assert.equal(saved().answers[question.id].correct,true);click('[data-action="quiz-next"]');
 }
 assert.equal(saved().examHistory.at(-1).correct,weekly.length);
 await navigate('settings');assert.equal(q('.coverage-grid').textContent.includes('待补充'),false);
 assert.equal(errors.length,0,errors.map(String).join('\n'));
 dom.window.close();
});
