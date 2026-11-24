import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {practiceProjects,practiceById,practiceMainPath,practicePrerequisites} from '../dist/data/practice-projects.js';
import {bookSections} from '../dist/data/book.js';
import {concepts} from '../dist/data/concepts.js';
import {createState,normalizeState,STORAGE_KEY} from '../dist/state.js';
import {normalizePractice,validateVisionReport} from '../dist/practice-state.js';
import {visionReportHTML} from '../dist/practice-ui.js';
const report=()=>({schema:'model-craft-real-vision-v1',config:{arch:'cnn',data_sha256:'a'.repeat(64)},history:[{epoch:1,train_loss:2.1,val_loss:2.2,train_accuracy:.3,val_accuracy:.2},{epoch:2,train_loss:1.5,val_loss:1.9,train_accuracy:.5,val_accuracy:.4}]});

test('project work packages link to existing teaching and distinguish real training from future reproductions',async()=>{
 assert.equal(practiceProjects.length,14);assert.equal(practiceById.size,14);
 assert.equal(practiceProjects.reduce((n,p)=>n+p.steps.length,0),61);
 for(const id of practiceMainPath)assert.ok(practiceById.has(id));
 const visited=new Set();
 for(const p of practiceProjects){
  for(const id of practicePrerequisites[p.id])assert.ok(visited.has(id),`missing/cyclic prerequisite: ${p.id}: ${id}`);
  visited.add(p.id);
  for(const a of [...p.assets,{url:p.repo}])assert.equal(new URL(a.url).protocol,'https:');
  for(const [label,url] of p.reads){const [page,...parts]=url.slice(2).split('/'),id=parts.join('/');assert.ok(page==='book'?bookSections.some(s=>s.key===id):page==='concepts'&&concepts.some(c=>c.id===id),`${p.id}: ${label} ${url}`);}
  if(p.local)assert.ok((await readFile(p.local,'utf8')).includes('python'));
  else assert.match(p.status,/尚未/);
  for(const m of p.steps)for(const k of ['task','change','expect','debug','evidence'])assert.ok(typeof m[k]==='string'&&m[k].length>0,`${p.id}: ${k}`);
 }
 assert.match(practiceById.get('video').steps.at(-1).debug,/UCF101/);
 assert.match(practiceById.get('world').steps.at(-1).change,/OmniFM/);
 assert.match(practiceById.get('brain').steps[2].title,/SFT/);
});

test('practice backups retain only known observations and never turn self-review into graded results',()=>{
 const state=createState(),note='实际运行时我发现验证 loss 没有改善，所以检查了训练划分和标签分布，准备在固定数据与随机种子的条件下只改变模型。';
 state.practice={active:'brain',projects:{'vision-baseline':{notes:{0:note,1:'待做',2:'x'.repeat(7000),99:note},reviewed:[0,0,1,2,99]},unknown:{notes:{0:note},reviewed:[0]}}};
 const restored=normalizeState(JSON.parse(JSON.stringify(state)),{});
 assert.equal(restored.practice.active,'brain');assert.deepEqual(restored.practice.projects['vision-baseline'].reviewed,[0,2]);
 assert.equal(restored.practice.projects['vision-baseline'].notes[2].length,6000);assert.equal(restored.practice.projects['vision-baseline'].notes[99],undefined);
 assert.equal(restored.practice.projects.unknown,undefined);assert.deepEqual(restored.codeResults,{});
 assert.equal(normalizeState({version:1},{}).practice.active,'vision-baseline');assert.equal(normalizePractice({active:'__proto__'}).active,'vision-baseline');
});

test('vision report validation rejects malformed metrics and cannot render injected content',()=>{
 assert.equal(validateVisionReport(report()).history.length,2);assert.match(visionReportHTML(report()),/40.0%/);
 for(const bad of [null,{}, {...report(),history:[]}, {...report(),config:{arch:'<script>',data_sha256:'a'.repeat(64)}}])assert.throws(()=>validateVisionReport(bad));
 for(const [key,value] of [['epoch',0],['epoch',1.5],['train_loss',Infinity],['val_loss',-1],['val_accuracy',1.2],['train_accuracy','0.2']]){const r=report();r.history[0][key]=value;assert.throws(()=>validateVisionReport(r),`${key}: ${value}`);}
 const r=report();r.history[1].epoch=1;assert.throws(()=>validateVisionReport(r));
 const extra=report();extra.history[0].attack='<script>alert(1)</script>';assert.doesNotMatch(visionReportHTML(extra),/<script>/);
});

test('project-first app navigates every project, saves evidence, invalidates edits, and reads local reports',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/',pretendToBeVisual:true});
 const w=dom.window,errors=[];w.addEventListener('error',ev=>errors.push(ev.error));
 for(const k of ['window','document','location','localStorage','FormData'])globalThis[k]=k==='window'?w:w[k];
 globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
 await import('../dist/app.js');
 const tick=()=>new Promise(resolve=>w.setTimeout(resolve,12));
 const node=s=>{const n=w.document.querySelector(s);assert.ok(n,s);return n;};
 const saved=()=>JSON.parse(w.localStorage.getItem(STORAGE_KEY));
 const nav=async id=>{w.location.hash='#/practice'+(id?'/'+id:'');await tick();assert.deepEqual(errors,[]);};
 assert.match(node('h1').textContent,/先做一个模型/);assert.equal(w.document.querySelectorAll('.practice-project-card').length,14);
 assert.equal(w.document.querySelector('.book-legacy-context'),null);assert.match(node('#journey-overall-count').textContent,/0 \/ 61/);
 for(const p of practiceProjects){
  await nav(p.id);assert.equal(node('h1').textContent,p.title);
  assert.equal(w.document.querySelectorAll('[data-practice-note]').length,p.steps.length);
  const figures=[...w.document.querySelectorAll('.practice-blueprint figure')];
  assert.equal(figures.length,3,p.id);
  for(const figure of figures)assert.ok(figure.querySelectorAll('li').length>=2,`${p.id}: empty diagram`);
  for(const [i] of p.steps.entries()){
   const purpose=node(`#practice-step-${i} .practice-reason`).lastChild;
   assert.equal(purpose.nodeType,w.Node.TEXT_NODE);assert.ok(purpose.textContent.trim(),`${p.id} step ${i+1}: missing purpose`);
  }
 }
 await nav('vision-baseline');assert.equal(node('#code-editor').dataset.exercise,'practice-class-recall');const note=node('#practice-note-0'),box=node('[data-practice-review="0"]');assert.ok(box.disabled);
 note.value='我先固定划分并检查了真实样本与标签，再对比训练和验证曲线；目前还不能确认效果，需要在自己的实验目录保存原始报告与复现命令。';note.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(box.disabled,false);
 box.click();assert.deepEqual(saved().practice.projects['vision-baseline'].reviewed,[0]);assert.match(node('#journey-overall-count').textContent,/1 \/ 61/);assert.deepEqual(saved().codeResults,{});
 node('[data-practice-jump="practice-step-2"]').click();assert.equal(w.document.activeElement.id,'practice-step-2');
 await nav('');assert.match(node('.practice-hero .btn').textContent,/继续项目/);await nav('vision-baseline');assert.match(node('#practice-note-0').value,/真实样本/);
 node('#practice-note-0').value+='现在增加新的观察。';node('#practice-note-0').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(node('[data-practice-review="0"]').checked,false);assert.match(node('#journey-overall-count').textContent,/0 \/ 61/);
 const upload=async(size,text)=>{Object.defineProperty(node('#vision-report'),'files',{value:[{size,text:async()=>text}],configurable:true});node('#vision-report').dispatchEvent(new w.Event('change'));await tick();};
 await upload(1000,JSON.stringify(report()));assert.equal(w.document.querySelectorAll('#vision-report-result tbody tr').length,2);assert.deepEqual(saved().practice.projects['vision-baseline'].reviewed,[]);
 await upload(2000001,'{}');assert.match(node('#vision-report-result').textContent,/超过 2 MB/);
 await upload(30,'not json');assert.match(node('#vision-report-result').textContent,/无法读取/);
 await nav('missing');assert.match(node('h1').textContent,/没有找到/);
 w.location.hash='#/book';await tick();assert.ok(node('.book-page'));assert.deepEqual(errors,[]);dom.window.close();
});

test('practice presentation uses theme variables and valid responsive CSS',async()=>{
 const css=await readFile(new URL('../dist/practice.css',import.meta.url),'utf8');const dom=new JSDOM(`<style>${css}</style>`);
 assert.ok(dom.window.document.styleSheets[0].cssRules.length>20);assert.match(css,/@media/);assert.match(css,/var\(--green\)/);dom.window.close();
});
