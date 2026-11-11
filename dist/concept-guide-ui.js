import {escapeHTML as e} from './state.js';
import {concepts} from './data/concepts.js';
import {guideById,conceptComparisons} from './data/concept-guides/index.js';
import {guideIdsForTerm,conceptPanelKey} from './data/concept-guides/terms.js';
import {examplesForConcept} from './data/concept-examples.js';
const names=new Map(concepts.map(c=>[c.id,c.term]));
const list=items=>`<ol>${items.map(x=>`<li>${e(x)}</li>`).join('')}</ol>`;
export function conceptGuideHTML(id,{inline=false,omitWhy=false}={}){
 const g=guideById.get(id);if(!g)return '';
 const comparisons=conceptComparisons.filter(x=>x.ids.includes(id));
 const examples=examplesForConcept(id);
 return `<div class="concept-guide" data-concept-guide="${e(id)}">
 ${omitWhy?'':`<section><h3>为什么需要它？</h3><p>${e(g.why)}</p></section>`}
 <section><h3>用日常场景建立直觉</h3><p>${e(g.everyday.story)}</p><p class="analogy-boundary"><b>类比到这里为止：</b>${e(g.everyday.boundary)}</p></section>
 <section><h3>跟着一个具体例子推演</h3>${list(g.worked)}</section>
 <section><h3>实际怎么用、检查什么？</h3>${list(g.use)}</section>
 <section class="concept-tradeoffs"><div><h3>它带来的好处</h3><p>${e(g.benefit)}</p></div><div><h3>代价、局限与常见问题</h3><p>${e(g.cost)}</p></div></section>
 ${comparisons.map(c=>`<section class="concept-comparison"><h3>${e(c.question)}</h3><div class="concept-table-scroll" role="region" aria-label="${e(c.question)}" tabindex="0"><table><thead><tr><th scope="col">比较角度</th><th scope="col">含义与作用</th><th scope="col">区别或边界</th></tr></thead><tbody>${c.rows.map(row=>`<tr>${row.map((cell,i)=>i?`<td>${e(cell)}</td>`:`<th scope="row">${e(cell)}</th>`).join('')}</tr>`).join('')}</tbody></table></div><div class="topic-row">${c.ids.filter(x=>x!==id).map(x=>`<a class="chip" href="#/concepts/${e(x)}">${e(names.get(x))} →</a>`).join('')}</div></section>`).join('')}
 ${examples.length?`<section class="concept-run"><h3>改一个输入，亲眼看结果</h3>${examples.map(ex=>`<article><h4>${e(ex.title)}</h4><p>${e(ex.change)}</p><p class="small muted">先手算 → 运行原例 → 修改 → 对照解释。可保存代码，属于观察实验，不计挑战分数。</p><a class="btn btn-small btn-primary" href="#/code/${ex.id}">打开可运行例子 →</a></article>`).join('')}</section>`:''}
 <section class="concept-self-check"><h3>现在试着解释</h3><p>${e(g.check.question)}</p><details><summary>想过以后，再展开参考解释</summary><p>${e(g.check.answer)}</p></details><p class="small muted">这是理解自查，不会因展开答案自动标记掌握。</p></section>
 ${inline?`<a class="text-link" href="#/concepts/${e(id)}">打开 ${e(names.get(id))} 的完整词条与原始资料 →</a>`:''}</div>`;
}
export function termTeaching(t){
 const ids=guideIdsForTerm(t.name);
 return `<div class="term-teaching"><dt>${e(t.name)}</dt><dd><p>${e(t.meaning)}</p>${t.example?`<p><b>先看一个例子：</b>${e(t.example)}</p>`:''}${ids.map(id=>{const g=guideById.get(id);return `<p class="term-motivation"><b>${ids.length>1?e(names.get(id))+' · ':''}为什么需要：</b>${e(g.why)}</p><details class="term-deep-dive" data-concept-panel="${e(conceptPanelKey(t.name,id))}"><summary>展开${e(names.get(id))}：类比、逐步算例、用法与取舍</summary>${conceptGuideHTML(id,{inline:true,omitWhy:true})}</details>`;}).join('')}</dd></div>`;
}
export function conceptExamplePage(ex,editor){
 return `<div class="concept-example-page"><div class="page-heading"><div><span class="eyebrow">概念小实验 · 可修改 Python</span><h1>${e(ex.title)}</h1><p>${e(ex.summary)}</p></div></div><div class="row wrap">${ex.conceptIds.map(id=>`<a class="btn btn-small" href="#/concepts/${e(id)}">返回 ${e(names.get(id))} →</a>`).join('')}</div><section class="panel panel-pad"><h2>先预测，再运行</h2><ol>${ex.instructions.map(s=>`<li>${e(s)}</li>`).join('')}</ol><details><summary>原始代码的预期输出</summary><pre>${e(ex.expectedOutput)}</pre></details><details><summary>改动后的结果与解释</summary><p>${e(ex.prediction)}</p></details><p class="callout">这是机制观察，不计入编程挑战成绩，也不代表完成完整训练。代码改动自动保存在本机；需要实现函数并提交检查时，回到章节中的代码练习。</p></section><section class="panel panel-pad">${editor}</section></div>`;
}
