import {bookReviews} from '../dist/data/book-reviews.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {bookVolumes,bookSections,bookSectionByKey,bookProjectMap,bookMechanismMap,bookJourneyMap} from '../dist/data/book.js';
import {bookUnits} from '../dist/data/book-units.js';
import {bookExercises} from '../dist/data/book-practice.js';
import {bookMaterial} from '../dist/book-content.js';
import {bookPage,bookResourceContext} from '../dist/book-ui.js';
import {bookStatus,normalizeBook,readingResume} from '../dist/book-state.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';
import {lessons,lessonExamples} from '../dist/data/curriculum.js';
import {dailyChallenges} from '../dist/data/practice/index.js';
import {days} from '../dist/data/days.js';
import {questions} from '../dist/data/concepts.js';
import {journeyExercises} from '../dist/data/journey-practice.js';
import {codeFingerprint} from '../dist/daily-state.js';
const exercises=[...dailyChallenges,...journeyExercises,...bookExercises,...lessonExamples];
const catalog={lessons,exercises,questions,days};

test('six volumes form a reachable, stable book with complete old-lesson and lifecycle coverage',()=>{
 for(const v of bookVolumes)for(const c of v.chapters)assert.equal(bookReviews[v.id+'/'+c.id]?.length,3);
 assert.equal(bookVolumes.length,6);assert.equal(bookSections.length,74);
 assert.equal(new Set(bookSections.map(s=>s.key)).size,bookSections.length);
 assert.deepEqual(new Set(bookSections.filter(s=>s.kind==='lesson').map(s=>s.source)),new Set(lessons.map(l=>l.id)));
 assert.deepEqual(new Set(bookSections.filter(s=>s.kind==='unit').map(s=>s.source)),new Set(bookUnits.map(u=>u.id)));
 const training=bookVolumes.find(v=>v.id==='training');assert.deepEqual(training.chapters.map(c=>c.id),['overview','pretrain','midtrain','posttrain','methods','growth']);
 assert.deepEqual(training.chapters.map(c=>c.sections.length),[4,5,6,10,4,4]);
 for(const key of [...Object.values(bookProjectMap),...Object.values(bookMechanismMap),...bookJourneyMap])assert.ok(bookSectionByKey.has(key),key);
 for(const s of bookSections){
  const m=bookMaterial(s);assert.ok(m.goal.length>12,s.key);assert.ok(m.checks.length,s.key);
  for(const q of m.checks){assert.ok(q.prompt&&q.options[q.answer]&&q.explanation,s.key);}
  if(m.exerciseId)assert.ok(exercises.some(ex=>ex.id===m.exerciseId),m.exerciseId);
  for(const req of s.requires||[])assert.ok(bookSectionByKey.has(req));
  if(s.kind==='unit'){assert.ok(m.terms.length>=2);assert.ok(m.steps.length>=3);assert.ok(m.worked.length>=3);assert.ok(m.practice.action&&m.practice.expected&&m.practice.trouble);assert.ok(m.sources.every(s=>s.url.startsWith('https://')));}
 }
});

test('every volume, chapter and section renders content, and all book links resolve',()=>{
 const state=createState(),routes=['',...bookVolumes.map(v=>v.id),...bookVolumes.flatMap(v=>v.chapters.map(c=>v.id+'/'+c.id)),...bookSections.map(s=>s.key)];
 const valid=new Set(routes);
 for(const route of routes){
  const html=bookPage(route,state,exercises,ex=>`<textarea id="code-editor">${ex.starter}</textarea>`);
  assert.match(html,/<h1>/,route);assert.doesNotMatch(html,/undefined|\[object Object\]/,route);
  for(const match of html.matchAll(/href="#\/book(?:\/([^"]+))?"/g))assert.ok(valid.has(match[1]||''),`${route} -> ${match[1]}`);
  if(bookSectionByKey.has(route)){assert.match(html,/book-checkpoint/);assert.match(html,/book-handoff/);}
 }
 assert.match(bookPage('training/missing',state,exercises,()=>''),/没有找到/);
 for(const lesson of lessons)assert.match(bookResourceContext('lesson',lesson.id),/返回对应章节/);
 for(const day of days)assert.match(bookResourceContext('day',day.id),/返回对应章节/,day.id);
});

test('reading, current-code checks, old answers and imported evidence remain distinct',()=>{
 const state=createState(),s=bookSectionByKey.get('training/posttrain/ppo-grpo'),ex=bookExercises.find(x=>x.id==='book-ppo');
 state.book.records[s.key]={readAt:'today',answers:{0:1},note:'完成正负优势推演，负优势下取 min 的方向与原先猜测不同。'};
 assert.equal(bookStatus(s,state,exercises).read,true);assert.equal(bookStatus(s,state,exercises).checked,false);
 state.code[ex.id]=ex.solution;state.codeResults[ex.id]={passed:ex.tests.length,total:ex.tests.length,status:'success',codeHash:codeFingerprint(ex.solution)};
 assert.equal(bookStatus(s,state,exercises).checked,true);
 state.code[ex.id]+='\n# changed';assert.equal(bookStatus(s,state,exercises).checked,false);
 state.completedLessons=['w1-l1'];state.notes['w1-l1']='old note';state.book.lastRead=s.key;
 const restored=normalizeState(JSON.parse(JSON.stringify(state)),catalog);
 assert.deepEqual(restored.completedLessons,['w1-l1']);assert.equal(restored.notes['w1-l1'],'old note');assert.equal(readingResume(restored).key,s.key);
 const old=normalizeState({version:1,completedLessons:['w1-l1'],code:{'book-ppo':ex.solution}},catalog);
 assert.equal(old.book.lastRead,'');assert.deepEqual(old.book.records,{});assert.equal(old.code['book-ppo'],ex.solution);
 const hostile=normalizeBook({lastRead:'evil',records:{[s.key]:{anchor:'<script>',offset:Infinity,answers:{0:99},note:'x'.repeat(20000)},evil:{readAt:'yes'}}});
 assert.equal(hostile.lastRead,'');assert.equal(hostile.records[s.key].anchor,'book-start');assert.equal(hostile.records[s.key].offset,0);assert.equal(hostile.records[s.key].note.length,12000);assert.deepEqual(hostile.records[s.key].answers,{});assert.equal(hostile.records.evil,undefined);
});

test('book application navigates, restores paragraphs, saves answers and invalidates edited code',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173',pretendToBeVisual:true}),w=dom.window,errors=[];
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 let scroll=0;Object.defineProperty(w,'scrollY',{get:()=>scroll});w.scrollTo=(x,y)=>{scroll=y;};
 w.HTMLElement.prototype.getBoundingClientRect=function(){const anchors=[...w.document.querySelectorAll('[data-book-anchor]')];const top=Math.max(0,anchors.indexOf(this))*400-scroll;return {top,bottom:top+300,height:300,left:0,right:700,width:700};};
 w.addEventListener('error',ev=>errors.push(ev.error));
 const workers=[];globalThis.Worker=class{constructor(){workers.push(this);}postMessage(m){this.message=m;}terminate(){}};
 await import('../dist/app.js');
 const q=s=>{const el=w.document.querySelector(s);assert.ok(el,s);return el;};
 const nav=async path=>{w.location.hash='#/'+path;await new Promise(r=>w.setTimeout(r,45));await new Promise(r=>w.requestAnimationFrame(r));assert.deepEqual(errors,[]);};
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 assert.match(q('h1').textContent,/实践书/);assert.equal(q('.nav-reference').open,false);
 await nav('book/training');assert.match(q('h1').textContent,/全生命周期/);
 await nav('book/training/posttrain');assert.match(q('h1').textContent,/后训练/);
 const key='training/posttrain/ppo-grpo';await nav('book/'+key);
 assert.ok(q('a[href="#/book/training/methods/rl-basics"]'));assert.equal(q('#code-editor').dataset.exercise,'book-ppo');
 const current=q('.book-tree-compact a[aria-current=page]');assert.ok(current.closest('details').open);
 q('[data-book-jump="book-worked"]').click();scroll+=73;w.dispatchEvent(new w.Event('scroll'));await new Promise(r=>w.setTimeout(r,280));
 assert.equal(saved().book.records[key].anchor,'book-worked');assert.equal(saved().book.records[key].offset,73);
 await nav('book');assert.match(q('.book-resume').textContent,/PPO/);await nav('book/'+key);
 const anchorTop=q('#book-worked').getBoundingClientRect().top+scroll;assert.equal(scroll,anchorTop+73);
 q('#book-mark-read').click();assert.ok(saved().book.records[key].readAt);assert.equal(saved().book.records[key].answers[0],undefined);assert.match(q('#book-completion').textContent,/待验证/);
 q('.book-question input[value="1"]').click();assert.match(q('.book-feedback').textContent,/回答正确/);
 q('#book-note').value='实际计算负优势时需要保留 min，不能只对 ratio 裁剪后直接返回。';q('#book-note').dispatchEvent(new w.Event('input',{bubbles:true}));
 const ex=bookExercises.find(e=>e.id==='book-ppo');q('#code-editor').value=ex.solution;q('#code-editor').dispatchEvent(new w.Event('input',{bubbles:true}));q('[data-action="run-code"]').click();
 workers.at(-1).onmessage({data:{type:'result',result:{tests:ex.tests.map(t=>({name:t.name,passed:true})),stdout:'',error:null}}});
 assert.match(q('#book-completion').textContent,/本节练习已核对/);
 q('#code-editor').value+='\n# edit';q('#code-editor').dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(q('#book-completion').textContent,/当前代码待验证/);
 await nav('book/entry/python/predict');assert.doesNotMatch(q('.book-reading').textContent,/\[object Object\]|undefined/);
 await nav('book/common/predict/model');assert.ok(q('#lesson-terms'));assert.ok(q('#code-editor'));
 await nav('book/training/posttrain/sft');assert.ok(q('.book-question'));assert.match(q('.book-reading').textContent,/SFT/);
 await nav('book/not-a-volume');assert.match(q('h1').textContent,/没有找到/);assert.deepEqual(errors,[]);
 dom.window.close();
});
