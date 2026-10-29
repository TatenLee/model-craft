import {escapeHTML as e} from './state.js';

export function weekSchedule(week){
 return `<section class="panel weekly-plan"><h3>这一周，每天具体做什么</h3><p>时间是含动手与复盘的预算。每天只有 30 分钟时，可以把一天拆成数次完成，不需要赶日历。</p>${week.schedule.map(d=>`<details class="day-plan"><summary><span>第 ${d.day} 天</span><strong>${e(d.title)}</strong><small>${d.minutes} 分钟</small></summary><p>${e(d.action)}</p><p class="expected"><b>做到什么程度：</b>${e(d.expected)}</p>${d.lessonId?`<a class="text-link" href="#/lesson/${d.lessonId}">打开对应讲解 →</a>`:`<button class="btn btn-small" data-action="week-quiz" data-week="${week.id}">检查本周理解</button>`}</details>`).join('')}</section>`;
}

export function lessonBody(l,allLessons){
 const prerequisites=l.prerequisites.map(id=>allLessons.find(x=>x.id===id)).filter(Boolean);
 return `<div class="lesson-start callout"><strong>先确认起点</strong><p>${prerequisites.length?'这一课接着以下内容讲；不熟悉时可以先返回：':'会阅读简单变量、列表和循环就能开始。无需先学大模型缩写，也不用先补一门数学课。'}</p>${prerequisites.map(p=>`<a class="text-link" href="#/lesson/${p.id}">${e(p.title)} →</a>`).join('')}<p>建议分三次学：① 新词和前半段讲解；② 手算与代码；③ 引导练习和检查。不会时先看提示，参考解析用于帮助理解。</p></div>
 <section class="reading-section"><h2>学完这一课，你能</h2><ul>${l.objectives.map(o=>`<li>${e(o)}</li>`).join('')}</ul></section>
 <section class="reading-section" id="lesson-terms" tabindex="-1"><h2>本课新词：先把含义讲清楚</h2><dl class="lesson-terms">${l.terms.map(t=>`<div><dt>${e(t.name)}</dt><dd>${e(t.meaning)}<p><b>具体例子：</b>${e(t.example)}</p></dd></div>`).join('')}</dl></section>
 ${l.sections.map((s,i)=>`<section class="reading-section lesson-step" id="lesson-step-${i}" tabindex="-1"><h2>${e(s.title)}</h2>${s.body.map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}
 <section class="reading-section worked-example" id="lesson-worked" tabindex="-1"><span class="badge">完整推演</span><h2>${e(l.worked.title)}</h2><ol>${l.worked.steps.map(s=>`<li>${e(s)}</li>`).join('')}</ol><p class="takeaway">${e(l.worked.takeaway)}</p></section>
 <section class="reading-section" id="lesson-code" tabindex="-1"><h2>${e(l.example.title)}</h2><p>本课示例只用 Python 标准库，可直接在网页运行。先保持原样，对照输出，再只改一个值做观察。</p><pre><code>${e(l.example.code)}</code></pre><a class="btn btn-primary lesson-run" href="#/code/lesson-${l.id}">运行并修改本课示例 →</a><h3>原始代码的预期输出</h3><pre class="expected-output">${e(l.example.output)}</pre><p>${e(l.example.explanation)}</p></section>
 <section class="reading-section" id="lesson-checks" tabindex="-1"><h2>跟着提示检查理解</h2><p>只检查本课或前置课程已经讲过的内容。先尝试解释，不会时打开提示；再用参考解析找出差在哪里。这些开放题由你对照解析，不使用自动评分。</p>${l.checks.map((c,i)=>`<article class="guided-question"><h3>${i+1}. ${e(c.prompt)}</h3><details><summary>给我一点提示</summary><p>${e(c.hint)}</p></details><details class="reference-answer"><summary>展开参考解析</summary><p>${e(c.answer)}</p><button class="text-link section-button" data-action="lesson-section" data-id="lesson-step-${c.section}">回看这一步讲解 ↑</button></details></article>`).join('')}</section>
 <section class="reading-section" id="lesson-practice" tabindex="-1"><h2>${e(l.guidedPractice.title)}</h2><ol class="guided-tasks">${l.guidedPractice.steps.map(t=>`<li><p>${e(t.action)}</p><details><summary>怎样判断做对了</summary><p>${e(t.expected)}</p></details><details><summary>卡住时看这里</summary><p>${e(t.trouble)}</p></details></li>`).join('')}</ol>${l.links.length?`<div class="lesson-resource-links">${l.links.map(a=>`<a class="btn btn-small" href="${e(a.href)}">${e(a.label)} →</a>`).join('')}</div>`:''}</section>`;
}

export function lessonContents(l){
 const entries=[['lesson-terms','本课新词'],...l.sections.map((s,i)=>['lesson-step-'+i,s.title]),['lesson-worked','完整推演'],['lesson-code','运行本课示例'],['lesson-checks','提示与参考解析'],['lesson-practice','分步动手练习']];
 return `<nav class="lesson-toc" aria-label="本课目录">${entries.map(([id,title])=>`<button data-action="lesson-section" data-id="${id}">${e(title)}</button>`).join('')}</nav>`;
}
