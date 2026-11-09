// These are complementary skills and taxonomy axes, not mutually exclusive model types.
export const skillNodes=[
 {id:'data',side:'left',row:1,title:'定义任务与准备数据',question:'模型要解决什么问题？什么数据能教会它？',
  intro:'先把业务要求写成输入、目标和成功标准，再检查数据来源、划分、标注与时间对齐。你已有的数据工程经验正好是入口；新的重点是判断数据怎样改变模型学到的行为。',
  example:'输入“向左走两格”，目标是规范 JSON。按语义组合划分后，再生成不同措辞，避免同一答案的改写同时进入训练与测试。',
  learn:['把任务写成输入 → 目标 → 评价的契约','定位重复、污染、错误标签和轨迹错位','解释 tokenizer、采样配比和 mask 如何影响监督'],
  concepts:['tokenizer','data-mixture','data-leakage','loss-mask'],projects:['pretrain','sft-lora','world-model'],
  outcome:'一份可审计的数据契约、独立评测划分和样本检查器。',connects:['training','evaluation'],connection:'数据定义了训练信号；划分与标注决定评测结论是否可信。'},
 {id:'model',side:'left',row:2,title:'理解模型结构与表示',question:'信息怎样进入模型、流动并保留下来？',
  intro:'模型结构决定输入怎样变成预测。先追踪张量形状与信息可见性，再理解注意力、视觉特征和循环状态；结构名称本身不能告诉你模型训练了什么任务。',
  example:'图像先经 DINO 视觉塔变成 patch 特征，再经 connector 送进序列骨干。Decoder-only 描述因果结构；KDA 是一种序列计算模块，它们与训练阶段是不同问题。',
  learn:['追踪 token / patch / hidden state 的形状','验证因果 mask、历史状态与跨模态接口','根据任务解释容量、空间细节与记忆成本的取舍'],
  concepts:['transformer','decoder-only','attention','vision-tower','dino','connector','kda'],projects:['pretrain','vision','memory'],
  outcome:'能画出带 shape 的前向数据流，并写出信息不泄漏的检查。',connects:['training','engineering'],connection:'结构提供可学习的计算路径；训练目标决定学习方向，推理工程决定运行成本。'},
 {id:'training',side:'left',row:3,title:'训练与适配模型',question:'模型预测什么？哪里算错？哪些权重会更新？',
  intro:'训练由数据、前向预测、损失、梯度和参数更新组成。预训练/后训练描述阶段，SFT/DPO 描述具体训练任务或目标，LoRA 描述参数更新方式，不能当成一组选项互相替代。',
  example:'一个预训练的 Decoder-only 基座，可以用标注问答做 SFT，同时通过 LoRA 只学习低秩增量。推理时使用得到的权重，一般不执行这套反向更新。',
  learn:['解释 forward → loss → backward → optimizer.step','区分训练阶段、监督来源、学习目标和更新范围','用冻结、学习率、batch 与 rank 做受控实验'],
  concepts:['pretraining','posttraining','sft','lora','dpo','loss','optimizer','flow-matching'],projects:['pretrain','sft-lora','preference','flow'],
  outcome:'一个能训练、检查梯度并保存实验条件的实现。',connects:['data','evaluation'],connection:'训练从数据获得信号；评测告诉你损失下降是否变成任务能力。'},
 {id:'evaluation',side:'right',row:1,title:'评测、诊断与迭代',question:'真的学会了吗？下一次改哪里才有依据？',
  intro:'评测把模型输出转成可比较的证据。先选匹配任务的指标和独立划分，再看失败样例与消融；一个低 loss 或高榜单分数不能代表所有能力。',
  example:'JSON 合法不代表动作方向正确。世界模型单步 MSE 低，也不一定连续预测稳定。MMLU、MMMU、MMStar 分别评测特定问题集合，不能替代你的机器人任务评测。',
  learn:['建立简单基线、独立验证和最后测试','区分训练误差、任务成功率、rollout 与 OOD','从失败提出假设，一次只改一个变量并保留反例'],
  concepts:['metric-benchmark','mmlu','mmmu','mmstar','generalization','ablation','rollout'],projects:['sft-lora','world-model','systems'],
  outcome:'一张可复核的对照表，附数据版本、失败样例与结论边界。',connects:['data','training'],connection:'失败证据可能指向数据、结构或优化；先定位原因，再决定下一次训练。'},
 {id:'engineering',side:'right',row:2,title:'训练与推理工程',question:'怎样正确恢复、稳定运行，并控制时间和内存？',
  intro:'先确保结果正确，再定位性能瓶颈。训练关注梯度、有效 batch、优化器和恢复；推理关注缓存、延迟、吞吐与输出质量，二者优化对象不同。',
  example:'KV cache 复用历史计算，量化改变数值表示，FSDP 分片训练状态，TBPTT 限制梯度窗口。它们解决不同资源问题，需要各自的正确性与质量检查。',
  learn:['按有效监督数归一化，验证恢复连续性','区分参数内存、激活、优化器、KV 与循环状态','定义真实负载与计时范围，再比较质量、吞吐和延迟'],
  concepts:['training-inference','checkpoint','mixed-precision','gradient-accumulation','fsdp','tbptt','recurrent-state'],projects:['memory','systems'],
  outcome:'一份可重跑的正确性、恢复与性能报告。',connects:['model','embodied'],connection:'计算结构决定资源形态；具身任务还要求观测、推理和动作执行的时序配合。'},
 {id:'embodied',side:'right',row:3,title:'世界模型与具身系统',question:'如何把感知、预测和行动连接起来完成任务？',
  intro:'世界模型预测动作会带来什么变化；策略选择动作；规划利用预测来比较候选行动。把这些能力接进闭环，才能评估是否真的完成任务。',
  example:'先用小世界学习状态与动作的关系，再加入视觉与历史，最后跟读 OmniFM 的一条真实训练链。“具身大脑”是系统角色描述，需要拆到具体接口和证据。',
  learn:['区分状态、观测、动作、目标和时间戳','比较 teacher forcing、闭环 rollout 与控制成功率','沿真实 run 追踪配置、batch、loss、state、更新与推理'],
  concepts:['world-model','jepa','policy','planning','vla','closed-loop','embodied-brain'],projects:['world-model','planning','omnifm'],
  outcome:'一个能解释预测和控制失败的世界模型作品，以及真实 run 的证据链。',connects:['model','evaluation'],connection:'具身系统把前面各项能力汇合起来；真实配置与闭环结果决定具体结论。'},
];

export const conceptAxes=[
 {id:'stage',title:'训练阶段：现在处在生命周期的哪一步？',note:'同一模型可以先预训练，再做多种后训练。PT 需要结合团队语境确认含义。',terms:['pretraining','continual-pretraining','posttraining','pt'],skills:['training'],projects:['pretrain','sft-lora']},
 {id:'architecture',title:'结构与计算：信息怎样流动？',note:'Transformer 是结构家族；Decoder-only 描述因果序列结构；KDA 是序列计算模块。完整系统可能组合多种组件。',terms:['transformer','decoder-only','encoder-decoder','attention','kda','moe'],skills:['model'],projects:['pretrain','memory']},
 {id:'objective',title:'学习目标与生成方式：预测什么、怎么生成？',note:'AR 是逐步条件预测/生成的分解方式。JEPA 关注表示空间预测；Diffusion / Flow 有各自目标与采样过程，它们不是“参数更新范围”。',terms:['ar','cross-entropy','jepa','diffusion','flow-matching'],skills:['training','embodied'],projects:['pretrain','world-model','flow']},
 {id:'adaptation',title:'训练配方与更新方式：用什么反馈、更新哪里？',note:'SFT 用标注示范，DPO 用成对偏好；LoRA 限制可训练增量。因此 SFT + LoRA、DPO + LoRA 都可以出现。',terms:['sft','dpo','rlhf','reward-model','lora','qlora'],skills:['training'],projects:['sft-lora','preference']},
 {id:'component',title:'系统组件与表示：图像怎样变成模型输入？',note:'视觉塔是系统角色；DINO 是视觉表示方法/模型家族，可承担该角色；connector 负责接口。codec 的含义要看实现。',terms:['vision-tower','dino','clip','connector','vae','lsd'],skills:['model'],projects:['vision']},
 {id:'application',title:'任务与系统角色：最终要做什么？',note:'世界模型预测环境，策略输出动作，规划比较行动后果。VLA 描述视觉/语言/动作接口，“具身大脑”需拆解为具体职责。',terms:['world-model','policy','planning','vla','embodied-model','embodied-brain'],skills:['embodied'],projects:['world-model','planning','omnifm']},
 {id:'metric',title:'评测基准与指标：用什么证据判断？',note:'MMLU / MMMU / MMStar 是不同任务集合；PPL、FID、闭环成功率衡量不同性质，不能互相替代。',terms:['metric-benchmark','mmlu','mmmu','mmstar','perplexity','fid','closed-loop'],skills:['evaluation'],projects:['sft-lora','world-model']},
];

export const projectOrientation={
 pretrain:{skills:['data','model','training','evaluation'],why:'先建立完整训练闭环，之后才能理解“在基座上微调”究竟改变了什么。',result:'从一条句子追到下一 token loss，再从更新后的权重生成文本。',previous:[],next:['world-model','sft-lora']},
 'sft-lora':{skills:['data','training','evaluation'],why:'在已有模型上训练具体任务，理解监督目标与可训练参数的区别。',result:'同一基座的 baseline / full SFT / LoRA 对照，附结构化错误分析。',previous:['pretrain'],next:['vision','preference']},
 preference:{skills:['training','evaluation'],why:'标准答案之外，学习如何把“哪个回答更好”变成训练信号。',result:'DPO 核心实现、梯度检查、噪声偏好与 KL 对照。',previous:['sft-lora'],next:[]},
 vision:{skills:['data','model','evaluation'],why:'世界模型最终需要感知真实图像；先验证特征是否保留任务所需信息。',result:'像素 → 特征 → 位置读出，附空间池化与颜色偏移实验。',previous:['pretrain','world-model'],next:['memory','omnifm']},
 flow:{skills:['model','training','evaluation'],why:'补齐 AR 之外的一类生成方法，理解速度目标和采样过程。',result:'从噪声生成二维分布，并分析模式覆盖与积分步数。',previous:['pretrain'],next:['planning']},
 'world-model':{skills:['data','model','training','evaluation','embodied'],why:'把通用训练闭环应用于“动作之后会发生什么”，建立你的目标方向主线。',result:'同观测下比较 MLP / Transformer / GRU，检查多步 rollout 与 OOD。',previous:['pretrain'],next:['vision','memory','planning']},
 memory:{skills:['model','engineering','embodied'],why:'长轨迹需要明确记忆边界，才能读懂真实 KDA 的训练和推理。',result:'整段/分块、reset/detach、状态资源与实际 KDA 对齐的证据。',previous:['world-model'],next:['systems','omnifm']},
 planning:{skills:['model','evaluation','embodied'],why:'检验预测模型是否真正有助于选动作，并连接策略与闭环任务。',result:'随机、不动、oracle 与 learned MPC 的控制对照。',previous:['world-model'],next:['omnifm']},
 systems:{skills:['training','evaluation','engineering'],why:'把能运行的实验变成可恢复、可测量、可比较的工程系统。',result:'正确性、恢复、缓存、量化误差与真实负载性能报告。',previous:['pretrain','world-model','memory'],next:['omnifm']},
 omnifm:{skills:['data','model','training','evaluation','engineering','embodied'],why:'把各项能力汇合到一个真实 run，承担一次有证据的迭代。',result:'有效配置 → 数据 → 视觉/骨干 → loss → 参数更新 → 推理，附受控改进。',previous:['world-model','vision','memory','systems'],next:[]},
};

export const recommendedPath=['pretrain','world-model','sft-lora','vision','memory','systems','omnifm'];
export const extensionPath=['preference','flow','planning'];
export const trainingLoop=[
 {title:'任务与数据',body:'定义输入、目标、划分；先检查样本。',skill:'data'},
 {title:'前向预测',body:'模型用当前权重把输入变成预测。',skill:'model'},
 {title:'计算损失',body:'按目标与 mask 衡量哪些预测有误。',skill:'training'},
 {title:'梯度与更新',body:'backward 算梯度，optimizer 更新权重。',skill:'training'},
 {title:'独立评测',body:'冻结更新，用验证数据分析能力与失败。',skill:'evaluation'},
 {title:'推理与迭代',body:'用权重完成任务，再根据证据调整数据/方法。',skill:'engineering'},
];
