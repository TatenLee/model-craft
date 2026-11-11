// Stable IDs are public routes and backup keys. Renaming a title must not rename its ID.
const s=(id,title,kind,source,extra={})=>({id,title,kind,source,...extra});
const l=(id,title,source,extra={})=>s(id,title,'lesson',source,extra);
const u=(id,title,extra={})=>s(id,title,'unit',id,extra);
const c=(id,title,problem,outcome,sections)=>({id,title,problem,outcome,sections});
export const bookVolumes=[
 {id:'entry',title:'第一卷 · 按需补齐入门工具',question:'不会 Python，或者看到张量和导数就卡住，怎样继续？',before:'不要求机器学习经验。会写代码的人可以用例子检查后跳到第二卷。',outcome:'能运行、修改并解释一个小程序，理解数字、形状、误差和更新。',chapters:[
  c('python','用 Python 写下一个预测','有一个想法，但还不能变成可执行程序。','运行函数、列表与循环，区分返回值和打印。',[s('predict','从变量、列表到一个预测函数','foundation','predict')]),
  c('numbers','用数字表达学习','程序能计算，却还不知道如何表达误差与调整。','手算一次参数更新，在新数据上检查效果。',[s('train','误差、平均数与一次更新','foundation','train'),s('evaluate','用独立数据检验猜想','foundation','evaluate'),u('tensor','向量、矩阵、张量：先看形状，再做运算')])
 ]},
 {id:'common',title:'第二卷 · 所有模型共用的训练闭环',question:'从 wx+b 出发，模型究竟怎样学会？',before:'能读懂简单 Python；需要时返回第一卷，不强制重学全部数学。',outcome:'交付有基线、有数据划分、有失败分析的小模型实验。',chapters:[
  c('predict','先定义任务，再选择模型','不知道输入、目标与成功标准，换模型也无从比较。','把任务写成输入、输出、参数与指标。',[l('model','模型：一个带可调参数的程序','w1-l1'),l('fit','训练：让参数根据误差改变','w1-l2'),l('validate','评测：在没见过的数据上证明有效','w1-l3')]),
  c('networks','直线不够以后怎么办','弯曲关系拟合不了，但增加层数不是唯一答案。','用非线性网络与自动求导完成同一训练闭环。',[u('mlp','从直线到 MLP：增加表达能力'),u('autograd','PyTorch：从手写梯度到自动求导'),u('lifecycle-map','一张全景图：任务、结构、阶段、算法与工程')])
 ]},
 {id:'models',title:'第三卷 · 语言、视觉、图像与视频模型',question:'训练闭环相同，换成文字、图像或视频时，要换哪些积木？',before:'理解输入、参数、loss、更新与独立验证。',outcome:'沿数据到输出画出各模态计算链，解释结构与学习目标的区别。',chapters:[
  c('language','语言：从编号到逐 token 生成','数字预测器还不能表示或读取一段文字。','实现 token、Attention 与因果生成的机制。',[l('tokens','Token 与 embedding：文字变成向量','w2-l1'),l('attention','Attention：读取哪些上下文','w2-l2'),l('decoder','AR 与 Decoder-only：逐步生成','w2-l3')]),
  c('vision','视觉理解：看见不等于理解','文字骨干不能直接接收原始图像。','解释视觉塔、对齐、表征与压缩的不同职责。',[l('tower','视觉塔：图像变成表示','w6-l1'),l('dino','CLIP 与 DINO：不同监督得到什么','w6-l2'),l('codec','VAE、latent 与离散 token','w6-l3')]),
  c('image','图像生成：从识别走向生成','知道图中有什么，还不能按条件生成图像。','比较去噪、速度场、Transformer 骨干和视觉 AR。',[l('diffusion','Diffusion：学习一步步去噪','w7-l1'),l('flow','Flow Matching、DiT 与视觉 AR','w7-l2'),l('image-eval','生成质量：清晰、匹配与偏好','w7-l3')]),
  c('video','视频：时间不是多放几张图片','每帧都清楚，连起来却闪烁、身份漂移。','定义时序输入、训练采样和连续性评测。',[u('video','从图像到视频：时序结构与训练样本')]),
  c('multimodal','多模态：把接口真正接起来','图像和文字分别有效，接在一起却不互相理解。','追踪视觉塔、投影层、语言骨干及各自的训练状态。',[u('multimodal','图文对齐、融合与多模态指令')])
 ]},
 {id:'training',title:'第四卷 · 模型训练全生命周期',question:'得到一个基座以后，怎样继续补能力、学任务、学偏好与反馈？',before:'第二卷训练闭环；语言例子接第三卷第一章。不会强化学习时，先读本卷 5.3，再进入 4.6。',outcome:'对同一个模型保存阶段快照，比较基础能力、领域能力、任务行为与成本。',chapters:[
  c('overview','先看完整训练流程','只记缩写，无法判断一段训练到底改变了什么。','画出阶段图，并标出数据、目标、参数和评测。',[
   u('why-stages','为什么模型需要分阶段训练'),u('three-stages','预训练、中训练、后训练分别解决什么问题'),u('axes','阶段名称、学习方式和参数更新方式的区别'),u('stage-boundaries','不同项目为什么会采用不同的阶段划分')]),
  c('pretrain','预训练——建立模型的基础能力','没有可用能力时，首先要从大量样本中学到规律。','训练可复现的微型语言模型，并解释每个 batch 的监督来源。',[
   l('objectives','从数据中构造学习目标','w3-l1'),u('data-quality','数据清洗、去重、质量与配比'),l('budget','从零训练与训练预算','w3-l2'),l('stability','训练稳定性、保存与阶段评测','w3-l3'),u('modality-pretrain','语言、图像、视频的预训练有何不同')]),
  c('midtrain','中训练——在基座上补充和强化能力','基座有一般能力，却不擅长当前领域或长输入。','设计持续训练的数据混合，并在保留能力与新增能力间取舍。',[
   u('capability-gap','为什么预训练结束后还需要继续训练'),u('cpt','持续预训练与领域适配'),u('context-extension','长上下文与专项能力强化'),u('forgetting','数据配比变化与能力遗忘'),u('stage-gate','怎样判断能否进入下一阶段'),u('midtrain-definitions','比较不同项目对“中训练”的定义')]),
  c('posttrain','后训练——让模型更符合任务和使用要求','能续写、能生成，不代表能可靠执行用户任务。','根据示范、偏好或可验证反馈选择训练路线，而非堆算法名字。',[
   u('use-gap','基础能力与实际使用要求之间的差距'),u('post-routes','后训练的几条路线及其适用问题'),l('sft','SFT：通过示范学习任务与输出规范','w5-l1'),l('preference','偏好优化：学习什么结果更好','w5-l3'),u('reward','奖励模型：怎样获得评价信号'),u('rl-post','强化学习后训练：根据反馈优化行为',{requires:['training/methods/rl-basics']}),u('ppo-grpo','PPO、GRPO、RLHF、RLVR 的关系',{requires:['training/methods/rl-basics']}),u('distillation','蒸馏与能力整合：OPD、MOPD 等'),u('modality-post','图像、视频和具身模型的后训练'),u('post-eval','后训练后的评测、能力退化与失败分析')]),
  c('methods','贯穿不同阶段的方法','阶段与技术混在一起，误以为用了 SFT 就不能用 LoRA。','分清训练目标、可更新参数与反馈来源，检查组合条件。',[
   u('freezing','全量更新、冻结与参数高效训练'),l('lora','LoRA、QLoRA 与适配器','w5-l2'),u('rl-basics','强化学习基础：策略、奖励、回报与探索'),u('combinations','不同方法能否组合、组合时检查什么')]),
  c('growth','贯穿实验——追踪一个模型的成长','单次最终分数无法解释能力从哪里来、在哪一步退化。','保留每阶段 checkpoint 与评测表，用证据选择下一次迭代。',[
   u('growth-base','建立基础模型'),u('growth-mid','发现能力缺口并进行针对性训练'),u('growth-post','根据任务选择后训练路线'),u('growth-compare','比较每阶段的收益、成本与能力变化')])
 ]},
 {id:'systems',title:'第五卷 · 世界模型、机器人与 Agent 系统',question:'模型会预测或回答以后，怎样在环境中行动并完成任务？',before:'训练闭环、序列模型；视觉任务接第三卷视觉章节，反馈训练接第四卷。',outcome:'形成预测、规划、执行、验证的闭环；能说明每个模块的边界。',chapters:[
  c('world','世界模型：预测行动的后果','文本流畅并不能证明预测物理变化正确。','建立状态转移基线、表示预测与多步评测。',[l('transition','给定状态与动作，预测下一步','w8-l1'),l('jepa','JEPA：预测表示而非每个像素','w8-l2'),l('rollout','一步正确，多步为什么漂移','w8-l3')]),
  c('memory','历史与记忆：状态放在哪里','相同位置可能有不同速度；长历史的计算成本又很高。','比较全注意力、SSM、DeltaNet/KDA 与分段状态语义。',[l('kda','从全注意力到 KDA：历史如何保存','w9-l1'),l('state','detach、reset 与分段训练','w9-l2'),l('source','沿真实源码追踪样本与参数更新','w9-l3')]),
  c('simulation','场景与仿真：让机器人有地方学习','有了预测模型，却没有可检查的环境、数据和任务反馈。','构建场景契约、可达性基线与训练数据流程，区分仿真和学习模型。',[u('scene-assets','从家居户型到仿真就绪：WorldSimReady-Home 与 SimReady'),u('navigation-lab','从可通行空间到机器人导航'),u('simulation-data','场景怎样产生训练数据：随机化、评测与真实迁移')]),
  c('robot','机器人：从预测到可执行动作','能预测未来，仍要决定动作、遵守接口并验证结果。','比较模仿策略、VLA、Diffusion Policy 与规划。',[l('policy','策略与行为克隆','w10-l1'),l('vla','VLA 与 Diffusion Policy','w10-l2'),l('planning','规划、反馈与闭环控制','w10-l3')]),
  c('agents','Agent：在工具与环境中完成任务','一次正确回答无法保证多步任务完成。','定义工具协议、状态推进、预算与环境验收。',[u('agent-loop','从模型输出到任务闭环：工具、RAG 与反馈')])
 ]},
 {id:'engineering',title:'第六卷 · 工程、评测与独立项目',question:'怎样让一次成功，变成可复现、可比较、可维护的结果？',before:'至少完成一个小模型训练闭环；高级性能实验按实际硬件选择。',outcome:'交付代码、配置、数据说明、评测与失败分析，并能解释设计取舍。',chapters:[
  c('reliable','可靠训练与评测','loss 变化了，却不知道是数据、方法还是实现出了问题。','用检查顺序、资源预算与分层指标定位失败。',[l('debug','训练失败的诊断顺序','w4-l1'),l('resources','批量、精度、显存与多卡','w4-l2'),l('benchmarks','MMLU、MMMU、MMStar 与自建评测','w4-l3')]),
  c('architecture','结构选型与推理优化','可选结构太多，不能只按模型名字挑选。','按信息流、状态、容量和执行成本比较结构，实测推理瓶颈。',[u('architecture-choice','结构地图：SWA、DSA、SSM、KDA、MoE 与缓存')]),
  c('research','实验与论文复现','多改几个配置后变好了，无法知道究竟为什么。','写假设、控制变量、记录不支持假设的证据。',[l('question','提出一个可回答的研究问题','w11-l1'),l('ablation','控制变量与消融','w11-l2'),l('evidence','从日志到结论','w11-l3')]),
  c('portfolio','独立交付与迁移','自己跑通还不等于别人能够复现或信任。','提交复现说明、证据与答辩，把能力迁移到新任务。',[l('reproduce','让另一个人复现你的结果','w12-l1'),l('defend','用实验回答算法追问','w12-l2'),l('transfer','作品与迁移：公开工程、OmniFM 或古琴','w12-l3')])
 ]}
];
export const bookSections=bookVolumes.flatMap((v,vi)=>v.chapters.flatMap((c,ci)=>c.sections.map((s,si)=>({...s,key:`${v.id}/${c.id}/${s.id}`,volumeId:v.id,chapterId:c.id,volumeTitle:v.title,chapterTitle:c.title,number:`${vi+1}.${ci+1}.${si+1}`,position:si,chapterPosition:ci}))));
export const bookSectionByKey=new Map(bookSections.map(s=>[s.key,s]));
export const bookHref=key=>`#/book${key?'/'+key:''}`;
export const lessonBookSection=id=>bookSections.find(s=>s.kind==='lesson'&&s.source===id);
export const sourceBookSection=(kind,id)=>bookSections.find(s=>s.kind===kind&&s.source===id);
export const bookProjectMap={pretrain:'training/pretrain/objectives','sft-lora':'training/posttrain/sft',preference:'training/posttrain/preference',vision:'models/vision/dino',flow:'models/image/flow','world-model':'systems/world/transition',memory:'systems/memory/kda',planning:'systems/robot/planning',systems:'engineering/architecture/architecture-choice',omnifm:'systems/memory/source'};
export const bookMechanismMap={
 'world-contract':'systems/world/transition','world-baseline':'common/predict/validate','world-learn':'common/networks/mlp','world-history':'systems/memory/kda','world-rollout':'systems/world/rollout','world-vision':'models/vision/tower','world-latent':'systems/world/jepa','world-memory':'systems/memory/state',
 'sft-mask':'training/posttrain/sft','lora-layer':'training/methods/lora','task-eval':'training/posttrain/post-eval','inference-cache':'engineering/architecture/architecture-choice','loss-reduction':'training/pretrain/budget','resume-state':'training/pretrain/stability','experiment-review':'engineering/research/evidence','omnifm-audit':'systems/memory/source'
};
export const bookJourneyMap=['common/predict/model','common/predict/fit','common/predict/validate','common/networks/mlp','systems/world/transition','systems/memory/kda','models/language/attention','models/language/decoder','models/vision/tower','systems/world/jepa','systems/robot/planning','training/posttrain/sft','training/methods/lora','training/posttrain/preference','training/posttrain/distillation','systems/robot/policy','systems/agents/agent-loop','systems/memory/state','engineering/architecture/architecture-choice','systems/memory/source'];
