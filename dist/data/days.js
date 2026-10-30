import {weeks,lessons,lessonExamples} from './curriculum.js';
import {questions} from './concepts.js';
import {dailyChallenges} from './practice/index.js';
import {readingGuides} from './reading-guides.js';

export const weeklyConnections={
 1:['输入和目标来自数据；结构确定规则形式，参数是训练修改的共享数值。','平方损失衡量错误，梯度描述局部变化方向，学习率控制实际更新幅度。','训练数据用于调整参数，验证数据用于比较方案，最终测试应保持独立。','本周用批量预测、梯度更新、独立评测组成一个训练器。检查零步、一步、收敛和验证标签隔离。'],
 2:['词表编号是地址，embedding 是可训练向量；序列长度与参数表大小不同。','Q/K 负责匹配分数，softmax 归一化，V 提供被读取内容。','目标右移确定要预测什么，因果掩码确定允许读取什么，两项都必须正确。','本周综合题实现一个注意力头；它不包含完整 Transformer，但可通过未来扰动测试验证因果性。'],
 3:['预训练描述流程阶段，自监督描述目标来源；不是同一层级的分类。','logits、交叉熵和有效目标归一化决定实际优化什么。','学习率日程与 checkpoint 状态影响优化路径，权重文件不等于完整恢复。','本周用计数 bigram 完成可解释的语言基线，明确它与 Transformer 梯度预训练的区别。'],
 4:['从数据对齐、有限损失、梯度存在、参数变化逐段排查，而不是只看 loss 曲线。','累积梯度应匹配有效 token 目标；全局裁剪与逐元素裁剪不是一回事。','准确率和错误去向回答不同问题，基准成绩必须附带评测协议。','综合程序的顺序是加权合并、全局裁剪、参数更新。顺序不同会改变算法。'],
 5:['SFT 用示范塑造任务行为，回答 mask 按右移后的目标位置决定。','LoRA 规定低秩参数增量，可以与监督微调组合；基础权重仍参与计算。','评分选择、偏好目标与生成模型更新是不同步骤；rewardx 需语境查证。','综合题连接 LoRA logits 和监督交叉熵，只验收前向目标，不冒充完整后训练。'],
 6:['视觉塔把图像变成表示，连接层解决接口，codec 承担特定编码解码任务。','patch 数量、表示维度和参数量必须分别记录。','归一化相似度与像素重建误差评价不同性质，低误差不自动代表语义良好。','本周用给定表示完成检索器，隔离编码、匹配、评测三个模块。'],
 7:['扩散加噪构造训练输入，目标参数化还需独立确认。','Flow Matching 的路径与速度、DiT 主干、AR 分解属于不同描述维度。','CFG 改变预测组合；采样步数与训练更新次数不同。','综合任务实现数值积分器，已知速度场用于验证积分行为，不表示训练了图像生成模型。'],
 8:['世界模型预测条件动态，策略选择动作；时间与 episode 对齐是基本契约。','表示目标、目标分支求导规则与防塌缩设计应分别检查。','teacher forcing 和 free-running 使用不同历史，必须分别报告误差。','综合题从训练转移学到动作增益，再在独立动作序列上连续预测。'],
 9:['固定状态压缩历史，Delta 写入按读取误差修正；玩具规则不是完整 KDA。','reset 改变前向数值，detach 切求导历史，optimizer.step 修改参数。','源码支持、有效配置、运行观察是不同等级的证据。','综合题按 episode 保持或清空记忆，改变梯度窗口不能偷偷改变前向状态。'],
 10:['行为克隆学习专家动作，闭环评测检查自身行为导致的新状态。','动作维度、单位、坐标系、预测窗口与执行窗口都需写清。','世界模型推演后果，规划成本表达目标，控制器执行动作。','综合题拟合线性策略再限幅执行，展示离线学习与逐步反馈的连接。'],
 11:['假设需要可否定的预测，输入噪声位置和目标是否改变必须明确。','公平预算要说明按什么计量；多 seed 不能修复数据泄漏。','按 horizon 展开误差时同时报告样本数量，缺失不能补零。','综合题按 seed 配对对照，报告均值、胜率与全部运行，不挑最好一次。'],
 12:['可复现交付需要代码、数据、配置、命令与评测协议，存档字段只是第一道检查。','算法答辩用代码与运行证据解释选择，未知项需要明确验证计划。','验证集用于选型，测试集用于独立评价；反复用测试挑配置会改变其角色。','最终项目训练双参数世界模型并与基线比较；下一步把同一证据链用于 OmniFM 与古琴任务。']
};

function makeCheck(id,tuple){
 const [question,options,answer,explanation]=tuple;
 const shift=[...id].reduce((s,c)=>s+c.charCodeAt(0),0)%options.length;
 const order=options.map((_,i)=>(i+shift)%options.length);
 return {id,question,options:order.map(i=>options[i]),answer:order.indexOf(answer),explanation};
}
export const days=weeks.flatMap(week=>week.schedule.map(slot=>{
 const id=`w${week.id}-d${slot.day}`,isLesson=[1,3,5].includes(slot.day),isReview=slot.day===7;
 const lesson=lessons.find(l=>l.id===`w${week.id}-l${Math.ceil(slot.day/2)}`);
 const exercise=isLesson?lessonExamples.find(e=>e.sourceLessonId===lesson.id):dailyChallenges.find(e=>e.week===week.id&&e.day===slot.day);
 const guide=isLesson?readingGuides[lesson.id]:null;
 const checks=[makeCheck(`${id}-decision`,isLesson?guide.quiz:exercise.quiz)];
 if(isReview)for(const q of questions.filter(q=>q.week===week.id))checks.push({...q,id:`${id}-${q.id}`});
 return {id,week:week.id,day:slot.day,minutes:slot.minutes,isLesson,isReview,
  title:isLesson?lesson.title:exercise.title,lessonId:isLesson?lesson.id:null,exerciseId:exercise.id,
  ...(isLesson?{goals:lesson.objectives}:{goals:[exercise.goal,'按函数契约通过样例、边界和行为检查','根据失败信息定位实现差异，并记录一个观察']}),
  guide,checks,trace:isLesson?lesson.worked.steps:exercise.worked,
  reflection:isReview?'哪些检查最先失败？你修改了什么？这些测试还不能证明什么？':'记录你预测错的一步、修改的代码或今天还不能解释的结果。',
  blocks:[{label:'学习与推演',minutes:Math.round(slot.minutes*.35)},{label:'互动检查',minutes:Math.round(slot.minutes*.15)},{label:isLesson?'运行与改动':'编程与调试',minutes:Math.round(slot.minutes*.4)},{label:'复盘',minutes:slot.minutes-Math.round(slot.minutes*.35)-Math.round(slot.minutes*.15)-Math.round(slot.minutes*.4)}]
 };
}));
export const dailyQuestions=days.flatMap(d=>d.checks);
