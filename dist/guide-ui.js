import {skillNodes,conceptAxes,projectOrientation,recommendedPath,extensionPath,trainingLoop} from './data/learning-map.js';
import {workshops} from './data/workshops.js';
import {projectStages} from './data/projects.js';
import {concepts} from './data/concepts.js';
import {missionStatus} from './workshop-state.js';
import {escapeHTML as e} from './state.js';

const skill=id=>skillNodes.find(s=>s.id===id);
const workshop=id=>workshops.find(w=>w.id===id);
const projectURL=id=>`#/projects/workshop-${id}`;
const conceptLinks=ids=>ids.map(id=>{const c=concepts.find(c=>c.id===id);return c?`<a class="chip" href="#/concepts/${id}">${e(c.term)}</a>`:'';}).join('');
export const skillLinks=ids=>ids.map(id=>`<a class="chip" href="#/guide/${id}">${e(skill(id).title)}</a>`).join('');
const projectLinks=ids=>ids.map(id=>{const w=workshop(id);return `<a class="guide-project-link" href="${projectURL(id)}"><b>${w.number}</b> ${e(w.title)} <span aria-hidden="true">↗</span></a>`;}).join('');
export function nextProject(state){return recommendedPath.map(workshop).find(w=>w.milestones.some(m=>!missionStatus(w,m,state).reviewed));}

export function projectContext(w){
 const o=projectOrientation[w.id];
 return `<section class="panel panel-pad project-context"><div class="between wrap"><span class="eyebrow">${w.number} · 完整项目 · 在能力地图中的位置</span><a class="text-link" href="#/guide/path">查看整条学习路径 →</a></div><div class="topic-row">${skillLinks(o.skills)}</div><p><b>为什么做：</b>${e(o.why)}</p><p><b>最终交付：</b>${e(o.result)}</p>${o.previous.length?`<div class="context-links"><span class="small muted">建议先具备这些项目的能力：</span>${projectLinks(o.previous)}</div>`:'<p class="small muted">这是完整项目的起点，从这里建立第一条训练闭环。</p>'}<p><a class="text-link" href="#/architectures/learn/${({pretrain:'foundation','sft-lora':'foundation',vision:'vision',flow:'generation','world-model':'embodied',memory:'state',planning:'embodied',systems:'evaluation',omnifm:'embodied'})[w.id]||'foundation'}">先定位相关结构与设计取舍 →</a></p><details><summary>遇到机制不懂时，去哪里补？</summary><p>下面的 M 是短机制练习，P 是完整项目。按需要补一个，再回到当前项目；不用把两套内容全部重做。</p><div class="row wrap">${w.prerequisites.map(id=>{const m=projectStages.find(s=>s.id===id);return `<a class="btn btn-small" href="#/projects/${id}">${e(m.title)}</a>`;}).join('')}</div></details>${o.next.length?`<div class="context-links"><span class="small muted">学完可以继续：</span>${projectLinks(o.next)}</div>`:'<p class="small muted">完成后回到作品自评，用真实 run 的证据复核各项能力。</p>'}</section>`;
}

function skillDetail(node){
 return `<div class="between wrap"><span class="eyebrow">能力 ${String(skillNodes.indexOf(node)+1).padStart(2,'0')} / 06</span><a class="text-link" href="#/guide/path">按项目顺序学习 →</a></div><h2 id="skill-detail-title">${e(node.title)}</h2><p class="guide-question">${e(node.question)}</p><p>${e(node.intro)}</p><div class="guide-detail-grid"><div><h3>你要能亲手做到</h3><ul>${node.learn.map(s=>`<li>${e(s)}</li>`).join('')}</ul><p><b>交付证据：</b>${e(node.outcome)}</p></div><div class="guide-example"><h3>放进一个具体例子</h3><p>${e(node.example)}</p></div></div><h3>这些词属于这项能力</h3><div class="topic-row">${conceptLinks(node.concepts)}</div><h3>点击项目，把它做出来</h3><div class="guide-project-links">${projectLinks(node.projects)}</div><div class="guide-connection"><b>和其他能力怎样连接？</b><p>${e(node.connection)}</p><div class="topic-row">${skillLinks(node.connects)}</div></div>`;
}

function skillsView(selected){
 return `<section class="panel guide-map-panel"><div class="between wrap"><div><h2>算法工程师的六项能力</h2><p>点击一个分支看解释，再从详情进入项目。一个项目通常训练多项能力。</p></div><span class="badge">能力地图 · 非先后顺序</span></div><div class="skill-map" aria-label="算法工程师能力关系图"><svg class="skill-map-lines" aria-hidden="true"></svg><div class="skill-map-root"><span class="eyebrow">ALGORITHM ENGINEER</span><strong>把问题做成<br>能训练、能评测、<br>能使用的模型</strong><span>你的方向：具身 / 世界模型</span></div>${skillNodes.map((n,i)=>`<button type="button" class="skill-node ${selected.id===n.id?'selected':''}" style="--map-column:${n.side==='left'?1:3};--map-row:${n.row}" data-skill="${n.id}" aria-pressed="${selected.id===n.id}" aria-controls="skill-detail"><span class="skill-node-number">0${i+1}</span><strong>${e(n.title)}</strong><span>${e(n.question)}</span><small>查看讲解与 ${n.projects.length} 个对应项目 →</small></button>`).join('')}</div><p class="small muted">连线表示共同构成岗位能力。项目的建议先后顺序在「我的项目路径」中。</p></section><div id="guide-selection-status" class="sr-only" role="status"></div><section class="panel panel-pad skill-detail" id="skill-detail" aria-labelledby="skill-detail-title" tabindex="-1">${skillDetail(selected)}</section><section class="panel panel-pad guide-loop"><h2>这些能力怎样参与一次模型迭代？</h2><p>先看完整流程，再拆解组件。点任一步，都能回到对应能力和实战入口。</p><ol>${trainingLoop.map((s,i)=>`<li><a href="#/guide/${s.skill}"><span class="eyebrow">0${i+1}</span><strong>${s.title}</strong><span>${e(s.body)}</span></a></li>`).join('')}</ol><p class="guide-feedback">↶ 评测发现问题 → 提出假设 → 固定其他条件，只改数据、结构或训练配方中的一个变量 → 再比较。</p><p class="small muted">推理通常只执行前向计算；训练还包含损失、反向传播和参数更新。训练损失下降后，仍要验证任务表现。</p></section>`;
}

function conceptsView(){
 return `<section class="panel panel-pad"><h2>先问「这个词在回答什么问题」</h2><p>预训练、SFT、LoRA、Decoder-only、DINO、世界模型不在同一个分类层级。它们可以同时描述同一个系统，不能排成一列互相替代。</p><div class="concept-sentence"><span>已有预训练基座</span><i>→</i><span>Decoder-only 结构</span><i>＋</i><span>SFT 标注示范</span><i>＋</i><span>LoRA 参数更新</span><i>→</i><span>独立任务评测</span></div><p><b>SFT</b>（监督微调）告诉模型「遇到这个输入，应输出这个示范答案」；<b>LoRA</b> 冻结原始权重，学习较小的低秩增量。前者决定用什么监督训练，后者决定哪些参数可以改变，所以可以一起用。</p><a class="btn btn-primary" href="${projectURL('sft-lora')}">到 P02 亲手比较 SFT 与 LoRA →</a></section><div class="concept-axis-grid">${conceptAxes.map((axis,i)=>`<section class="panel panel-pad concept-axis"><span class="eyebrow">分类视角 0${i+1}</span><h2>${e(axis.title)}</h2><p>${e(axis.note)}</p><div class="topic-row">${conceptLinks(axis.terms)}</div><div class="guide-project-links">${projectLinks(axis.projects)}</div></section>`).join('')}</div><section class="panel panel-pad"><h2>遇到公司里的新缩写，怎样归位？</h2><p>先看它出现的位置：配置字段、模型类、训练命令、loss、评测报告，还是一个内部工具页面。再追到定义与输入输出。PT、rewardx 等名称需要具体上下文；缩写相似不能证明是同一种技术。</p><div class="topic-row">${conceptLinks(['pt','rewardx','lsd'])}</div><a class="text-link space-top" href="#/concepts">打开完整概念词典 →</a></section>`;
}

function pathCard(id,state,index,extension=false){
 const w=workshop(id),o=projectOrientation[id],done=w.milestones.filter(m=>missionStatus(w,m,state).reviewed).length;
 return `<li class="panel guide-path-card"><div class="guide-path-index">${extension?'+':String(index+1).padStart(2,'0')}</div><div><div class="between wrap"><span class="eyebrow">${w.number} · ${extension?'扩展专题':'核心项目'} · 约 ${w.hours} 小时</span><span class="badge badge-gray">${done}/${w.milestones.length} 里程碑自查</span></div><h3><a href="${projectURL(id)}">${e(w.title)} →</a></h3><p>${e(o.why)}</p><p><b>做出什么：</b>${e(o.result)}</p><div class="topic-row">${skillLinks(o.skills)}</div><div class="between wrap space-top"><span class="small muted">${o.previous.length?'承接 '+o.previous.map(p=>workshop(p).number).join('、')+' 的能力':'从这里开始第一条完整训练闭环'}</span><a class="btn btn-small" href="${projectURL(id)}">进入 ${w.number} 带练 →</a></div></div></li>`;
}

function pathView(state){
 const next=nextProject(state);
 return `<section class="panel panel-pad guide-next"><span class="eyebrow">你的方向 · 具身智能 / 世界模型训练</span><h2>${next?`下一站：${next.number} ${e(next.title)}`:'核心路径已记录自查，回到证据做一次复验'}</h2><p>${next?'按核心顺序推荐首个尚未完成全部里程碑自查的项目。已有能力可以跳过，进度不会锁住后续内容。':'检查代码、对照、失败样例和答辩；自查记录不等于模型效果或岗位认证。'}</p><div class="row wrap"><a class="btn btn-primary" href="${next?projectURL(next.id):'#/projects'}">${next?'开始 / 继续这个项目':'查看作品自评'} →</a><a class="btn" href="#/course">按每天的课程补知识</a></div></section><section class="panel panel-pad"><h2>为什么有 P 和 M？应该走哪一条？</h2><div class="path-legend"><div><span class="badge">P01–P10 · 完整项目</span><p>沿问题、数据、训练、评测和迭代做出作品。以这条路径为主线，每个项目有 5 个里程碑。</p></div><div><span class="badge badge-gray">M01–M16 · 机制练习</span><p>用浏览器 Python 拆开一个机制。遇到不懂的 mask、rollout 或 LoRA 时，从 P 项目里的链接去补，再返回项目。</p></div></div><p class="callout">例如：P02 是完整的 SFT / LoRA 任务；M09 练 response mask，M10 练低秩更新。完成这两个短练习，有助于你解释 P02 的实现，但不替代完整训练和评测。</p><p>12 周课程提供日程和详细讲解，概念词典用于查词；它们服务于同一条项目主线，不需要额外重复做两套作业。P 编号是固定身份，下面按你的目标重新排列学习顺序。</p></section><h2 class="guide-section-title">核心路径 · 7 个作品逐步汇合到 OmniFM</h2><ol class="guide-path">${recommendedPath.map((id,i)=>pathCard(id,state,i)).join('')}</ol><p class="small muted">核心项目约 106 小时，加上约 20 小时按需机制补课，12 周平均每周 10–11 小时。每天只有半小时的时候，可以延长周期，优先保留完整的实验闭环。</p><h2 class="guide-section-title">扩展路径 · 按岗位需求加深</h2><p>偏好训练、生成方法与规划补齐不同能力。满足各卡片的承接能力后再进入；不挤占核心作品验收。</p><ol class="guide-path">${extensionPath.map((id,i)=>pathCard(id,state,i,true)).join('')}</ol>`;
}

export function guidePage(id,state){
 const tab=id==='concepts'?'concepts':id==='path'?'path':'skills',selected=skill(id)||skillNodes[0];
 return `<div class="page-heading"><div><span class="eyebrow">YOUR MAP TO MODEL ENGINEERING</span><h1>先看全景，再动手做模型。</h1><p>从数据工程走向具身 / 世界模型算法：知道要学什么，理解概念关系，找到下一步实战。</p></div></div><section class="panel panel-pad arch-entry"><span class="eyebrow">结构学习 · 从原理到训练对照</span><h2>SSM、SWA、KDA、DSA 分别改了模型的哪里？</h2><p>从整体骨干、历史读取、状态记忆到 MoE、视觉与动作，按设计问题建立关联。11 节导学、结构关系图、并排对比和可执行练习，帮助你在项目里作出选择。</p><div class="row wrap"><a class="btn btn-primary" href="#/architectures">开始模型结构导学 →</a><a class="btn" href="#/architectures/map">查看结构关系图</a></div></section><nav class="guide-tabs" aria-label="学习导览视图">${[['skills','能力全景','先知道要会什么'],['concepts','概念关系','把陌生术语归位'],['path','我的项目路径','按顺序做出作品']].map(([key,title,sub])=>`<a class="${tab===key?'active':''}" href="#/guide${key==='skills'?'':'/'+key}" ${tab===key?'aria-current="page"':''}><b>${title}</b><span>${sub}</span></a>`).join('')}</nav>${tab==='skills'?skillsView(selected):tab==='concepts'?conceptsView():pathView(state)}`;
}

// The semantic buttons and links work without the decorative SVG or ResizeObserver.
export function bindGuide(){
 const map=document.querySelector('.skill-map');if(!map)return ()=>{};
 const draw=()=>{
  const svg=map.querySelector('svg'),root=map.querySelector('.skill-map-root'),box=map.getBoundingClientRect(),r=root.getBoundingClientRect();
  if(!box.width||window.innerWidth<=760){svg.replaceChildren();return;}
  svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  svg.innerHTML=[...map.querySelectorAll('.skill-node')].map(button=>{
   const b=button.getBoundingClientRect(),left=skill(button.dataset.skill).side==='left';
   const x1=(left?r.left:r.right)-box.left,y1=r.top+r.height/2-box.top,x2=(left?b.right:b.left)-box.left,y2=b.top+b.height/2-box.top,mid=(x1+x2)/2;
   return `<path class="${button.classList.contains('selected')?'selected':''}" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}"/>`;
  }).join('');
 };
 const onClick=event=>{const button=event.target.closest('[data-skill]');if(!button)return;const node=skill(button.dataset.skill);map.querySelectorAll('[data-skill]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});const detail=document.getElementById('skill-detail');detail.innerHTML=skillDetail(node);document.getElementById('guide-selection-status').textContent=`已显示「${node.title}」的讲解和对应项目。`;window.history.replaceState(null,'',`#/guide/${node.id}`);draw();detail.scrollIntoView?.({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});detail.focus({preventScroll:true});};
 map.addEventListener('click',onClick);window.addEventListener('resize',draw);window.addEventListener('modelcraft:appearance',draw);
 const observer=window.ResizeObserver?new window.ResizeObserver(draw):null;observer?.observe(map);draw();
 return ()=>{observer?.disconnect();map.removeEventListener('click',onClick);window.removeEventListener('resize',draw);window.removeEventListener('modelcraft:appearance',draw);};
}
