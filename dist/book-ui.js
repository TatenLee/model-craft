import {guideIdsForTerm} from './data/concept-guides/terms.js';
import {conceptExamples} from './data/concept-examples.js';
import {termTeaching} from './concept-guide-ui.js';
import {bookReviews} from './data/book-reviews.js';
import {readingOrder,mainReading,progressionByKey,volumeMilestones} from './data/book-progression.js';
import {bookVolumes,bookSections,bookSectionByKey,bookHref,lessonBookSection,sourceBookSection,bookProjectMap,bookMechanismMap,bookJourneyMap} from './data/book.js';
import {bookMaterial} from './book-content.js';
import {bookRecord,bookAnswers,bookStatus,readingResume} from './book-state.js';
import {lessonBody} from './course-ui.js';
import {days} from './data/days.js';
import {journeyStages} from './data/journey.js';
import {escapeHTML as e} from './state.js';
const link=(key,title,cls='',current=false)=>`<a class="${cls}" href="${bookHref(key)}" ${current?'aria-current="page"':''}>${e(title)}</a>`;
const sourceLinks=sources=>(sources||[]).map(s=>`<a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.label)} ↗</a>`).join('');
const heading=(title,text)=>`<div class="page-heading"><div><h1>${e(title)}</h1><p>${e(text)}</p></div></div>`;
function mapLinks(links){return (links||[]).map(a=>Array.isArray(a)?`<a class="btn btn-small" href="#/${a[1]}${a[2]?'/'+a[2]:''}">${e(a[0])} →</a>`:`<a class="btn btn-small" href="${e(a.href)}">${e(a.label)} →</a>`).join('');}
function canonicalLinks(html){return html.replace(/href="#\/lesson\/(w\d+-l\d+)"/g,(_,id)=>`href="${bookHref(lessonBookSection(id)?.key)}"`);}
export function bookTree(key,state,{compact=false}={}){
 const ids=key.split('/');
 return `<nav class="book-tree ${compact?'book-tree-compact sidebar-tree':''}" aria-label="${compact?'侧栏书籍目录':'全书分层目录'}">${bookVolumes.map((v,vi)=>`<details data-sidebar-node="book:${v.id}" ${(!compact||v.id===ids[0])?'open':''}><summary><span>${e(v.title)}</span></summary><div class="tree-children">${link(v.id,'第 '+(vi+1)+' 卷导读','book-parent-link',key===v.id)}${v.chapters.map((c,ci)=>`<details data-sidebar-node="book:${v.id}/${c.id}" ${v.id===ids[0]&&c.id===ids[1]?'open':''}><summary><span>${ci+1}. ${e(c.title)}</span></summary><div class="tree-children">${link(v.id+'/'+c.id,'本章导读与综合练习','book-parent-link',key===v.id+'/'+c.id)}${c.sections.map((s,si)=>{const k=`${v.id}/${c.id}/${s.id}`;return `<a href="${bookHref(k)}" ${k===key?'aria-current="page"':''}><span>${vi+1}.${ci+1}.${si+1}</span><span>${e(s.title)}${state.book.records[k]?.readAt?' · 已读':''}</span></a>`;}).join('')}</div></details>`).join('')}</div></details>`).join('')}</nav>`;
}
const sectionTitle=key=>bookSectionByKey.get(key).title;
const sectionLink=key=>link(key,sectionTitle(key));
function resumeCard(state){
 const last=state.book.lastRead,s=readingResume(state);
 if(!last)return `<section class="panel panel-pad book-resume"><div><span class="eyebrow">第一次来</span><h2>先做一个入口判断</h2><p>给函数两个输入，你能预测它的返回值吗？不能就从第一卷动手；已经会写函数，就直接训练一个模型。</p></div><div class="book-entry-actions">${link(readingOrder[0].key,'从 Python 预测函数起步 →','btn')}${link(s.key,'从训练闭环开始 →','btn btn-primary')}</div></section>`;
 return `<section class="panel panel-pad book-resume"><div><span class="eyebrow">继续上次的位置</span><h2>${e(s.title)}</h2><p>${e(s.volumeTitle)} / ${e(s.chapterTitle)}</p><p class="small muted">继续阅读会恢复段落。已读、理解题、当前代码和实验观察分别记录；进度可在设置中导出。</p></div>${link(s.key,'继续阅读 →','btn btn-primary')}</section>`;
}
function routeList(steps){
 return `<ol class="book-route-list">${steps.map(step=>{const s=bookSectionByKey.get(step.key);return `<li>${link(step.key,s.title)} <small>${e(step.track)} · ${s.number}</small></li>`;}).join('')}</ol>`;
}
function bookHome(state){
 return `<div class="book-page">${heading('一本从零构建模型的实践书。','把一个可调整的函数变成能独立检验的系统：先写预测，再训练、生成、适配、行动，最后交付可复现的证据。')}${resumeCard(state)}
 <section class="panel panel-pad book-orientation"><h2>怎样读这本书</h2><p><b>主线必学</b>串起从定义任务到独立交付的 ${mainReading.length} 节；<b>方向选修</b>只在任务需要时展开；<b>按需补课</b>解决代码、误差和形状上的障碍。能做出自查题可以跳读，但不会自动记为掌握。</p><p>章号是查找地址，不是硬性先后顺序。按「推荐顺读」翻页会先学依赖；按「只走主线」前进则略过分支。两种走法共用同一份笔记。</p><p>P 编号标识项目，M 编号标识机制练习，R 是机器人案例；不用按三组编号各读一遍。</p></section>
 <div class="book-volume-grid">${bookVolumes.map(v=>{const milestone=volumeMilestones[v.id];return `<article class="panel panel-pad"><h2>${link(v.id,v.title)}</h2><p>${e(v.question)}</p><p><b>过卷自查：</b>${e(milestone.gate)}</p><p class="small muted">${e(milestone.pass)}</p>${link(v.id,'查看本卷先修与推荐课序 →','text-link')}</article>`;}).join('')}</div>
 <section class="panel panel-pad"><h2>全书目录 · 卷 → 章 → 节</h2><p>按主题查阅原章号，或展开每卷导读查看按依赖编排的学习顺序。目录和书签仍指向同一个小节。</p>${bookTree('',state)}</section>
 <section class="panel panel-pad"><h2>内容范围与实战状态</h2><p>语言小模型、低维世界模型、二维 Flow 和模拟策略都有可运行实验。完整图像或视频生成、真实权重与多卡性能需要对应数据、环境和运行证据；不能用机制练习代替。</p><div class="row wrap"><a class="btn" href="#/paths">查看各方向实战状态</a><a class="btn" href="#/library">查阅全部材料</a><a class="btn" href="#/settings">导出/导入学习进度</a></div></section></div>`;
}
export function bookPage(key,state,exercises,editor){
 if(!key)return bookHome(state);
 const [vid,cid,sid,...rest]=key.split('/'),v=bookVolumes.find(v=>v.id===vid),c=v?.chapters.find(c=>c.id===cid),s=bookSectionByKey.get(key);
 if(!v||rest.length||(cid&&!c)||(sid&&!s))return `<section class="panel panel-pad"><h1>没有找到这一章</h1>${link('','返回全书目录','btn')}</section>`;
 if(!sid)return overview(v,c,state,exercises);
 return reader(s,v,c,state,exercises,editor);
}
function overview(v,c,state,exercises){
 const prefix=c?`${v.id}/${c.id}/`:`${v.id}/`,steps=readingOrder.filter(step=>step.key.startsWith(prefix)),milestone=volumeMilestones[v.id];
 const first=steps[0],main=mainReading.filter(step=>step.key.startsWith(prefix)),last=steps.at(-1);
 const external=[...new Set(steps.flatMap(step=>step.requires.filter(key=>!key.startsWith(prefix))))];
 const next=c?v.chapters[v.chapters.indexOf(c)+1]:bookVolumes[bookVolumes.indexOf(v)+1];
 const onward=next?link(c?`${v.id}/${next.id}`:next.id,`目录下一${c?'章':'卷'}：${next.title} →`,'btn'):link(c?v.id:'',c?'回到本卷导读':'返回全书目录','btn');
 return `<div class="book-page"><nav class="book-crumb" aria-label="书籍位置">${link('','全书目录')} / ${link(v.id,v.title)}${c?' / '+e(c.title):''}</nav>${heading(c?c.title:v.title,c?c.problem:v.question)}
 <section class="panel panel-pad"><h2>从哪里接上，学完带走什么</h2>${c?'':`<p>${e(milestone.bridge)}</p>`}<p><b>起点：</b>${e(v.before)}</p><p><b>本次交付：</b>${e(c?c.outcome:v.outcome)}</p><p><b>${c?'收尾自查':'过卷自查'}：</b>${e(c?last.check:milestone.gate)}</p>
 ${external.length?`<details><summary>本${c?'章':'卷'}有哪些外部先修？</summary><p>以下是各节用到的基础，并非都要先读。每节页首只列该节需要的部分。</p><ul>${external.map(key=>`<li>${sectionLink(key)}</li>`).join('')}</ul></details>`:''}
 <div class="row wrap">${link(first.key,'从推荐首节开始 →','btn btn-primary')}${main.length&&main[0]!==first?link(main[0].key,'直接进入本卷主线 →','btn'):''}</div></section>
 <section class="panel panel-pad book-orientation"><h2>${c?'本章目录':'本卷推荐课序'}</h2><p>${e(c?`${main.length?`主线 ${main.length} 节`:'本章按需学习'}。编号对应原目录；跨章的先修在节首页可直接补读。`:milestone.pass)}</p>${c?steps.map(step=>{const s=bookSectionByKey.get(step.key),st=bookStatus(s,state,exercises);return `<a class="book-section-card" href="${bookHref(s.key)}"><b>${s.number} · ${e(s.title)}</b><span>${e(step.track)} · ${st.read?'已读':'未标记已读'} · ${st.checked?'本节练习已核对':'练习待核对'}</span><small>${e(step.check)}</small></a>`;}).join(''):`${main.length?`<h3>只走主线</h3>${routeList(main)}`:''}<details ${main.length?'':'open'}><summary>展开完整推荐顺序（含补课和选修）</summary>${routeList(steps)}</details>`}</section>
 ${c?'':`<section class="panel panel-pad"><h2>按章查阅与练习</h2>${v.chapters.map((ch,i)=>`<p>${link(v.id+'/'+ch.id,`${i+1}. ${ch.title}`)}：${e(ch.outcome)}</p>`).join('')}</section>`}
 <section class="panel panel-pad book-summary"><h2>${c?'章末总结与综合练习':'卷末整合与下一卷'}</h2><ol>${chapterReview(v.id,c?.id).map(t=>`<li>${e(t)}</li>`).join('')}</ol><p>把实际输入、改动、对照和失败例写进手记。观察被保存不等于结论已验证。</p><div class="row wrap"><a class="btn" href="#/notebook">记录综合实验</a>${onward}</div></section></div>`;
}
function chapterReview(vid,cid){
 if(bookReviews[vid+'/'+cid])return bookReviews[vid+'/'+cid];
 const tasks={entry:['不用复制示例，改一个函数输入，先预测输出再运行。','故意写错返回值或张量形状，记录报错与修复依据。','用一个新样本解释参数、目标、预测和误差。'],common:['对同一数据建立常数、直线与非线性基线，保持相同划分。','解释 loss、梯度、优化器、验证各负责什么，检查一次参数前后变化。','记录训练与验证的差异，提出只改变一项的下一步实验。'],models:['画出本章模态的编码→骨干→输出与 loss，标出每个轴和条件。','比较一个简单基线与新增组件，说明它解决的信息缺失或表达问题。','保留一个输出看似正常却未通过任务验收的反例，并设计检测。'],training:['画出起始 checkpoint→数据/目标/更新范围→输出 checkpoint 的阶段图。','在固定评测集上比较分域能力、使用行为和成本；特别检查遗忘与奖励漏洞。','用第四卷第六章的小实验建立谱系，再选择 P01/P02 或偏好实验做真实对应验证。'],systems:['写清观测、状态、动作、时间戳、工具返回与终止协议。','比较一步预测、自由 rollout 和闭环任务成功，说明它们为何不等价。','注入缺历史、旧响应或卡住故障，确认系统能检测并有限终止。'],engineering:['交付可运行代码、固定配置、数据版本、环境和复现命令。','用消融和失败样例回答设计取舍，不把理论成本当作硬件实测。','邀请自己隔一天从零重跑；检查报告是否包含未验证项与结论范围。']};
 return tasks[vid];
}
function newBody(m){return `<section id="book-terms" data-book-anchor tabindex="-1"><h2>先认识本节的新词</h2><p class="small muted">先读含义与为什么需要；展开每个词，跟着类比、算例和使用步骤理解，再做自查。</p><dl class="lesson-terms">${m.terms.map(termTeaching).join('')}</dl></section>${m.steps.map((st,i)=>`<section id="book-step-${i}" data-book-anchor tabindex="-1"><h2>${e(st.title)}</h2>${st.body.map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}<section id="book-worked" data-book-anchor tabindex="-1"><span class="badge">完整推演</span><h2>跟着一个具体例子走</h2><ol>${m.worked.map(t=>`<li>${e(t)}</li>`).join('')}</ol></section><section id="book-practice" data-book-anchor tabindex="-1"><h2>带着目标动手</h2><p>${e(m.practice.action)}</p>${m.command?`<p class="small muted">下载实战包后，在解压根目录或仓库根目录运行：</p><pre><code>${e(m.command)}</code></pre><a class="btn btn-small" href="./downloads/model-craft-projects.zip" download>下载实战代码</a>`:''}${m.localCode?`<p>本地 PyTorch 示例：</p><pre><code>${e(m.localCode)}</code></pre><details><summary>对照原始输出</summary><pre>${e(m.expected)}</pre></details>`:''}<details><summary>怎样判断做对了</summary><p>${e(m.practice.expected)}</p></details><details><summary>卡住时排查</summary><p>${e(m.practice.trouble)}</p></details><div class="row wrap">${mapLinks(m.links)}</div></section>`;}
function foundationBody(m){const f=m.foundation;return `<section id="book-terms" data-book-anchor tabindex="-1"><h2>先认识新词</h2><dl class="lesson-terms">${f.terms.map(([name,meaning])=>termTeaching({name,meaning})).join('')}</dl></section>${f.sections.map((s,i)=>`<section id="book-step-${i}" data-book-anchor tabindex="-1"><h2>${e(s.title)}</h2>${s.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}<section id="book-worked" data-book-anchor tabindex="-1"><h2>推演与代码</h2><pre><code>${e(f.example.code)}</code></pre><pre>${e(f.example.output)}</pre><ol>${f.worked.map(p=>`<li>${e(p)}</li>`).join('')}</ol></section><section id="book-practice" data-book-anchor tabindex="-1"><h2>逐步动手</h2><ol>${f.practice.map(p=>`<li>${e(typeof p==='string'?p:p.action)}</li>`).join('')}</ol><p>${e(f.recovery)}</p></section>`;}
function reader(s,v,c,state,exercises,editor){
 const m=bookMaterial(s),step=progressionByKey.get(s.key),prev=readingOrder[step.index-1],next=readingOrder[step.index+1],ex=exercises.find(x=>x.id===m.exerciseId),r=state.book.records[s.key]||{},answers=bookAnswers(s,state),parent=`${v.id}/${c.id}`;
 const nextMain=mainReading.find(item=>item.index>step.index);
 const handoff=item=>{
  const target=bookSectionByKey.get(item.key);
  if(target.volumeId!==s.volumeId)return volumeMilestones[target.volumeId].bridge;
  if(target.chapterId!==s.chapterId)return v.chapters.find(ch=>ch.id===target.chapterId).problem;
  return item.distinction;
 };
 const reading=m.lesson?canonicalLinks(lessonBody(m.lesson)):m.foundation?foundationBody(m):newBody(m);
 return `<div class="book-page book-reader" data-book-key="${s.key}"><nav class="book-crumb" aria-label="书籍位置">${link('','全书目录')} / ${link(v.id,v.title)} / ${link(parent,c.title)}</nav>${heading(`${s.number} · ${s.title}`,m.goal)}
 <section class="panel panel-pad book-context" id="book-start" data-book-anchor tabindex="-1"><span class="badge">${e(step.track)}</span><h2>为什么现在学这一节</h2><p><b>本章问题：</b>${e(c.problem)}</p><div class="book-prerequisites"><b>直接先修：</b>${step.requires.length?`<ul>${step.requires.map(key=>`<li>${sectionLink(key)}</li>`).join('')}</ul>`:s.volumeId==='entry'?'不需要机器学习或编程经验。':`会读简单函数即可；还不会时从${sectionLink('entry/python/predict')}补起。`}</div><p><b>把概念分开：</b>${e(step.distinction)}</p><p><b>带着这个任务读：</b>${e(step.check)}</p><details><summary>展开本节段落导航</summary><nav id="book-local-toc" aria-label="本节段落"></nav></details></section>
 <article class="panel panel-pad book-reading">${reading}${ex?`<section id="book-code" data-book-anchor tabindex="-1"><h2>在本节完成代码练习</h2><p>实现 ${e(ex.title)}。样例运行用于观察；提交全部检查才验证当前代码。改动后需要重新运行。</p>${editor(ex)}</section>`:''}
 <section id="book-checkpoint" data-book-anchor tabindex="-1"><h2>理解检查与实验观察</h2><p>先学上面的定义与例子，再回答。答错会显示原因；原有题目成绩可继续使用。</p>${m.checks.map((q,i)=>`<fieldset class="learning-question book-question" data-index="${i}"><legend>${e(q.prompt)}</legend>${q.options.map((o,j)=>`<label><input type="radio" name="book-q-${i}" value="${j}" ${answers[i]===j?'checked':''}> ${e(o)}</label>`).join('')}<div class="book-feedback" aria-live="polite">${feedback(q,answers[i])}</div></fieldset>`).join('')}<label for="book-note"><b>记下本节的实际观察或自己的解释</b></label><p>${e(step.check)}</p><textarea class="field day-reflection" id="book-note" maxlength="12000" placeholder="写清输入、改动、观察与边界；至少 20 字用于本节自查，不由 GPT 自动判分。">${e(r.note||'')}</textarea><p id="book-note-saved" class="small muted" aria-live="polite">笔记自动保存在本机。</p><div id="book-completion">${bookCompletion(s,state,exercises)}</div><button class="btn" id="book-mark-read">${r.readAt?'撤销本节已读标记':'标记本节已读'}</button></section>
 <section id="book-handoff" data-book-anchor tabindex="-1"><h2>收束：解决了什么，为什么继续</h2>${next?`<p><b>推荐顺读 · ${e(next.track)}：</b>${sectionLink(next.key)}。${e(handoff(next))}</p>`:'<p>主线读完了。把最后一个迁移任务的代码、独立评测和失败证据交给别人，看看哪些结论能被复现。</p>'}
 ${nextMain&&nextMain!==next?`<p><b>只走主线：</b>${sectionLink(nextMain.key)}。${e(handoff(nextMain))}</p>`:''}
 <div class="row wrap">${link(parent,'本章总结与综合练习','btn btn-small')}<a class="btn btn-small" href="#/notebook">实验手记</a>${m.lesson?`<a class="btn btn-small" href="#/lesson/${m.lesson.id}">旧课笔记与原记录</a>`:''}</div><details><summary>原始资料与进一步阅读</summary><div class="book-sources">${sourceLinks(m.sources)}</div><p>机制演示不替代完整训练复现；版本、训练配方与性能请核对原始资料。</p></details></section></article>
 <nav class="book-prev-next" aria-label="推荐学习顺序">${prev?link(prev.key,'← '+sectionTitle(prev.key),'btn'):link('','← 全书目录','btn')}${next?link(next.key,sectionTitle(next.key)+' →','btn btn-primary'):link('','回到目录','btn')}</nav></div>`;
}
function feedback(q,answer){return answer===undefined?'':`<div class="learning-answer"><b>${answer===q.answer?'回答正确':'需要再想一步'}</b><p>${e(q.explanation)}</p></div>`;}
export function bookCompletion(s,state,exercises){const status=bookStatus(s,state,exercises);return `<p><b>${status.read?'已标记阅读':'尚未标记阅读'}</b> · 理解题 ${status.correct}/${status.total} · ${status.hasCode?(status.code?'当前代码全部检查通过':'当前代码待验证'):'本节为解释/本地实验，无浏览器代码判分'} · ${status.note?'已写观察':'观察待补'}</p><p class="small muted">${status.checked?'本节练习已核对；这不是完整项目复现或岗位能力认证。':'阅读不会自动通过练习；至少 20 字观察只验证已记录，不验证结论正确。'}</p>`;}
export function bindBook(key,state,exercises,save,{restore=true}={}){
 const s=bookSectionByKey.get(key);if(!s)return ()=>{};
 const controller=new window.AbortController(),signal=controller.signal,record=bookRecord(state,key),m=bookMaterial(s),reader=document.querySelector('.book-reader');
 const panels=[...reader.querySelectorAll('[data-concept-panel]')];
 if(Array.isArray(record.openConcepts))panels.forEach(p=>{p.open=record.openConcepts.includes(p.dataset.conceptPanel);});
 reader.addEventListener('toggle',ev=>{if(!ev.target.matches('[data-concept-panel]'))return;record.openConcepts=panels.filter(p=>p.open).map(p=>p.dataset.conceptPanel);save();},{capture:true,signal});
 const savedAnchor=record.anchor,savedOffset=record.offset;record.openedAt=new Date().toISOString();state.book.lastRead=key;save();
 reader.querySelectorAll('.term-teaching').forEach((el,i)=>{el.id='book-term-'+i;el.setAttribute('data-book-anchor','');el.tabIndex=-1;});
 reader.querySelectorAll('.reading-section[id]').forEach(el=>el.setAttribute('data-book-anchor',''));
 const anchors=[...reader.querySelectorAll('[data-book-anchor]')],toc=document.getElementById('book-local-toc');
 toc.innerHTML=anchors.filter(el=>el.id!=='book-start').map(el=>`<button type="button" data-book-jump="${el.id}">${e(el.querySelector('h2')?.textContent||el.querySelector('dt')?.textContent||el.id)}</button>`).join('');
 // Anchor + relative offset survives changes above the paragraph better than page scroll alone.
 let timer=null,restoring=true,closed=false;
 const capture=()=>{if(restoring||closed)return;const pos=window.scrollY||0;let chosen=anchors[0];for(const el of anchors){if(el.getBoundingClientRect().top<=100)chosen=el;}record.anchor=chosen?.id||'book-start';record.offset=Math.max(0,Math.min(6000,pos-(chosen?.getBoundingClientRect().top+pos||0)));save();};
 const scroll=()=>{clearTimeout(timer);timer=setTimeout(capture,250);};
 window.addEventListener('scroll',scroll,{passive:true,signal});window.addEventListener('pagehide',capture,{signal});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')capture();},{signal});
 const restoreFrame=window.requestAnimationFrame(()=>{if(closed)return;const target=anchors.find(el=>el.id===savedAnchor);if(restore&&target)window.scrollTo(0,Math.max(0,target.getBoundingClientRect().top+(window.scrollY||0)+savedOffset));restoring=false;});
 reader.addEventListener('click',ev=>{const b=ev.target.closest('[data-book-jump]');if(!b)return;const el=anchors.find(x=>x.id===b.dataset.bookJump);if(el){window.cancelAnimationFrame(restoreFrame);restoring=false;window.scrollTo(0,el.getBoundingClientRect().top+(window.scrollY||0));el.focus({preventScroll:true});capture();}},{signal});
 reader.querySelectorAll('.book-question').forEach(field=>field.addEventListener('change',ev=>{if(!ev.target.matches('input[type=radio]'))return;const i=Number(field.dataset.index),n=Number(ev.target.value);record.answers[i]=n;save();field.querySelector('.book-feedback').innerHTML=feedback(m.checks[i],n);document.getElementById('book-completion').innerHTML=bookCompletion(s,state,exercises);},{signal}));
 document.getElementById('book-note').addEventListener('input',ev=>{record.note=ev.target.value;save();document.getElementById('book-note-saved').textContent='观察已保存到本机。';document.getElementById('book-completion').innerHTML=bookCompletion(s,state,exercises);},{signal});
 document.getElementById('book-mark-read').addEventListener('click',ev=>{record.readAt=record.readAt?'':new Date().toISOString();save();ev.target.textContent=record.readAt?'撤销本节已读标记':'标记本节已读';document.getElementById('book-completion').innerHTML=bookCompletion(s,state,exercises);},{signal});
 return ()=>{clearTimeout(timer);capture();closed=true;window.cancelAnimationFrame(restoreFrame);controller.abort();};
}
export function bookResourceContext(page,id){
 if(['practice','book','learn','settings','notebook'].includes(page))return '';
 let target=null;
 const conceptId=page==='concepts'?id:page==='code'?conceptExamples.find(ex=>ex.id===id)?.sourceConceptId:null;
 if(conceptId)target=bookSections.find(section=>{const m=bookMaterial(section);return (m.lesson?.terms||m.terms||[]).some(t=>guideIdsForTerm(t.name).includes(conceptId));});
 if(page==='lesson')target=lessonBookSection(id);
 if(page==='day'){const d=days.find(d=>d.id===id);if(d)target=lessonBookSection(d.lessonId||`w${d.week}-l${Math.min(3,Math.ceil(d.day/2))}`);}
 if(page==='foundations')target=sourceBookSection('foundation',id);
 if(page==='journey'){const i=journeyStages.findIndex(s=>s.id===id);target=bookSectionByKey.get(bookJourneyMap[i]);}
 if(page==='projects'){const work=id.replace(/^workshop-/,'').split('/')[0];target=bookSectionByKey.get(bookProjectMap[work]);if(!target)target=bookSectionByKey.get(bookMechanismMap[id]);}
 if(page==='architectures')target=bookSectionByKey.get('engineering/architecture/architecture-choice');
 if(page==='code'){const lid=id.startsWith('lesson-')?id.slice(7):null;target=target||(lid?lessonBookSection(lid):bookSections.find(s=>bookMaterial(s).exerciseId===id));}
 return `<section class="panel panel-pad book-resource-context"><span class="eyebrow">全书中的位置</span><p>${target?`${e(target.volumeTitle)} / ${e(target.chapterTitle)}。这份材料服务于：${e(target.title)}。`:'这里是按需查阅的资料或案例。先从书籍目录定位正在解决的问题，再选择所需材料。'}</p><div class="row wrap">${link(target?.key||'',target?'返回对应章节 →':'打开全书目录 →','btn btn-small btn-primary')}${link('','查看完整目录','btn btn-small')}</div></section>`;
}
