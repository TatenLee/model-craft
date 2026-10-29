export const labDefinitions = [
  { id:'gradient', title:'一次参数更新', tag:'真实数值计算', week:1, description:'用梯度下降拟合 y = 2x + 1。改变学习率，观察每一次更新。', question:'学习率更大，是否总是学得更快？', explanation:'每一步都用当前权重计算预测和均方误差，再用同一批样本计算梯度。图里的曲线和数值来自当前实验，没有预置训练成绩。', steps:['先用 0.05 运行 20 步，记录误差。','重置后把学习率调至 0.7，再运行 20 步。','比较收敛速度、震荡和发散；每次只改变一个条件。'], note:'这是 2 个可训练参数的回归模型。它展示更新机制，不代表大模型的训练规模。' },
  { id:'attention', title:'因果注意力', tag:'机制演示', week:2, description:'选择一个位置，检查它能看到哪些 token。绿色可见，灰色不可见。', question:'训练时看到未来答案，会带来什么后果？', explanation:'自回归训练可并行计算各位置，但每个位置只能使用当前位置及之前的输入。目标右移之后，后续输入可能包含当前要预测的答案。', steps:['选择第三个位置，看可见范围。','打开“允许看未来”，检查多出来的信息。','解释为什么训练 loss 可能下降，而实际生成变差。'], note:'矩阵展示可见性规则，不是某个模型真实的注意力权重。' },
  { id:'lora', title:'LoRA 参数预算', tag:'真实数值计算', week:5, description:'比较一个线性层的基础权重和低秩更新。', question:'可训练参数减少，是否等于总显存同比减少？', explanation:'基础矩阵形状为 out × in。低秩更新 ΔW = BA，A 为 r × in、B 为 out × r，因此适配器参数为 r(in + out)。这里不计 bias。', steps:['固定输入输出维度，改变 rank。','观察可训练参数占比。','解释为什么冻结的基础权重仍要存储，前向计算也仍存在。'], note:'这里仅计算一个线性层的参数量，不预测整体 GPU 显存、吞吐或模型质量。' },
  { id:'rollout', title:'世界模型 rollout', tag:'简化动态模型', week:8, description:'对比真实轨迹和带有系统偏差的预测，观察误差如何累积。', question:'单步预测好，为什么连续生成仍可能失败？', explanation:'真实环境为 s(t+1)=s(t)+a(t)。示例预测器把动作乘以增益并加入固定偏差。自由运行使用自己上一步的预测；teacher forcing 使用真实上一步状态。', steps:['保持增益 1.08，观察 24 步自由运行。','切换为使用真实历史，比较均方误差。','关闭动作输入，检查预测是否仍响应动作。'], note:'预测器的偏差由你设置，并未经过训练。用于隔离误差积累机制，不声称是 OmniFM 的性能。' },
  { id:'memory', title:'记忆与梯度窗口', tag:'简化递归状态', week:9, description:'观察状态数值、reset 与反向传播窗口分别控制什么。', question:'截断梯度之后，模型会忘记历史吗？', explanation:'这里用 s(t)=0.85s(t−1)+x(t) 表示递归状态。detach 只断开计算图，数值继续保留；reset 将状态清零。绿色底边表示最后一次查询的梯度窗口。', steps:['保持不重置，缩短梯度窗口。','检查状态数值是否改变。','将 reset 间隔改为 4，观察数值与梯度边界。'], note:'这是状态与梯度边界的教学模型，不是 KDA 公式或真实反向传播求导器。' },
  { id:'flow', title:'Flow Matching 直觉', tag:'给定路径插值', week:7, description:'拖动时间 t，观察起点分布沿给定直线路径移动到目标分布。', question:'给定训练路径，与学会生成路径有何区别？', explanation:'训练可构造 x(t)=(1−t)x₀+tx₁，直线路径的速度目标为 x₁−x₀。真实生成时需要学习条件速度场，并通过数值积分移动新的起点。', steps:['从 t=0 拖到 t=1，观察分布。','区分已知终点的训练样本和未知终点的生成。','在代码练习之外，用下载的训练项目建立自己的实验记录。'], note:'本图使用已知起点和终点做插值，没有训练速度网络，也不是生成模型的采样结果。' }
];

const controls = {
 gradient:`<label>学习率 <b id="lr-label">0.05</b><input id="lr" type="range" min="0.01" max="0.8" step="0.01" value="0.05"></label><div class="row gap-sm"><button class="btn" id="one-step">更新 1 步</button><button class="btn btn-primary" id="many-steps">更新 20 步</button></div>`,
 attention:`<label>当前输入位置 <b id="position-label">3</b><input id="position" type="range" min="1" max="6" step="1" value="3"></label><label class="row"><input id="future" type="checkbox"> 允许看未来（错误设置）</label>`,
 lora:`<label>输入维度<input id="din" type="number" min="1" max="65536" step="1" value="4096"></label><label>输出维度<input id="dout" type="number" min="1" max="65536" step="1" value="4096"></label><label>Rank <b id="rank-label">16</b><input id="rank" type="range" min="1" max="128" value="16"></label>`,
 rollout:`<label>动作增益 <b id="gain-label">1.08</b><input id="gain" type="range" min="0.8" max="1.2" step="0.01" value="1.08"></label><label>预测步数 <b id="horizon-label">24</b><input id="horizon" type="range" min="4" max="40" value="24"></label><label class="row"><input id="teacher" type="checkbox"> 使用真实历史</label><label class="row"><input id="ignore-action" type="checkbox"> 忽略动作</label>`,
 memory:`<label>梯度窗口（步） <b id="window-label">4</b><input id="window" type="range" min="1" max="16" value="4"></label><label>状态重置间隔<select id="reset-interval"><option value="0">不重置</option><option value="4">每 4 步</option><option value="8">每 8 步</option></select></label>`,
 flow:`<label>时间 t <b id="time-label">0.35</b><input id="flow-time" type="range" min="0" max="1" step="0.01" value="0.35"></label>`
};

export function renderLab(id) {
 const lab=labDefinitions.find(l=>l.id===id)||labDefinitions[0];
 return `<div class="lab-tabs">${labDefinitions.map(l=>`<a class="btn ${l.id===lab.id?'active':''}" href="#/labs/${l.id}">${l.title}</a>`).join('')}</div><div class="lab-layout"><section class="panel lab-stage"><div class="between"><h2>${lab.title}</h2><span class="badge">${lab.tag}</span></div><p>${lab.description}</p><div class="lab-controls">${controls[lab.id]}</div><div id="lab-visual" class="lab-chart" role="img" aria-label="${lab.description}"></div><div id="lab-metrics" class="lab-metrics" aria-live="polite"></div><div class="lab-actions">${lab.id==='gradient'?'<button class="btn btn-small" id="reset-lab">重置参数</button>':''}<button class="btn btn-small" id="record-lab">记录这次观察</button><a class="btn btn-small btn-ghost" href="#/course/${lab.week}">回到第 ${lab.week} 周课程 →</a></div></section><aside class="panel lab-notes"><div><h3>先想一想</h3><p>${lab.question}</p><h3>背后的机制</h3><p>${lab.explanation}</p></div><div><h3>实验任务</h3><ol>${lab.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div><div class="callout">${lab.note}</div></aside></div>`;
}

export function gradientStep(w,b,rate) {
 const xs=[-2,-1.5,-1,-.5,0,.5,1,1.5,2];
 let dw=0,db=0;
 for(const x of xs){const e=w*x+b-(2*x+1);dw+=2*e*x/xs.length;db+=2*e/xs.length;}
 return {w:w-rate*dw,b:b-rate*db};
}
export const mse=(w,b)=>[-2,-1.5,-1,-.5,0,.5,1,1.5,2].reduce((s,x)=>s+(w*x+b-(2*x+1))**2,0)/9;
export function simulateRollout(gain,horizon,teacher=false,ignoreAction=false){
 let truth=[0],prediction=[0];
 for(let i=0;i<horizon;i++){const a=Math.sin(i*.35)*.25+.08;truth.push(truth.at(-1)+a);prediction.push((teacher?truth[i]:prediction[i])+(ignoreAction?0:gain*a)+.015);}
 return {truth,prediction,mse:prediction.slice(1).reduce((s,v,i)=>s+(v-truth[i+1])**2,0)/horizon};
}
export function recurrentStates(resetInterval=0){let s=0;return Array.from({length:16},(_,i)=>{if(resetInterval&&i%resetInterval===0)s=0;s=.85*s+(i===0?1:0);return s;});}
const num=x=>Math.abs(x)>10000?x.toExponential(2):x.toFixed(4);
const metric=(label,value)=>`<div class="lab-metric"><small>${label}</small><strong>${value}</strong></div>`;
function svgPlot(el,series,{xLabel='步数',yLabel='数值',dots=[],domain=null}={}) {
 const W=Math.max(260,Math.round(el.getBoundingClientRect().width)),H=W<400?230:270;
 const p={l:48,r:18,t:28,b:38},all=series.flatMap(s=>s.data).concat(dots);
 let xmin=domain?.[0]??Math.min(...all.map(d=>d[0])),xmax=domain?.[1]??Math.max(...all.map(d=>d[0]));
 let ymin=domain?.[2]??Math.min(...all.map(d=>d[1])),ymax=domain?.[3]??Math.max(...all.map(d=>d[1]));
 if(xmin===xmax)xmax=xmin+1;if(ymin===ymax)ymax=ymin+1;
 if(!domain){const pad=(ymax-ymin)*.12;ymin-=pad;ymax+=pad;}
 const x=v=>p.l+(v-xmin)/(xmax-xmin)*(W-p.l-p.r),y=v=>H-p.b-(v-ymin)/(ymax-ymin)*(H-p.t-p.b);
 let out=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${yLabel}随${xLabel}变化"><title>${yLabel}随${xLabel}变化</title>`;
 for(let i=0;i<4;i++){const val=ymin+(ymax-ymin)*i/3;out+=`<line x1="${p.l}" y1="${y(val)}" x2="${W-p.r}" y2="${y(val)}" stroke="#e7eee8"/><text x="${p.l-8}" y="${y(val)+4}" text-anchor="end" class="chart-label">${Math.abs(val)>10000?val.toExponential(0):val.toFixed(1)}</text>`;}
 for(let i=0;i<4;i++){const val=xmin+(xmax-xmin)*i/3;out+=`<text x="${x(val)}" y="${H-17}" text-anchor="middle" class="chart-label">${Number(val.toFixed(1))}</text>`;}
 out+=`<text x="${p.l}" y="13" class="chart-label">${yLabel}</text><text x="${W-p.r}" y="${H-2}" text-anchor="end" class="chart-label">${xLabel}</text>`;
 for(const s of series){out+=`<polyline fill="none" stroke="${s.color}" stroke-width="2.3" ${s.dash?'stroke-dasharray="5 4"':''} points="${s.data.map(d=>`${x(d[0])},${y(d[1])}`).join(' ')}"/>`;}
 for(const d of dots){out+=`<circle cx="${x(d[0])}" cy="${y(d[1])}" r="3.5" fill="#7f9f77"/>`;}
 el.innerHTML=out+'</svg>';
}

export function bindLab(id,onRecord){
 const lab=labDefinitions.find(l=>l.id===id)||labDefinitions[0];
 const visual=document.getElementById('lab-visual'),metrics=document.getElementById('lab-metrics');
 let w=-1,b=-.5,step=0,history=[[0,mse(w,b)]],snapshot='';
 const v=id=>Number(document.getElementById(id).value),checked=id=>document.getElementById(id).checked;
 const label=(id,text)=>{document.getElementById(id).textContent=text;};
 function draw(){
  if(lab.id==='gradient'){
   label('lr-label',v('lr').toFixed(2));
   const diverged=Math.abs(w)+Math.abs(b)>1e6;
   svgPlot(visual,[{color:'#287957',data:[[-2,w*-2+b],[2,w*2+b]]}],{xLabel:'输入 x',yLabel:'预测 y',dots:[-2,-1.5,-1,-.5,0,.5,1,1.5,2].map(x=>[x,2*x+1])});
   metrics.innerHTML=metric('更新步数',step)+metric('当前 MSE',num(mse(w,b)))+metric('权重 w / 偏置 b',`${num(w)} / ${num(b)}`)+(diverged?'<div class="callout warning">参数已明显发散。重置后尝试较小学习率。</div>':'');
   snapshot=`学习率=${v('lr')}；更新=${step}步；MSE=${num(mse(w,b))}；w=${num(w)}；b=${num(b)}。合成数据 y=2x+1，真实梯度计算。`;
  } else if(lab.id==='attention'){
   const selected=v('position')-1,future=checked('future');label('position-label',selected+1);
   let html='<div class="mask-grid"><div></div>'+['BOS','我','在','学习','世界','模型'].map(t=>`<div class="mask-label">${t}</div>`).join('');
   for(let i=0;i<6;i++){html+=`<div class="mask-label">位置 ${i+1}</div>`;for(let j=0;j<6;j++){const allowed=j<=i||future;html+=`<div class="mask-cell ${allowed?'allowed':''} ${future&&j>i?'future':''} ${i===selected?'selected':''}" aria-label="位置${i+1}${allowed?'可以':'不能'}看到位置${j+1}">${allowed?'1':'0'}</div>`;}}
   visual.innerHTML=html+'</div><div class="legend"><span><i></i>允许看到</span><span><i class="orange"></i>泄漏未来信息</span><span>0 = 被屏蔽</span></div>';
   metrics.innerHTML=metric('选中位置',selected+1)+metric('可见 token',future?6:selected+1)+metric('泄漏未来 token',future?5-selected:0);
   snapshot=`观察位置${selected+1}，允许未来=${future}，可见token=${future?6:selected+1}。可见性机制演示。`;
  } else if(lab.id==='lora'){
   const di=Math.max(1,Math.min(65536,Math.floor(v('din')||1))),dout=Math.max(1,Math.min(65536,Math.floor(v('dout')||1))),r=v('rank');label('rank-label',r);
   const base=di*dout,adapter=r*(di+dout),pct=100*adapter/base;
   visual.innerHTML=`<div style="padding:24px 0"><p class="small muted">基础权重 W · ${dout} × ${di}</p><div style="height:52px;background:#dce9df;border-radius:7px;margin:12px 0 30px"></div><p class="small muted">低秩更新 BA · ${dout} × ${r} 与 ${r} × ${di}</p><div style="height:52px;width:${Math.min(100,Math.max(1,pct))}%;min-width:4px;background:#3b8a64;border-radius:7px;margin-top:12px"></div><p class="small muted" style="margin-top:15px">条形按参数量比例绘制；小于 1% 的条形保留可见宽度。</p></div>`;
   metrics.innerHTML=metric('基础参数量',base.toLocaleString())+metric('LoRA 可训练参数',adapter.toLocaleString())+metric('相对基础权重',`${pct.toFixed(2)}%`)+(adapter>=base?'<div class="callout warning">当前 rank 对这个层已不再节省可训练参数。</div>':'');
   snapshot=`线性层${di}→${dout}，rank=${r}，基础参数=${base}，LoRA参数=${adapter}，占比=${pct.toFixed(2)}%。不含bias，不代表总显存。`;
  } else if(lab.id==='rollout'){
   const gain=v('gain'),h=v('horizon'),teacher=checked('teacher'),ignore=checked('ignore-action'),r=simulateRollout(gain,h,teacher,ignore);
   label('gain-label',gain.toFixed(2));label('horizon-label',h);
   svgPlot(visual,[{color:'#398061',data:r.truth.map((p,i)=>[i,p])},{color:'#c98b57',dash:true,data:r.prediction.map((p,i)=>[i,p])}],{yLabel:'环境状态 s',xLabel:'预测步数'});
   visual.insertAdjacentHTML('beforeend','<div class="legend"><span><i></i>真实轨迹</span><span><i class="orange"></i>模型预测</span></div>');
   metrics.innerHTML=metric('预测 MSE',num(r.mse))+metric('最后一步绝对误差',num(Math.abs(r.truth.at(-1)-r.prediction.at(-1))))+metric('历史来源',teacher?'真实状态':'自身预测');
   snapshot=`增益=${gain}，步数=${h}，真实历史=${teacher}，忽略动作=${ignore}，MSE=${num(r.mse)}，最后一步误差=${num(Math.abs(r.truth.at(-1)-r.prediction.at(-1)))}。示例预测器，并非训练结果。`;
  } else if(lab.id==='memory'){
   const window=v('window'),reset=v('reset-interval'),states=recurrentStates(reset);label('window-label',window);
   const lastReset=reset?Math.floor(15/reset)*reset:0,gradStart=Math.max(16-window,lastReset);
   visual.innerHTML='<div class="memory-cells">'+states.map((s,i)=>`<div class="memory-cell ${i>=gradStart?'differentiable':''} ${reset&&i%reset===0?'reset':''}"><span>${s.toFixed(3)}</span><small>t = ${i+1}${i===0?' · x=1':''}</small></div>`).join('')+'</div><div class="legend"><span><i></i>最终查询的梯度窗口</span><span><i class="orange"></i>重置边界</span></div>';
   metrics.innerHTML=metric('最终记忆值',states.at(-1).toFixed(4))+metric('配置梯度窗口',`${window} 步`)+metric('考虑 reset 后的窗口',`${16-gradStart} 步`);
   snapshot=`梯度窗口=${window}，reset间隔=${reset||'不重置'}，最终记忆值=${states.at(-1).toFixed(4)}。detach不改变数值，reset改变状态。`;
  } else {
   const t=v('flow-time');label('time-label',t.toFixed(2));const W=Math.max(260,Math.round(visual.getBoundingClientRect().width)),H=270;
   const points=Array.from({length:56},(_,i)=>{const angle=i*2.399963,r=Math.sqrt((i+.5)/56)*1.1,x0=Math.cos(angle)*r,y0=Math.sin(angle)*r;const cluster=i%2===0?-1:1,x1=cluster*1.3+Math.sin(i*5.3)*.32,y1=Math.cos(i*2.1)*.4;return{x:x0*(1-t)+x1*t,y:y0*(1-t)+y1*t};});
   visual.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="给定配对样本在时间${t}的线性插值"><title>给定路径插值：不是训练结果</title><line x1="25" y1="135" x2="${W-25}" y2="135" stroke="#e3eae3"/><line x1="${W/2}" y1="15" x2="${W/2}" y2="255" stroke="#e3eae3"/>${points.map(p=>`<circle cx="${W/2+p.x*(W-70)/4}" cy="${135-p.y*88}" r="4" fill="#418566" opacity=".75"/>`).join('')}<text x="25" y="24" class="chart-label">t = ${t.toFixed(2)}</text><text x="${W-25}" y="258" text-anchor="end" class="chart-label">56 个配对样本</text></svg>`;
   metrics.innerHTML=metric('当前 t',t.toFixed(2))+metric('起点权重',(1-t).toFixed(2))+metric('终点权重',t.toFixed(2));
   snapshot=`给定直线路径插值t=${t}。x(t)=(1-t)x₀+t x₁。未训练速度场，不是生成质量评测。`;
  }
 }
 document.querySelectorAll('.lab-controls input,.lab-controls select').forEach(el=>el.addEventListener('input',draw));
 const takeSteps=n=>{for(let i=0;i<n;i++){if(Math.abs(w)+Math.abs(b)>1e8)break;({w,b}=gradientStep(w,b,v('lr')));step++;history.push([step,mse(w,b)]);}draw();};
 document.getElementById('one-step')?.addEventListener('click',()=>takeSteps(1));
 document.getElementById('many-steps')?.addEventListener('click',()=>takeSteps(20));
 document.getElementById('reset-lab')?.addEventListener('click',()=>{w=-1;b=-.5;step=0;history=[[0,mse(w,b)]];draw();});
 document.getElementById('record-lab').addEventListener('click',()=>onRecord({title:lab.title+' · 观察记录',hypothesis:lab.question,result:snapshot,metric:'记录具体数值，并区分演示与模型实验',status:'draft'}));
 const observer=new ResizeObserver(draw);observer.observe(visual);draw();
 return ()=>observer.disconnect();
}
