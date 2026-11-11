import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {concepts,questions} from '../dist/data/concepts.js';
import {conceptGuides,guideById,conceptComparisons} from '../dist/data/concept-guides/index.js';
import {guideIdsForTerm,conceptPanelKey} from '../dist/data/concept-guides/terms.js';
import {conceptExamples} from '../dist/data/concept-examples.js';
import {bookSections,bookSectionByKey} from '../dist/data/book.js';
import {bookMaterial} from '../dist/book-content.js';
import {normalizeBook} from '../dist/book-state.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';
import {conceptGuideHTML} from '../dist/concept-guide-ui.js';

test('every dictionary concept and book term has authored explanations and valid examples/comparisons',()=>{
 assert.equal(new Set(conceptGuides.map(g=>g.id)).size,conceptGuides.length);
 assert.deepEqual(new Set(conceptGuides.map(g=>g.id)),new Set(concepts.map(c=>c.id)));
 for(const g of conceptGuides){
  for(const value of [g.why,g.everyday.story,g.everyday.boundary,g.benefit,g.cost,g.check.question,g.check.answer])assert.ok(value?.length>=10,g.id);
  assert.equal(g.worked.length,3,g.id);assert.equal(g.use.length,3,g.id);
  const html=conceptGuideHTML(g.id);assert.doesNotMatch(html,/undefined|\[object Object\]/);assert.match(html,/为什么需要/);assert.match(html,/代价、局限/);
 }
 for(const section of bookSections){const m=bookMaterial(section);for(const term of m.lesson?.terms||m.terms||[]){const ids=guideIdsForTerm(term.name);assert.ok(ids.length,`${section.key}: ${term.name}`);ids.forEach(id=>assert.ok(guideById.has(id),id));}}
 for(const comparison of conceptComparisons){assert.ok(comparison.rows.length>=3);comparison.ids.forEach(id=>assert.ok(guideById.has(id),id));}
 for(const ex of conceptExamples){assert.deepEqual(ex.tests,[]);ex.conceptIds.forEach(id=>assert.ok(guideById.has(id),id));assert.ok(ex.change&&ex.prediction&&ex.expectedOutput);}
 assert.match(concepts.find(c=>c.id==='worldsimready').term,/WorldSimReady-Home/);assert.ok(concepts.find(c=>c.id==='worldsimready').sources.some(s=>s.url.includes('modelscope.cn/datasets/Yootta/World-SimReady-Home')));
 assert.match(guideById.get('worldsimready').why,/场景/);
 const chapter=bookSections.filter(s=>s.chapterId==='simulation');assert.equal(chapter.length,3);
 assert.ok(chapter.at(-1).chapterPosition<bookSectionByKey.get('systems/robot/policy').chapterPosition);
});

test('concept expansion and exploratory code round-trip without accepting unknown keys or awarding scores',()=>{
 const key='training/posttrain/sft',m=bookMaterial(bookSectionByKey.get(key)),term=m.lesson.terms.find(t=>guideIdsForTerm(t.name).includes('sft'));
 const panel=conceptPanelKey(term.name,'sft');
 const normalized=normalizeBook({lastRead:key,records:{[key]:{anchor:'book-term-0',offset:81,openConcepts:[panel,panel,'<script>',null],answers:{},note:''}}});
 assert.deepEqual(normalized.records[key].openConcepts,[panel]);assert.equal(normalized.records[key].anchor,'book-term-0');
 assert.equal(normalizeBook({records:{[key]:{}}}).records[key].openConcepts,undefined);
 const state=createState(),ex=conceptExamples[0];state.book=normalized;state.code[ex.id]=ex.starter+'\n# observation';
 const restored=normalizeState(JSON.parse(JSON.stringify(state)),{concepts,questions,exercises:conceptExamples,lessons:[],days:[]});
 assert.equal(restored.code[ex.id],state.code[ex.id]);assert.deepEqual(restored.book.records[key].openConcepts,[panel]);
 assert.deepEqual(restored.codeResults,{});assert.deepEqual(restored.completedLessons,[]);
});

test('learner opens inline explanations, returns to the same section and edits ungraded runnable examples',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/',pretendToBeVisual:true}),w=dom.window,errors=[];
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
 w.addEventListener('error',ev=>errors.push(ev.error));
 globalThis.Worker=class{postMessage(m){assert.deepEqual(m.tests,[]);queueMicrotask(()=>this.onmessage({data:{type:'result',result:{error:null,tests:[],stdout:'transport output'}}}));}terminate(){}};
 await import('../dist/app.js');
 const tick=()=>new Promise(r=>w.setTimeout(r,40));
 const nav=async route=>{w.location.hash='#/'+route;await tick();assert.deepEqual(errors,[]);};
 const q=selector=>{const node=w.document.querySelector(selector);assert.ok(node,selector);return node;};
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 const key='training/posttrain/sft';await nav('book/'+key);
 assert.match(q('.term-motivation').textContent,/为什么需要/);
 const panel=q('[data-concept-panel]');assert.equal(panel.open,false);panel.open=true;await tick();
 assert.deepEqual(saved().book.records[key].openConcepts,[panel.dataset.conceptPanel]);
 const editor=q('#code-editor');editor.value+='\n# keep draft';editor.dispatchEvent(new w.Event('input',{bubbles:true}));
 const editorValue=editor.value;
 q('[data-book-jump="book-term-0"]').click();assert.equal(w.document.activeElement.id,'book-term-0');
 await nav('concepts/lora');assert.match(q('.concept-guide').textContent,/4×3/);assert.match(q('.concept-comparison').textContent,/SFT/);
 await nav('book/'+key);assert.equal(q('[data-concept-panel]').open,true);assert.equal(q('#code-editor').value,editorValue);
 assert.equal(saved().book.records[key].readAt,'');assert.deepEqual(saved().book.records[key].answers,{});
 await nav('concepts/worldsimready');assert.match(q('.concept-detail').textContent,/家居仿真数据集/);assert.ok(q('.book-resource-context a[href="#/book/systems/simulation/scene-assets"]'));
 await nav('book/systems/simulation/navigation-lab');assert.ok(q('a[href="#/code/concept-navigation"]'));
 for(const ex of conceptExamples){await nav('code/'+ex.id);assert.equal(q('#code-editor').value,ex.starter);assert.match(q('#run-code').textContent,/运行示例/);assert.ok(q(`a[href="#/concepts/${ex.sourceConceptId}"]`));}
 await nav('code/concept-lora');q('#code-editor').value='print("my experiment")';q('#code-editor').dispatchEvent(new w.Event('input',{bubbles:true}));q('#run-code').click();await tick();
 assert.match(q('#code-result').textContent,/示例执行完成/);assert.equal(saved().codeResults['concept-lora'].total,0);
 await nav('dashboard');assert.match(w.document.querySelectorAll('.stat-value')[2].textContent,/^0/);
 await nav('code/concept-lora');assert.equal(q('#code-editor').value,'print("my experiment")');
 await nav('code');assert.equal(w.document.querySelectorAll('.concept-example-card').length,conceptExamples.length);
 assert.deepEqual(errors,[]);dom.window.close();delete globalThis.Worker;
});


test('concept teaching stylesheet parses and uses the shared light/dark palette',async()=>{
 const css=await readFile(new URL('../dist/concept-guides.css',import.meta.url),'utf8');
 const dom=new JSDOM('<style>'+css+'</style>');assert.ok(dom.window.document.styleSheets[0].cssRules.length>20);assert.match(css,/var\(--ink\)/);assert.match(css,/overflow-x:auto/);dom.window.close();
});
