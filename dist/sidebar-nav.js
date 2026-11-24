import {bookTree} from './book-ui.js';
import {practiceProjects,practiceById} from './data/practice-projects.js';
import {practiceGroups,matchingProjects} from './data/practice-navigation.js';
import {escapeHTML as e} from './state.js';

// UI-only state survives route changes; it never modifies learning progress.
const expansion=new Map();
let query='',lastRoute='',lastModule='',scrollPosition=0,routeChanged=false;
const moduleName=id=>id==='practice'?'实战路线':'书籍目录';
const directoryName=id=>id==='practice'?'实战目录':'书籍目录';
function moduleHTML(id,active,body,icon){
 const open=expansion.get('module:'+id)??active;
 return `<section class="sidebar-module" data-sidebar-module="${id}" aria-label="${moduleName(id)}模块"><div class="sidebar-module-heading"><a class="nav-link sidebar-module-link ${active?'active':''}" href="#/${id}" title="${moduleName(id)}" ${active?'aria-current="location"':''}>${icon(id==='practice'?'layers':'book')}<span class="nav-text">${moduleName(id)}</span></a><button type="button" class="sidebar-module-toggle" data-sidebar-toggle="${id}" aria-expanded="${open}" aria-controls="sidebar-${id}-body" aria-label="${open?'收起':'展开'}${directoryName(id)}"><span class="sidebar-chevron" aria-hidden="true"></span></button></div><div class="sidebar-module-body" id="sidebar-${id}-body" ${open?'':'hidden'}>${body}</div></section>`;
}
function projectTree(id,state,showSteps){
 return `<label class="sidebar-search-label" for="sidebar-project-search">筛选项目</label><div class="sidebar-search"><input id="sidebar-project-search" type="search" maxlength="100" placeholder="项目名 / SFT / DINO" value="${e(query)}" autocomplete="off"><button type="button" id="sidebar-project-clear" aria-label="清除项目筛选" ${query?'':'hidden'}>清除</button></div><p class="sidebar-filter-count" id="sidebar-project-count" aria-live="polite"></p><nav class="sidebar-tree practice-tree" aria-label="侧栏实战目录">${practiceGroups.map(g=>`<details data-sidebar-node="practice:${g.id}" data-project-group="${g.id}" ${g.projects.includes(id)?'open':''}><summary><span>${e(g.title)}</span></summary><div class="tree-children">${g.projects.map(key=>{
  const p=practiceById.get(key),current=key===id,number=practiceProjects.indexOf(p)+1;
  return `<div class="sidebar-project" data-sidebar-project="${key}"><a class="sidebar-project-link" href="#/practice/${key}" ${current?'aria-current="page"':''}><span class="tree-number">${String(number).padStart(2,'0')}</span><span>${e(p.title)}</span></a>${current&&showSteps?`<div class="tree-children sidebar-project-steps" aria-label="当前项目步骤">${p.steps.map((step,i)=>`<button type="button" data-practice-jump="practice-step-${i}"><span class="tree-number">${i+1}.</span><span>${e(step.title)}</span></button>`).join('')}</div>`:''}</div>`;
 }).join('')}</div></details>`).join('')}</nav><p class="sidebar-no-results" id="sidebar-project-empty" hidden>没有匹配的项目，试试其他名称或清除筛选。</p>`;
}
export function sidebarModules(page,id,state,icon){
 const section=['book','learn'].includes(page)?'book':page==='practice'||(page==='code'&&id==='practice-class-recall')?'practice':'';
 const key=page+'/'+id;routeChanged=lastRoute!==key;lastRoute=key;
 const projectId=page==='practice'?id:page==='code'&&id==='practice-class-recall'?'vision-baseline':'';
 if(routeChanged&&section){
  if(lastModule!==section){expansion.set('module:practice',section==='practice');expansion.set('module:book',section==='book');lastModule=section;}
  expansion.set('module:'+section,true);
  if(section==='practice'){
   const group=practiceGroups.find(g=>g.projects.includes(projectId||state.practice.active));
   if(group)expansion.set('practice:'+group.id,true);
   if(projectId&&query&&!matchingProjects(query).includes(projectId))query='';
  }else if(id){const [volume,chapter]=id.split('/');expansion.set('book:'+volume,true);if(chapter)expansion.set('book:'+volume+'/'+chapter,true);}
 }
 return moduleHTML('book',section==='book',bookTree(page==='book'?id:'',state,{compact:true}),icon)+moduleHTML('practice',section==='practice',projectTree(projectId,state,page==='practice'),icon);
}
export function bindSidebarNavigation({onStepJump=()=>{}}={}){
 const sidebar=document.getElementById('main-sidebar');if(!sidebar)return ()=>{};
 const controller=new window.AbortController(),signal=controller.signal;
 const trees=[...sidebar.querySelectorAll('[data-sidebar-node]')];
 for(const el of trees)if(expansion.has(el.dataset.sidebarNode))el.open=expansion.get(el.dataset.sidebarNode);
 sidebar.addEventListener('click',event=>{if(event.target.closest('[data-practice-jump]'))onStepJump();},{signal});
 const search=document.getElementById('sidebar-project-search');
 function filter(){
  const matches=new Set(matchingProjects(query));
  sidebar.querySelectorAll('[data-sidebar-project]').forEach(el=>{el.hidden=!matches.has(el.dataset.sidebarProject);});
  sidebar.querySelectorAll('[data-project-group]').forEach(el=>{
   const group=practiceGroups.find(g=>g.id===el.dataset.projectGroup);
   el.hidden=!group.projects.some(id=>matches.has(id));
   el.open=query?!el.hidden:!!expansion.get(el.dataset.sidebarNode);
  });
  document.getElementById('sidebar-project-count').textContent=query?`匹配 ${matches.size} / ${practiceProjects.length} 个项目`:`${practiceProjects.length} 个项目 · 按方向展开`;
  document.getElementById('sidebar-project-empty').hidden=matches.size!==0;
  document.getElementById('sidebar-project-clear').hidden=!query;
 }
 filter();
 trees.forEach(el=>el.addEventListener('toggle',()=>{
  if(!query||!el.dataset.projectGroup)expansion.set(el.dataset.sidebarNode,el.open);
 },{signal}));
 sidebar.querySelectorAll('[data-sidebar-toggle]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.sidebarToggle,body=document.getElementById(button.getAttribute('aria-controls')),open=body.hidden;
  body.hidden=!open;expansion.set('module:'+id,open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',`${open?'收起':'展开'}${directoryName(id)}`);
 },{signal}));
 search.addEventListener('input',()=>{query=search.value.slice(0,100);filter();},{signal});
 document.getElementById('sidebar-project-clear').addEventListener('click',()=>{query='';search.value='';filter();search.focus();},{signal});
 sidebar.scrollTop=scrollPosition;
 if(routeChanged){const current=sidebar.querySelector('.sidebar-module-body a[aria-current=page]');if(current){const target=current.getBoundingClientRect(),bounds=sidebar.getBoundingClientRect();if(bounds.height>0){if(target.bottom>bounds.bottom-24)sidebar.scrollTop+=target.bottom-bounds.bottom+24;else if(target.top<bounds.top+24)sidebar.scrollTop-=bounds.top+24-target.top;}}}
 return ()=>{scrollPosition=sidebar.scrollTop;controller.abort();};
}
