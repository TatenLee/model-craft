import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {practiceGroups,matchingProjects} from '../dist/data/practice-navigation.js';
import {practiceProjects} from '../dist/data/practice-projects.js';
import {bookTree} from '../dist/book-ui.js';
import {createState,STORAGE_KEY} from '../dist/state.js';

// This check protects project discoverability when new content is added.
test('sidebar groups cover every project once and search finds methods and directions',()=>{
 const ids=practiceGroups.flatMap(g=>g.projects);
 assert.equal(new Set(ids).size,ids.length);assert.deepEqual(new Set(ids),new Set(practiceProjects.map(p=>p.id)));
 assert.deepEqual(matchingProjects(' DINO '),['representation']);assert.ok(matchingProjects('lOrA').includes('sft'));
 assert.ok(matchingProjects('语言后训练').includes('rl'));assert.equal(matchingProjects('missing-xyz').length,0);
 assert.equal(matchingProjects('').length,14);assert.deepEqual(matchingProjects('SFT Qwen'),['sft']);
});

test('volume, chapter and section links stay inside successively indented containers',()=>{
 const dom=new JSDOM(bookTree('training/posttrain/sft',createState(),{compact:true})),d=dom.window.document;
 const volume=d.querySelector('[data-sidebar-node="book:training"]'),chapter=d.querySelector('[data-sidebar-node="book:training/posttrain"]'),section=d.querySelector('a[aria-current=page]');
 assert.ok(volume.open&&chapter.open);assert.equal(chapter.parentElement.className,'tree-children');assert.equal(chapter.parentElement.parentElement,volume);
 assert.equal(section.parentElement.className,'tree-children');assert.equal(section.parentElement.parentElement,chapter);
 assert.equal(section.getAttribute('href'),'#/book/training/posttrain/sft');
 for(const tree of d.querySelectorAll('details')){assert.equal(tree.children[0].tagName,'SUMMARY');assert.equal(tree.children[1].className,'tree-children');}
 dom.window.close();
});

test('module switching, filter, step jumps and folding preserve drafts and active execution',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/#/practice/vision-baseline',pretendToBeVisual:true});
 const w=dom.window,errors=[],workers=[];
 for(const k of ['window','document','location','localStorage','FormData'])globalThis[k]=k==='window'?w:w[k];
 globalThis.confirm=()=>true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.addEventListener('error',ev=>errors.push(ev.error));
 globalThis.Worker=class{constructor(){this.terminated=false;workers.push(this);}postMessage(m){this.message=m;}terminate(){this.terminated=true;}};
 await import('../dist/app.js');
 const tick=()=>new Promise(r=>w.setTimeout(r,20)),q=s=>{const n=w.document.querySelector(s);assert.ok(n,s);return n;};
 const input=text=>{const el=q('#sidebar-project-search');el.value=text;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const nav=async hash=>{w.location.hash=hash;await tick();assert.deepEqual(errors,[]);};
 const visible=()=>[...w.document.querySelectorAll('[data-sidebar-project]')].filter(el=>!el.hidden).map(el=>el.dataset.sidebarProject);
 assert.deepEqual(Array.from(w.document.querySelectorAll('[data-sidebar-module]'),el=>el.dataset.sidebarModule),['book','practice']);
 assert.equal(q('#sidebar-practice-body').hidden,false);assert.equal(q('#sidebar-book-body').hidden,true);assert.equal(w.document.querySelector('.book-sidebar'),null);
 assert.equal(q('.sidebar-project-link[aria-current=page]').getAttribute('href'),'#/practice/vision-baseline');
 const editor=q('#code-editor');editor.value='def class_recall(matrix):\n    return [None for row in matrix]\n';editor.dispatchEvent(new w.Event('input',{bubbles:true}));
 q('[data-action="run-code"]').click();const worker=workers.at(-1);assert.ok(worker);
 input('DINO');assert.deepEqual(visible(),['representation']);assert.equal(q('[data-project-group="generation"]').open,true);
 assert.equal(q('#sidebar-project-count').textContent,'匹配 1 / 14 个项目');assert.equal(q('#code-editor'),editor);assert.equal(worker.terminated,false);
 input('not-a-project');assert.equal(q('#sidebar-project-empty').hidden,false);assert.equal(visible().length,0);
 q('#sidebar-project-clear').click();assert.equal(visible().length,14);assert.equal(q('#code-editor'),editor);
 q('[data-sidebar-toggle="practice"]').click();assert.equal(q('#sidebar-practice-body').hidden,true);
 q('[data-sidebar-toggle="book"]').click();assert.equal(q('#sidebar-book-body').hidden,false);
 q('[data-sidebar-toggle="practice"]').click();assert.equal(q('#sidebar-practice-body').hidden,false);assert.equal(worker.terminated,false);
 q('.mobile-menu').click();assert.equal(q('.mobile-menu').getAttribute('aria-expanded'),'true');
 q('#main-sidebar [data-practice-jump="practice-step-3"]').click();assert.equal(q('.mobile-menu').getAttribute('aria-expanded'),'false');assert.equal(q('.sidebar-backdrop').classList.contains('hidden'),true);assert.equal(w.document.activeElement.id,'practice-step-3');assert.equal(q('#code-editor'),editor);
 q('[data-action="sidebar-toggle"]').click();assert.equal(w.document.documentElement.dataset.sidebar,'collapsed');assert.equal(worker.terminated,false);
 q('[data-action="sidebar-toggle"]').click();assert.equal(w.document.documentElement.dataset.sidebar,'expanded');
 input('DINO');q('[data-sidebar-project="representation"] a').click();await tick();assert.match(q('h1').textContent,/DINO/);assert.equal(q('#sidebar-project-search').value,'DINO');
 q('.sidebar-module-link[href="#/book"]').click();await tick();assert.equal(q('#sidebar-practice-body').hidden,true);assert.equal(q('#sidebar-book-body').hidden,false);
 await nav('#/book/training/posttrain');assert.equal(q('#sidebar-book-body a[aria-current=page]').getAttribute('href'),'#/book/training/posttrain');
 await nav('#/book/training/posttrain/sft');assert.ok(q('#sidebar-book-body [data-sidebar-node="book:training"]').open);assert.ok(q('#sidebar-book-body [data-sidebar-node="book:training/posttrain"]').open);
 await nav('#/practice/vision-baseline');assert.equal(q('#sidebar-book-body').hidden,true);assert.equal(q('#sidebar-project-search').value,'');assert.equal(visible().length,14);assert.equal(q('#code-editor').value,editor.value);
 const saved=JSON.parse(w.localStorage.getItem(STORAGE_KEY));assert.deepEqual(saved.practice.projects['vision-baseline'].reviewed,[]);assert.deepEqual(errors,[]);dom.window.close();
});
