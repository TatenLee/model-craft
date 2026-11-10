import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {skillNodes,conceptAxes,projectOrientation,recommendedPath,extensionPath,trainingLoop} from '../dist/data/learning-map.js';
import {workshops} from '../dist/data/workshops.js';
import {projectStages} from '../dist/data/projects.js';
import {concepts} from '../dist/data/concepts.js';
import {nextProject,guidePage} from '../dist/guide-ui.js';
import {createState,STORAGE_KEY} from '../dist/state.js';
import {missionKey} from '../dist/workshop-state.js';

test('capability map connects real concepts and projects with an acyclic core learning path',()=>{
 const skills=new Set(skillNodes.map(s=>s.id)),terms=new Set(concepts.map(c=>c.id)),projects=new Set(workshops.map(w=>w.id));
 assert.equal(skills.size,6);assert.equal(new Set([...recommendedPath,...extensionPath]).size,10);
 for(const n of skillNodes){
  assert.ok(n.intro&&n.example&&n.outcome&&n.connection);assert.equal(n.learn.length,3);
  n.concepts.forEach(id=>assert.ok(terms.has(id),id));n.projects.forEach(id=>assert.ok(projects.has(id),id));n.connects.forEach(id=>assert.ok(skills.has(id),id));
 }
 for(const axis of conceptAxes){axis.terms.forEach(id=>assert.ok(terms.has(id),id));axis.projects.forEach(id=>assert.ok(projects.has(id),id));}
 for(const [id,o] of Object.entries(projectOrientation)){
  assert.ok(projects.has(id));assert.ok(o.why&&o.result);o.skills.forEach(id=>assert.ok(skills.has(id)));
  for(const previous of o.previous){assert.ok(projects.has(previous));if(recommendedPath.includes(id))assert.ok(recommendedPath.indexOf(previous)<recommendedPath.indexOf(id));}
  o.next.forEach(id=>assert.ok(projects.has(id)));
 }
 trainingLoop.forEach(s=>assert.ok(skills.has(s.skill)));
 projectStages.forEach((s,i)=>{assert.ok(s.title.startsWith('M'+String(i+1).padStart(2,'0')));assert.equal(s.exercise.title,s.title);});
 assert.equal(workshops.every(w=>/^P\d\d$/.test(w.number)),true);
});

test('project recommendation follows substantive self-review records rather than checkboxes alone',()=>{
 const state=createState(),p=workshops.find(w=>w.id===recommendedPath[0]);
 assert.equal(nextProject(state).id,p.id);
 for(const m of p.milestones)state.workshopProgress[missionKey(p,m)]={checked:m.evidence.map((_,i)=>i),reviewedAt:'now',note:''};
 assert.equal(nextProject(state).id,p.id);
 for(const m of p.milestones)state.workshopProgress[missionKey(p,m)].note='实际实验的观察与对照证据。'.repeat(4);
 assert.equal(nextProject(state).id,recommendedPath[1]);
 for(const id of recommendedPath){const w=workshops.find(w=>w.id===id);for(const m of w.milestones)state.workshopProgress[missionKey(w,m)]={checked:m.evidence.map((_,i)=>i),reviewedAt:'now',note:'观察与证据'.repeat(10)};}
 assert.equal(nextProject(state),undefined);assert.match(guidePage('path',state),/核心路径已记录自查/);
});

test('appearance handles system changes, persistence, invalid storage and cross-tab updates',async()=>{
 const source=await readFile(new URL('../dist/preferences.js',import.meta.url),'utf8');
 const setup=(saved,dark=false)=>{
  const dom=new JSDOM('<meta name="theme-color"><select data-ui-theme><option>system</option><option>light</option><option>dark</option></select><button data-action="sidebar-toggle"></button>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window;
  const media={matches:dark,addEventListener:(_,fn)=>{media.change=fn;}};w.matchMedia=()=>media;
  if(saved)w.localStorage.setItem('model-craft:appearance:v1',saved);w.eval(source);return {dom,w,media};
 };
 const {dom,w,media}=setup('broken JSON',true),root=w.document.documentElement;
 assert.equal(root.dataset.theme,'dark');assert.equal(w.ModelCraftUI.get().theme,'system');
 media.matches=false;media.change();assert.equal(root.dataset.theme,'light');
 w.ModelCraftUI.set({theme:'dark',sidebarCollapsed:true});media.change();assert.equal(root.dataset.theme,'dark');assert.equal(root.dataset.sidebar,'collapsed');
 assert.equal(w.document.querySelector('button').getAttribute('aria-expanded'),'false');
 assert.equal(w.document.querySelector('select').value,'dark');
 const second=setup(w.localStorage.getItem(w.ModelCraftUI.key));assert.equal(second.w.document.documentElement.dataset.theme,'dark');assert.equal(second.w.document.documentElement.dataset.sidebar,'collapsed');second.dom.window.close();
 w.localStorage.setItem(w.ModelCraftUI.key,JSON.stringify({theme:'light',sidebarCollapsed:false}));w.dispatchEvent(new w.StorageEvent('storage',{key:w.ModelCraftUI.key}));assert.equal(root.dataset.theme,'light');assert.equal(root.dataset.sidebar,'expanded');
 w.ModelCraftUI.set({theme:'invalid'});assert.equal(w.ModelCraftUI.get().theme,'system');
 dom.window.close();
});

test('guide navigation, P/M backlinks and appearance changes preserve an active editor worker',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'http://localhost:4173/',pretendToBeVisual:true}),w=dom.window,errors=[];
 for(const key of ['window','document','location','localStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 w.addEventListener('error',ev=>errors.push(ev.error));w.scrollTo=()=>{};globalThis.confirm=()=>true;
 const workers=[];globalThis.Worker=class{constructor(){this.stopped=false;workers.push(this);}postMessage(){}terminate(){this.stopped=true;}};
 await import('../dist/app.js');
 const q=s=>{const n=w.document.querySelector(s);assert.ok(n,s);return n;};
 const nav=async path=>{w.location.hash='#/'+path;await new Promise(r=>w.setTimeout(r,12));};
 const theme=value=>{q('[data-ui-theme]').value=value;q('[data-ui-theme]').dispatchEvent(new w.Event('change',{bubbles:true}));};
 await nav('guide');
 assert.equal(w.document.querySelectorAll('.skill-node').length,6);
 for(const s of skillNodes){q(`[data-skill="${s.id}"]`).click();assert.equal(q('#skill-detail-title').textContent,s.title);assert.equal(q(`[data-skill="${s.id}"]`).getAttribute('aria-pressed'),'true');assert.equal(w.document.querySelectorAll('.skill-node[aria-pressed="true"]').length,1);assert.equal(w.location.hash,'#/guide/'+s.id);}
 await nav('guide/concepts');assert.equal(w.document.querySelectorAll('.concept-axis').length,7);assert.match(q('#main').textContent,/所以可以一起用/);
 await nav('guide/path');assert.equal(w.document.querySelectorAll('.guide-path-card').length,10);assert.match(q('.guide-next').textContent,/P01/);
 await nav('projects');assert.equal(q('.mechanism-library').open,false);assert.match(q('.project-hero .btn-primary').getAttribute('href'),/workshop-pretrain/);
 for(const project of workshops){await nav('projects/workshop-'+project.id);assert.ok(q('.project-context'));for(const id of project.prerequisites)assert.match(q(`.project-context a[href="#/projects/${id}"]`).textContent,/^M\d\d/);}
 const stage=projectStages.find(s=>s.id==='lora-layer');await nav('projects/'+stage.id);assert.match(q('h1').textContent,/^M10/);assert.ok(q('.mechanism-context a[href="#/projects/workshop-sft-lora"]'));
 const editor=q('#code-editor');editor.value='print("retained draft")';editor.dispatchEvent(new w.Event('input',{bubbles:true}));q('[data-action="run-code"]').click();assert.equal(workers.length,1);assert.equal(editor.readOnly,true);
 theme('dark');q('[data-action="sidebar-toggle"]').click();
 assert.equal(q('#code-editor'),editor);assert.equal(editor.value,'print("retained draft")');assert.equal(workers[0].stopped,false);assert.equal(editor.readOnly,true);assert.equal(w.document.documentElement.dataset.theme,'dark');assert.equal(w.document.documentElement.dataset.sidebar,'collapsed');
 q('.mobile-menu').click();assert.equal(q('.sidebar').classList.contains('open'),true);assert.equal(workers[0].stopped,false);w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(q('.sidebar').classList.contains('open'),false);
 q('[data-action="stop-code"]').click();assert.equal(workers[0].stopped,true);
 assert.equal(JSON.parse(w.localStorage.getItem(STORAGE_KEY)).code[stage.exercise.id],editor.value);
 await nav('settings');q('[data-action="reset-progress"]').click();assert.equal(w.ModelCraftUI.get().theme,'dark');assert.equal(w.ModelCraftUI.get().sidebarCollapsed,true);
 assert.deepEqual(errors,[]);dom.window.close();
});

test('dark palette has readable text, action labels and state colors; CSS parses',async()=>{
 const css=await readFile(new URL('../dist/appearance.css',import.meta.url),'utf8');
 const tokens=Object.fromEntries([...css.matchAll(/--([\w-]+):(#[0-9a-f]{6})/g)].map(([,k,v])=>[k,v]));
 const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>{const [lo,hi]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return(hi+.05)/(lo+.05);};
 for(const background of ['page','surface','surface-soft','green-soft'])for(const text of ['ink','muted','green'])assert.ok(contrast(tokens[text],tokens[background])>=4.5,`${text} on ${background}`);
 assert.ok(contrast('#ffffff','#22775e')>=4.5);assert.ok(contrast(tokens.danger,tokens['danger-soft'])>=4.5);
 const dom=new JSDOM('<style>'+await readFile(new URL('../dist/guide.css',import.meta.url),'utf8')+'</style><style>'+css+'</style>');assert.equal(dom.window.document.styleSheets.length,2);assert.ok(dom.window.document.styleSheets[1].cssRules.length>40);dom.window.close();
});
