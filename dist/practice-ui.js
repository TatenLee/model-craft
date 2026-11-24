import {practiceCoding} from './data/practice-coding.js';
import {coreGuides} from './data/practice-core-guides.js';
import {appliedGuides} from './data/practice-applied-guides.js';
import {practiceProjects,practiceById,practiceUpdated,practiceMainPath,practicePrerequisites} from './data/practice-projects.js';
import {practiceRecord,validateVisionReport} from './practice-state.js';
import {escapeHTML as e} from './state.js';
const link=p=>`#/practice/${p.id}`;
const guides={...coreGuides,...appliedGuides};
function nextProjects(p){
 const next=practiceProjects.filter(candidate=>practicePrerequisites[candidate.id].includes(p.id));
 return next.length?`<h3>哪些项目会用到这项能力？</h3><p>按想解决的问题选一条。进入项目后先核对其他前置成果，不需要按编号逐项打卡。</p><div class="row wrap">${next.map(item=>`<a class="btn" href="${link(item)}">${e(item.title)}</a>`).join('')}</div>`:'<p>这一支到此可以独立交付。整理复现命令、失败样例和结论，再决定是否换方向。</p><a class="btn" href="#/notebook">整理实验手记</a> <a class="btn" href="#/practice">选择其他方向</a>';
}
function diagramNodes(items,tag){
 return `<${tag} class="diagram-nodes">${items.map(([name,description])=>`<li><strong>${e(name)}</strong><span>${e(description)}</span></li>`).join('')}</${tag}>`;
}
function projectDiagrams(p,guide){
 return `<section class="panel panel-pad practice-blueprint" aria-labelledby="blueprint-heading">
  <h2 id="blueprint-heading">开工前，先读三张图</h2>
  <figure class="practice-mindmap"><figcaption>项目思维导图</figcaption><div class="mindmap-tree"><b class="mindmap-root">${e(p.title)}</b>${diagramNodes(guide.branches,'ul')}</div></figure>
  <div id="practice-computation" tabindex="-1" class="practice-flows"><figure><figcaption>项目架构图</figcaption><p>沿数据与产物交接，定位需要检查的工程环节。</p>${diagramNodes(guide.pipeline,'ol')}</figure>
  <figure class="practice-layer-stack"><figcaption>模型结构图</figcaption><p>每格拆解一个计算环节。并行分支分别读取注明的输入，不是上一格的下一层。</p>${diagramNodes(guide.layers,'ol')}</figure></div>
 </section>`;
}
function missionHTML(s,i,r,reason){
 return `<section class="panel panel-pad practice-mission" id="practice-step-${i}" tabindex="-1">
  <span class="badge">第 ${i+1} 步</span><h2>${e(s.title)}</h2>
  <p class="practice-reason"><strong>这一步的目的：</strong>${e(reason)}</p>
  <h3>操作步骤</h3><p>${e(s.task)}</p>
  <h3>你要亲手做的代码或实验改动</h3><p>${e(s.change)}</p>
  <h3>运行后应该检查什么</h3><p>${e(s.expect)}</p>
  <details><summary>失败了，按什么顺序查？</summary><p>${e(s.debug)}</p></details>
  <h3>留下这些证据再继续</h3><p>${e(s.evidence)}</p>
  <label for="practice-note-${i}">实际命令、结果、失败与解释</label>
  <textarea id="practice-note-${i}" class="field" rows="5" maxlength="6000" data-practice-note="${i}" placeholder="写实际观察，不复制预期结果。日志和数据仍保存在本地；这里保存你的复盘。">${e(r.notes[i]||'')}</textarea>
  <label class="practice-review"><input type="checkbox" data-practice-review="${i}" ${r.reviewed.includes(i)?'checked':''} ${(r.notes[i]||'').trim().length<40?'disabled':''}> 我已运行并按证据自查（至少写 40 字；这是自查，不是自动判分）</label>
  <p class="practice-save" aria-live="polite"></p>
  </section>`;
}
export function practicePage(id,state,editor){
 if(!id){const active=practiceById.get(state.practice.active)||practiceProjects[0];return `<div class="practice-page"><header class="practice-hero"><span class="eyebrow">从真实项目开始 · 资料按需查</span><h1>先做一个模型，再解决它的问题。</h1><p>14 项递进实战覆盖代表性的算法工作，最终汇合到世界模型、视觉语言动作策略和任务大脑。这里不是行业份额排名，也不要求先背完概念。</p><a class="btn btn-primary" href="${link(active)}">${state.practice.projects[active.id]?'继续项目':'开始第一项'}：${e(active.title)}</a> <a class="btn" href="#/book">从头学：打开六卷学习目录</a></header><section class="panel panel-pad"><h2>每次只推进一个可验证的成果</h2><ol><li>下载这一项的数据，确认一条样本、输入输出与成功标准。</li><li>先跑基线，记录实际结果，再按项目要求改一处代码。</li><li>遇到错误时按排查提示定位，只读当前需要的章节。</li><li>留下日志、模型、配置、失败样例和复现命令，再进入下一项。</li></ol><p>第一项已有可运行本地训练器；后续采用官方工程带练，需要按所选版本完成配置与适配。数据和权重由你下载，网站不启动 GPU 作业。完整路线需要持续实验，三个月可优先推进训练闭环、SFT、视觉表征、模仿策略与一个世界模型基线。</p></section><section class="panel panel-pad"><h2>如果终点是世界模型与具身大脑</h2><p>先沿下面这条线完成公共训练能力。偏好、RL、服务与图像/视频项目是可插入的专项；它们不用全部学完才能开始机器人。大脑集成前，再补检索与工具调用项目。</p><ol class="practice-main-path">${practiceMainPath.map(id=>`<li><a href="${link(practiceById.get(id))}">${e(practiceById.get(id).title)}</a></li>`).join('')}</ol></section><nav class="practice-road" aria-label="实战项目顺序">${practiceProjects.map((p,i)=>`<a class="panel panel-pad practice-project-card" href="${link(p)}"><span class="badge">${i+1} / ${practiceProjects.length} · ${e(p.kind)}</span><h2>${e(p.title)}</h2><p>${e(p.output)}</p><small>${e(p.hours)} · 自查 ${state.practice.projects[p.id]?.reviewed.length||0}/${p.steps.length}</small><p class="practice-status">${e(p.status)}</p></a>`).join('')}</nav><section class="panel panel-pad"><h2>三种能力最终怎样接起来</h2><div class="practice-system"><a href="#/practice/brain">任务大脑：分解目标、调用技能、处理反馈</a><a href="#/practice/vla">VLA / 策略：根据观测产生动作</a><a href="#/practice/world">世界模型：预测候选动作的后果</a><span>环境执行并验证，再把观测和结果送回决策流程。</span></div><p>场景数据是环境与训练资源；模型结构、训练算法、执行系统分别选择和验收。看过材料和填写自查都不等于完整复现。</p><a class="btn" href="#/book">需要时打开参考书</a></section><p class="small muted">公开资料核对：${practiceUpdated}。先固定官方仓库 commit、数据 revision 和依赖，再使用该版本说明；下面的实验范围是学习设计，不是论文性能承诺。</p></div>`;}
 const p=practiceById.get(id);if(!p)return '<section class="panel panel-pad"><h1>没有找到项目</h1><a href="#/practice">返回实战路线</a></section>';
 const r=state.practice.projects[id]||{notes:{},reviewed:[]},index=practiceProjects.indexOf(p);
 return `<div class="practice-page" data-practice="${p.id}"><a href="#/practice">返回实战路线</a><header class="practice-hero"><span class="eyebrow">${index+1} / ${practiceProjects.length} · ${e(p.kind)}</span><h1>${e(p.title)}</h1><p>${e(p.why)}</p><strong>最后交付：${e(p.output)}</strong><p class="small muted">${e(p.status)}</p><div class="practice-step-nav" aria-label="项目速览"><button type="button" data-practice-jump="practice-computation">看架构与模型分层</button><button type="button" data-practice-jump="practice-setup">准备环境与数据</button><button type="button" data-practice-jump="practice-step-0">进入第 1 步</button></div></header>
 ${projectDiagrams(p,guides[id])}
 <section id="practice-setup" tabindex="-1" class="panel panel-pad"><h2>开工前只确认这几件事</h2><p><b>需要已有的成果：</b>${practicePrerequisites[id].length?practicePrerequisites[id].map(key=>`<a href="${link(practiceById.get(key))}">${e(practiceById.get(key).title)}</a>`).join('；'):'能运行 Python 文件即可；遇到语法或张量问题再查入门卷。'}。编号是推荐浏览顺序，前置能力决定能否开始；已有同等经验可直接进入。</p><p><b>实践预算：</b>${e(p.hours)}，含动手、排错与复盘，可拆多天。</p><p><b>设备：</b>${e(p.hardware)}</p><p>先建立独立环境，保留 python/pip、CUDA/驱动（若使用）、仓库 commit、数据/模型 revision。高级项目采用独立环境，避免把所有框架混装。</p><div class="practice-assets">${p.assets.map(a=>`<article><a href="${e(a.url)}" target="_blank" rel="noopener noreferrer">${e(a.label)}</a><p>${e(a.purpose)}</p></article>`).join('')}</div><a class="btn" href="${e(p.repo)}" target="_blank" rel="noopener noreferrer">官方实现 / 训练教程</a>${p.local?`<a class="btn" href="./downloads/model-craft-projects.zip" download>下载本地实战代码包</a><p>仓库或解压根目录中打开 <code>${e(p.local)}</code>，有逐条命令、代码位置和验收说明。</p><pre>${e(p.command)}</pre>`:`<p>本项使用上方官方实现。先记录版本并完成官方最小推理/环境示例，再按下方任务修改数据与训练配置；不提供未经实际运行却宣称通用的一键命令。</p>`}</section>
 <nav class="practice-step-nav" aria-label="本项目动手步骤">${p.steps.map((s,i)=>`<button data-practice-jump="practice-step-${i}">${i+1}. ${e(s.title)}</button>`).join('')}</nav>
 ${p.steps.map((s,i)=>missionHTML(s,i,r,guides[id].rationale[i])).join('')}
 ${id==='vision-baseline'&&editor?practiceCodingPanel(editor):''}${id==='vision-baseline'?`<section class="panel panel-pad"><h2>在这里查看真实训练曲线</h2><label for="vision-report">选择本地 report.json（只在浏览器读取，不上传）</label><input type="file" id="vision-report" accept=".json,application/json"><div id="vision-report-result" aria-live="polite"><p>导入后比较训练与验证曲线；报告只是观察材料，不会自动通过项目。</p></div></section>`:''}<section class="panel panel-pad"><h2>卡在概念时，再查这几页</h2><div class="row wrap">${p.reads.map(([label,url])=>`<a class="btn" href="${url}">${e(label)}</a>`).join('')}</div>${nextProjects(p)}</section></div>`;
}
export function visionReportHTML(raw){const r=validateVisionReport(raw),h=r.history,max=Math.max(...h.map(v=>Math.max(v.train_loss,v.val_loss)),.01),points=key=>h.map((v,i)=>`${35+(h.length===1?0:i/(h.length-1))*640},${190-v[key]/max*165}`).join(' ');return `<p>模型 ${e(r.arch)} · ${h.length} 个 epoch 记录 · 数据指纹 ${e(r.hash.slice(0,12))}。报告由本地文件提供，未认证训练真实性。</p><svg class="practice-chart" viewBox="0 0 710 220" role="img" aria-label="训练 loss 与验证 loss 随 epoch 的曲线"><line x1="35" y1="190" x2="685" y2="190" stroke="currentColor"/><polyline points="${points('train_loss')}" fill="none" stroke="var(--green)" stroke-width="3"/><polyline points="${points('val_loss')}" fill="none" stroke="var(--orange)" stroke-width="3"/><text x="35" y="215" fill="currentColor">epoch ${h[0].epoch}</text><text x="570" y="215" fill="currentColor">epoch ${h.at(-1).epoch}</text></svg><p>绿色：训练 loss；橙色：验证 loss。纵轴从 0 到 ${e(max.toFixed(3))}，表格保留精确值。</p><div class="practice-table"><table><thead><tr><th>Epoch</th><th>训练 loss</th><th>验证 loss</th><th>训练准确率</th><th>验证准确率</th></tr></thead><tbody>${h.map(v=>`<tr><td>${v.epoch}</td><td>${v.train_loss.toFixed(4)}</td><td>${v.val_loss.toFixed(4)}</td><td>${(v.train_accuracy*100).toFixed(1)}%</td><td>${(v.val_accuracy*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;}
export function bindPractice(id,state,save){const p=practiceById.get(id);if(!p)return ()=>{};state.practice.active=id;const r=practiceRecord(state,id);save();const controller=new window.AbortController(),signal=controller.signal;
 document.querySelectorAll('[data-practice-note]').forEach(el=>el.addEventListener('input',()=>{const i=Number(el.dataset.practiceNote);r.notes[i]=el.value;r.reviewed=r.reviewed.filter(x=>x!==i);const box=document.querySelector(`[data-practice-review="${i}"]`);box.checked=false;box.disabled=el.value.trim().length<40;save();el.closest('section').querySelector('.practice-save').textContent='已保存；修改观察后请重新自查。';},{signal}));
 document.querySelectorAll('[data-practice-review]').forEach(el=>el.addEventListener('change',()=>{const i=Number(el.dataset.practiceReview);r.reviewed=r.reviewed.filter(x=>x!==i);if(el.checked&&(r.notes[i]||'').trim().length>=40)r.reviewed.push(i);save();},{signal}));
 document.querySelectorAll('[data-practice-jump]').forEach(el=>el.addEventListener('click',()=>{const target=document.getElementById(el.dataset.practiceJump);target.scrollIntoView?.({behavior:'smooth',block:'start'});target.focus({preventScroll:true});},{signal}));
 const file=document.getElementById('vision-report');file?.addEventListener('change',async()=>{const out=document.getElementById('vision-report-result');try{if(!file.files[0])return;if(file.files[0].size>2000000)throw new Error('报告超过 2 MB，请选择训练器生成的 JSON 报告');const raw=JSON.parse(await file.files[0].text());if(!signal.aborted)out.innerHTML=visionReportHTML(raw);}catch(err){if(!signal.aborted)out.textContent='无法读取报告：'+err.message;}},{signal});return ()=>controller.abort();}

export function practiceCodingPanel(editor){const ex=practiceCoding[0];return `<section class="panel panel-pad"><h2>${e(ex.title)}</h2><p>${e(ex.context)}</p><h3>先手算，再写代码</h3><p>${e(ex.worked)}</p><p>${e(ex.mistake)}</p>${editor(ex)}<h3>把函数接回本地项目</h3><p>${e(ex.transfer)}</p></section>`;}
