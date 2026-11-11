import {simulationGuides} from './simulation.js';
import {trainingGuides} from './training.js';
import {engineeringGuides} from './engineering.js';
import {sequenceGuides} from './sequence.js';
import {visionGuides} from './vision.js';
import {systemGuides} from './systems.js';
import {evaluationGuides} from './evaluation.js';
import {basicGuides} from './basics.js';
import {appliedGuides} from './applied.js';
export const conceptGuides=[...trainingGuides,...engineeringGuides,...sequenceGuides,...visionGuides,...systemGuides,...evaluationGuides,...basicGuides,...appliedGuides,...simulationGuides];
export const guideById=new Map(conceptGuides.map(g=>[g.id,g]));
export const extraConcepts=conceptGuides.filter(g=>g.meta).map(g=>({id:g.id,...g.meta,english:g.meta.english||g.meta.term,aliases:g.meta.aliases||[],level:'入门详解',analogy:g.everyday.story,mechanism:g.worked.join(' '),example:g.worked[0],pitfall:g.cost,related:[]}));
export const conceptComparisons=[
 {ids:['sft','lora'],question:'SFT 与 LoRA 为什么能同时出现？',rows:[['解决的问题','SFT：向模型示范怎样完成任务。','LoRA：用较小参数增量完成更新。'],['改变的部分','输入输出示范、模板与监督区域。','可训练参数及增量计算形式。'],['能否组合','用回答 token loss 做 SFT。','让这个 loss 只更新 LoRA 参数。']]},
 {ids:['causal-mask','loss-mask'],question:'看得见和算分，是同一个开关吗？',rows:[['控制什么','因果 mask 控制可读取的位置。','loss mask 控制计入目标的位置。'],['例子','预测回答不能读取未来答案。','prompt 可见，但可不参与回答 loss。'],['错误后果','泄漏未来，部署时缺少信息。','错误监督或错误分母，优化方向改变。']]},
 {ids:['ar','decoder-only'],question:'生成方式与骨干结构怎样区分？',rows:[['层级','AR 是按历史分解下一项概率。','Decoder-only 是一种骨干组织。'],['组合','AR 可由不同序列模型实现。','因果 Decoder-only 常用于 AR。'],['不能推断','不能由 AR 推断必用 Transformer。','不能由结构名称推断训练阶段或完整系统能力。']]},
 {ids:['reward','discounted-return','policy-gradient'],question:'奖励、回报和优势各回答什么？',rows:[['即时反馈','reward：这一步得到多少评价。','例如 [0,2] 中第一步奖励为 0。'],['未来后果','return：从现在起未来奖励的折扣和。','gamma=0.9 时第一步回报为 1.8。'],['相对好坏','advantage：比某个基准好多少。','回报 3、基准 2，优势为 1。']]},
 {ids:['rlhf','rlvr','ppo','grpo'],question:'反馈来源与优化算法怎样组合？',rows:[['信号来源','RLHF 使用人类反馈。','RLVR 使用可验证奖励。'],['优化方式','PPO 使用特定概率比与替代目标等设计。','原始 GRPO 利用同题组内相对奖励。'],['选择依据','先问反馈是否可靠、覆盖什么。','再核对算法、资源与完整实现。']]},
 {ids:['pretraining','midtraining','posttraining','continual-pretraining'],question:'阶段名字为什么不能当唯一分类标准？',rows:[['目的','预训练建立基础；中训练常做能力补强。','后训练围绕任务、行为或偏好适配。'],['操作','CPT 描述继续预训练类目标的操作。','它可能出现在不同命名的阶段。'],['核对证据','起始权重、数据、loss 与更新范围。','作者配方与实际 run，不能只看 PT 文件名。']]},
 {ids:['dino','clip','vision-tower'],question:'DINO、CLIP 和视觉塔是什么关系？',rows:[['角色','视觉塔：图像到特征的系统角色。','可由多种视觉编码器承担。'],['学习信号','CLIP：图文配对的对比信号。','原始 DINO：无人工类别标签的视图自蒸馏。'],['能力边界','特征可用于匹配或下游任务。','不自动等于生成图像、语言问答或动作策略。']]},
 {ids:['dit','diffusion','flow-matching','unet'],question:'结构、目标和采样器为什么分开？',rows:[['骨干','DiT 使用 Transformer。','U-Net 使用多尺度与跳连，具体也可含注意力。'],['训练信号','去噪目标训练条件预测。','Flow Matching 可监督路径速度。'],['完整系统','还需要表示、条件与训练配方。','采样器规定怎样反复调用模型得到样本。']]},
 {ids:['world-model','policy','planning','agentic'],question:'预测、选择、规划与执行谁负责？',rows:[['预测','世界模型：这个动作后可能发生什么。','不必直接决定最终动作。'],['选择','策略直接给行为；规划比较候选后果。','可以组合，也可使用不同实现。'],['闭环','Agent/控制流程执行并接收反馈。','任务成功由环境协议验证，不是模型口头声明。']]},
 {ids:['kv-cache','ssm','kda','recurrent-state'],question:'缓存历史与压缩历史有何取舍？',rows:[['逐位置保存','KV cache 保存历史投影，通常随长度增长。','适合重新读取具体历史内容。'],['状态更新','SSM/KDA 等以各自机制更新有限状态。','压缩历史可降低增长，但可能损失细节。'],['检查标准','有/无 cache 一致性、位置与清理。','整段/分块一致性、reset、任务质量与实测成本。']]},
 {ids:['mopd','mopd-prompts'],question:'同名缩写能按大小写分辨吗？',rows:[['完整名称','MOPD：Multi-Teacher On-Policy Distillation。','MoPD：Mixture-of-Prompts Distillation。'],['对象','整合领域教师到学生模型。','把手工提示知识迁移到软提示。'],['使用原则','核对论文、版本、输入输出。','不能根据缩写相似复用结论或训练器。']]},
 {ids:['mmlu','mmmu','mmstar'],question:'三个基准测的是同一种能力吗？',rows:[['MMLU','文本学科选择题表现。','不能单独证明视觉能力。'],['MMMU','图文与学科知识结合的表现。','仍需检查视觉贡献和题目捷径。'],['MMStar','特别关注视觉必要性等评测问题。','不等于图像生成质量或机器人成功率。']]},
 {ids:['swa','dsa','linear-attention'],question:'少读位置与压缩状态为何不同？',rows:[['SWA','按距离读取固定邻近窗口。','可能无法直接读取很远处证据。'],['DSA','按内容索引选一部分位置再精读。','索引仍有成本，也可能漏选。'],['状态路线','用特定状态累计、压缩历史。','具体表达、缓存和成本需按公式与实现比较。']]}
];

conceptComparisons.push({ids:['scene-layout','simready','simulator','world-model','navigation'],question:'场景、仿真、世界模型与导航怎样分工？',rows:[['准备什么','场景组织户型与物体；仿真就绪检查用途所需属性。','不能从漂亮截图推断可通行或可交互。'],['怎样变化','仿真器推进环境；学习型世界模型拟合变化。','前者可产生数据，后者需要训练并有预测误差。'],['要完成什么','导航定义目标、观测、动作与成功协议。','可用搜索、策略或规划，按实际执行结果评测。']]});
