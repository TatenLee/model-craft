// The table of contents groups related subjects. This separate traversal teaches dependencies
// first, without renumbering sections or changing the keys used in backups and old links.
const core='主线必学', branch='方向选修', primer='按需补课';
function chapter(path,rows){
 return rows.map(([id,track,requires,distinction,check])=>({key:`${path}/${id}`,track,
  requires:requires.map(key=>key.includes('/')?key:`${path}/${key}`),distinction,check}));
}
export const readingOrder=[
 ...chapter('entry/python',[
  ['predict',primer,[],'输入是每次调用传进来的值，参数是不同样本共用的数；print 让人看见结果，return 让后续程序拿到结果。','让同一个函数处理两个不同输入，把返回值再加一，不靠屏幕上的文字猜结果。'],
 ]),
 ...chapter('entry/numbers',[
  ['train',primer,['entry/python/predict'],'预测差多少是误差；用平方等规则把误差变为损失；梯度告诉你损失随参数怎样变化，不是新参数本身。','给出一个预测偏小的正输入，先判断 w 应增还是减，再手算更新后的损失。'],
  ['evaluate',primer,['train'],'训练要改参数；评测只读取它们。拿调参时看过的样本做最终测试，不能检验真正没见过的数据。','保留两条不参与更新的数据，记录评测前后相同的 w、b 和两条预测误差。'],
  ['tensor',primer,['entry/python/predict','train'],'形状写长度，不写轴的含义。[B] 与 [B,1] 各有 B 个数，但相减可能得到 B×B 个误差。','写出两套房、每套三个特征的矩阵，圈出同一套房的三个数；给每套房配一个且仅一个目标。'],
 ]),
 ...chapter('common/predict',[
  ['model',core,[],'目标是训练时已知的答案，不是部署时可以偷偷传给模型的输入。线性函数是一个候选模型，不是任务定义。','给出问题、实际可得的输入、目标和一个不训练的基线，用同一组参数算两条预测。'],
  ['fit',core,['model'],'前向计算预测，损失衡量偏差，反向求梯度，优化器才更新参数。损失非负不表示梯度也非负。','用 w=0、b=0、x=2、y=3 和平方损失解释梯度为何为负、一次小步更新为何让 w 增大。'],
  ['validate',core,['fit'],'训练集用于更新，验证集用于选择，测试集留到方案确定后。独立性取决于是否共享原始轨迹或文档，不取决于文件名。','把同一轨迹的相邻帧放在同一集合，在相同保留集上比较训练模型和基线。'],
 ]),
 ...chapter('common/networks',[
  ['mlp',core,['common/predict/validate'],'优化得不好与函数族表达不了是两种失败。单纯堆线性层仍然只能表示仿射变换。','用 −1、0、1 三点证明一条直线不能表示绝对值，再用两个 ReLU 写出能表示它的函数。'],
  ['autograd',core,['common/predict/fit','mlp'],'backward 写入梯度，step 更新权重；不清梯度会叠加旧值，而不是自动重算一次。','记录一次 backward 前后和 step 后的权重、梯度；指出权重真正变化的时刻。'],
  ['lifecycle-map',core,['autograd','common/predict/validate'],'推理是一条输入到输出的链；训练在此之外还要定义监督位置、损失和更新参数。模型结构不等于训练阶段。','画出正向预测和反向更新两条箭头，在图中分别标注数据、参数、目标和独立评测。'],
 ]),
 ...chapter('models/language',[
  ['tokens',core,['common/networks/lifecycle-map'],'token ID 是词表的行号，不是词义的数值尺度。embedding 查表后才为每个位置提供可计算的特征。','把两段各三个 token 的输入从 [2,3] 追踪到 [2,3,D]，解释加长输入为什么不增加查表参数。'],
  ['attention',core,['tokens'],'Q、K 用来算读取的权重，V 提供被读取的内容。因果 mask 在归一化前排除未来位置，并非删掉输入文本。','在三个位置上列出第二个位置允许看的下标，修改第三个位置的 V，检查第二个输出是否应改变。'],
  ['decoder',core,['attention'],'AR 规定联合概率怎样逐步分解；Decoder-only 描述一种网络骨干。训练可并行预测多个位置，生成时仍须等待上一步。','把四个 token 错开一位写出三组输入/目标，用同一前缀对比训练读到的历史与生成时读到的历史。'],
 ]),
 ...chapter('models/vision',[
  ['tower',branch,['models/language/tokens'],'视觉塔把像素编码为特征，不直接保证识别、计数或问答正确。冻结权重也不等于跳过前向计算。','对一张图写出像素、patch、特征序列的轴；说明哪一步减少了空间分辨率。'],
  ['dino',branch,['tower'],'CLIP 从配对图文学习相似性，DINO 从图像视图与教师信号学习表征。两者都不是负责把特征还原为像素的解码器。','为相同两张图分别列出两种训练各需要什么配对，再设计一个相似度高但左右关系错误的反例。'],
  ['codec',branch,['tower'],'用于识别的特征和用于重建的 latent 未必保留相同细节；连续 latent 不等于经过码本量化的离散编号。','沿原图→编码→解码画出重建基线，解释为何在生成之前就要查细节是否已经丢失。'],
 ]),
 ...chapter('models/multimodal',[
  ['multimodal',branch,['models/vision/tower','models/language/decoder'],'连接层解决维度接口，不保证模型会利用图像；维度匹配、图文对齐和完成任务要分别取证。','保持问题不变只换图，让答案必须随图改变；标出哪个模块可训练、梯度从哪里来。'],
 ]),
 ...chapter('models/image',[
  ['diffusion',branch,['models/vision/codec'],'噪声时间 t 描述一次样本被扰动到什么程度，不是训练迭代号。训练时可抽一个 t，采样时需沿日程逐步生成。','画出干净样本、噪声、带噪输入和监督目标，圈出生成时不可使用的真实干净样本。'],
  ['flow',branch,['diffusion','models/language/decoder'],'Flow Matching 是学习速度场的目标，DiT 是可承载该目标的骨干，积分器把速度变成生成轨迹。','给定起点、终点与时间，算出直线路径上的训练速度；区分训练目标和部署时预测的速度。'],
  ['image-eval',branch,['flow'],'有参考的重建误差、生成样本的分布质量、单条提示的匹配是不同问题，不能让一个指标替它们全部作答。','固定同一批提示、采样配置和模型版本，分别列出观感、条件匹配和多样性失败。'],
 ]),
 ...chapter('models/video',[
  ['video',branch,['models/image/image-eval'],'单帧质量不约束帧与帧之间的顺序和身份；同一视频的不同片段通常也不是独立测试样本。','在 24 fps 视频中每隔 3 帧取一帧，算 8 帧的首尾跨度；打乱这 8 帧，指出哪个时序检验会发现变化。'],
 ]),
 ...chapter('training/overview',[
  ['why-stages',core,['models/language/decoder','common/networks/lifecycle-map'],'基座是继续训练的起点，不是一种特定结构。换训练数据、监督目标或验收条件都可能划出新阶段。','对“会续写手册却不按要求回答”分别列一个知识诊断和一个格式诊断。'],
  ['three-stages',core,['why-stages'],'预训练、中训练、后训练描述配方中要解决的问题，不要求每个模型都走完三个阶段，更不对应三种固定损失。','在三段样本上标出起始权重、数据来源、监督位置，解释同样的交叉熵如何服务不同阶段。'],
  ['axes',core,['three-stages'],'阶段、骨干、学习目标和更新范围是不同列。用 LoRA 做 SFT 描述两项选择，而不是发明第四个训练阶段。','把“用示范回答微调因果语言模型，只更新低秩增量”拆成数据、结构、目标、更新范围四列。'],
  ['stage-boundaries',branch,['axes'],'论文采用的阶段名是作者的约定；名称相同，不代表起点、数据或验收条件相同。','比较两套公开配方，保留作者命名并各写出一个可核实的操作差异。'],
 ]),
 ...chapter('training/pretrain',[
  ['objectives',core,['training/overview/axes','models/language/decoder'],'自监督不是没有目标，而是由样本自身构造标签。训练时能用未来 token 当标签，模型前向却不能提前看到它。','用一段文本手排 input、target 与可见位置，指出哪种切分会泄漏同一文档。'],
  ['data-quality',core,['objectives','common/predict/validate'],'磁盘里的数据占比不一定等于采样占比。评测混合权重变了，即使模型没变，平均损失也会变。','固定两个域的损失，只改配比算两次均值；另留按文档隔离的固定分域验证集。'],
  ['budget',core,['data-quality'],'logits 是未归一化分数；交叉熵只应汇总受监督位置。batch 数相等也可能对应不同有效 token 预算。','对一个含 padding 的 batch 数出有效目标；说明分母应是什么，并记录一次实验的 token 预算。'],
  ['stability',core,['budget'],'用权重初始化一轮新训练与恢复被中断的训练不同。后者还涉及优化器、步数、日程和数据顺序。','在固定验证样本上比较存盘前后结果，列出要复现下一次更新还缺哪些状态。'],
  ['modality-pretrain',branch,['objectives','models/vision/dino','models/video/video'],'预训练描述用途，不规定预测对象：下一 token、噪声、速度和另一个视图的表示都可能提供学习信号。','给文字、图像、视频各写一对输入/目标，说明采样时哪些信息不再可得。'],
 ]),
 ...chapter('training/growth',[
  ['growth-base',core,['training/pretrain/stability'],'计数器通过更新频数改变分布，没有梯度优化器；这里借它验证阶段谱系，不用它证明 Transformer 的能力。','在本地保存 base 快照和固定验证 NLL，把它作为后续分支不能改动的对照。'],
 ]),
 ...chapter('training/midtrain',[
  ['capability-gap',core,['training/pretrain/stability'],'领域答错可能是资料缺失，也可能是格式或上下文失败。先做不改权重的诊断，再决定是否值得继续训练。','对同一问答分别补手册片段、换格式提示；说明哪种观察支持尝试领域训练。'],
  ['cpt',core,['capability-gap','training/pretrain/data-quality'],'持续预训练可以保持 next-token 目标不变，仅改变数据分布；它不自动把原文变为指令示范。','从同一 base 分别建立两个等预算分支，报告领域和通用两栏，不让第二支接着第一支训练。'],
  ['forgetting',core,['cpt'],'新域变好和旧域变差可以同时发生；混合平均变好不能抵消对旧能力的硬性要求。','用通用 1.0→1.5、领域 2.0→1.0 对照等权均值和旧域退化门槛 0.2。'],
  ['stage-gate',core,['forgetting'],'验证集用于选配比、checkpoint 和停止点；测试集只在选择冻结后用来估计最终结果。','在查看结果前写出领域收益、允许退化与预算门槛，给出继续、回退两种决策条件。'],
  ['context-extension',branch,['cpt','models/language/attention'],'服务肯接收 8k token，不等于模型能利用 8k 外围的证据。工程截断、可见性、实际利用能力要分开查。','把同一句证据放到不同长度文本的开头、中间和结尾，记录实际进入模型的长度与正确率。'],
  ['midtrain-definitions',branch,['stage-gate','training/overview/stage-boundaries'],'CPT 是一种操作，中训练是配方中的位置；同一项持续训练在不同报告里可能有不同名称。','把两篇报告按输入快照、目标与数据并排比较，留下至少一个材料未说明的字段。'],
 ]),
 ...chapter('training/growth',[
  ['growth-mid',core,['growth-base','training/midtrain/stage-gate'],'计数权重模拟的是数据混合，并非真实梯度或 token 采样轨迹；分支比较必须从同一父节点开始。','改变领域份额并分目录保留快照，核对父节点、新增预算和固定分域 NLL。'],
 ]),
 ...chapter('training/posttrain',[
  ['use-gap',core,['training/overview/three-stages','training/midtrain/capability-gap'],'可解析、答对和任务实现是三道验收。一个合法 JSON 完全可能描述一个无效动作。','写一个合法但不会达成目标的输出，把解析、语义、任务结果写成三条独立检查。'],
  ['post-routes',core,['use-gap'],'示范给出该怎么做，偏好只告诉两个候选谁更好，奖励评价采样行为；可用的信号限制可用的训练路线。','对同一个输入分别写示范、成对比较与可执行打分，选一种作为最小基线。'],
  ['sft',core,['post-routes','training/pretrain/budget'],'回答掩码决定哪些位置计入损失，不决定模型能读哪些提示。不要为了不监督问题就把问题从输入删除。','手标一条问答的输入、目标、回答 mask 与 padding；算出进入平均损失的 token 数。'],
 ]),
 ...chapter('training/methods',[
  ['freezing',branch,['training/posttrain/sft','common/networks/autograd'],'冻结参数不等于切断整个计算图。冻结层前面的可训练投影仍可能需要穿过它的梯度。','逐层记录 requires_grad、优化器成员、梯度与 step 后差值，解释哪个证据才说明实际更新。'],
  ['lora',branch,['freezing'],'LoRA 改的是权重增量的表示，SFT 改的是监督；QLoRA 通常量化冻结底座并训练适配器，不是把回答标签量化。','手算一个矩阵全量与低秩更新的可训练参数数，说明为何该比例不能直接当作显存节省比例。'],
  ['rl-basics',branch,['training/posttrain/post-routes'],'奖励描述一步反馈，回报累计未来反馈，策略决定怎样选动作。看不全状态时，观测不等于真实环境状态。','给奖励序列 [0,2] 和折扣 0.9，倒序算出两个回报，解释第一步为什么也有信号。'],
 ]),
 ...chapter('training/posttrain',[
  ['preference',branch,['post-routes','training/methods/rl-basics'],'固定偏好对上的 DPO、训练评分器与在线采样 RL 是不同流程；仅重排序候选是推理，不代表策略权重更新。','给同一问题的两个候选标优劣，分别画出离线 DPO 所需数据和在线反馈需要增加的采样环。'],
  ['reward',branch,['preference'],'奖励模型近似评价标准，不是正确性裁判；规则验证也能产生奖励，不一定要另训模型。','造一个长而错误的高分回答，给评分器排序和任务正确性分别安排独立验证。'],
  ['rl-post',branch,['reward','training/methods/rl-basics'],'教师强制读取示范 token 与策略采样自己的 token 不一样；反馈优化还要保存同一已采样动作的旧概率。','把一个回答标出状态、动作、奖励、优势和采样时的概率，画出下一轮重新采样的位置。'],
  ['ppo-grpo',branch,['rl-post','training/methods/rl-basics'],'RLHF、RLVR 说明反馈来源；PPO、GRPO 说明怎样优化。PPO 的裁剪目标不是把每个新概率硬锁在区间内。','分别用正、负优势算一次裁剪替代目标，再解释同题所有奖励相等时组内相对信号会怎样。'],
  ['distillation',branch,['sft','models/language/decoder'],'匹配教师分布不同于按奖励优化；on-policy 说明前缀来自学生采样，不等于监督来源变成环境奖励。','让教师与学生在同一前缀对同一个已采样 token 打分；说明比较各自最爱 token 为什么不成立。'],
  ['modality-post',branch,['sft','models/video/video'],'把语言 SFT 的名字借到图像或动作上，不会让所有任务都变成 token 交叉熵。监督对象随输出空间而变。','给一个图像适配例子列出目标与可更新参数；给动作示范另列环境验收，不能只看离线误差。'],
  ['post-eval',core,['sft','use-gap'],'格式、任务正确性、保留能力与推理成本要分栏。换了采样温度再比较，变化不全来自权重。','固定同一批输入与解码配置，报告基座和适配后的分项差异，并保留一个总分掩盖的失败。'],
 ]),
 ...chapter('training/methods',[
  ['combinations',branch,['lora','training/posttrain/ppo-grpo'],'处在不同层的方案在概念上可组合，但张量、优化器、采样和部署契约仍可能不兼容。','为 SFT+LoRA 写四条能检查的数据和更新断言，故意不加载 adapter，说明哪条会失败。'],
 ]),
 ...chapter('training/growth',[
  ['growth-post',core,['growth-mid','training/posttrain/post-eval'],'计数字符的 task_demo 可以改变格式分布，却没有真实 SFT 的回答 mask，也不能理解完整问答。','对照 task_demo 和一次真正 SFT 的输入、监督位置与更新方式，只报告各自实际验证的现象。'],
  ['growth-compare',core,['growth-post'],'最后快照不是所有变化的原因。先查父节点和预算，再对照分域指标，才能把观察与解释分开。','交付一张父子快照图和固定评测表，并写明一个这次实验无法支持的结论。'],
 ]),
 ...chapter('systems/world',[
  ['transition',core,['common/predict/validate','common/networks/mlp'],'世界模型回答“采取这个动作后会怎样”，不是“应选什么动作”。观测可能不包含决定未来的全部状态。','写出 (当前观测, 动作, 下一观测) 和时间对齐规则，保持当前状态的基线也在同一数据上评分。'],
  ['rollout',core,['transition'],'每步喂真实历史测的是单步预测；将自己的预测接回才是在测自由展开。二者不能混用同一条曲线名称。','用相同真实起点和动作展开 1、4、8 步，标出真值只参与评分、不回流为后续输入。'],
  ['jepa',branch,['transition','models/vision/dino'],'JEPA 预测表示而非像素；如果表示塌缩为常数，低表示误差也不支持学会预测未来。','在表示预测图上标出上下文和目标编码器，给出表示方差及下游任务两种检查。'],
 ]),
 ...chapter('systems/memory',[
  ['kda',branch,['systems/world/rollout','models/language/attention'],'缓存逐位置 K/V 和把历史压入递推状态是两种存储语义；固定大小状态不承诺无损记住任意历史。','构造位置相同、速度相反的两个样本，说明为何无历史模型无法区分、固定状态又可能丢失什么。'],
  ['state',branch,['kda','common/networks/autograd'],'detach 切断梯度路径但保留前向状态；reset 清空状态；累积几个微批的梯度不会自动延长反向传播跨度。','画两个 chunk 的前向和反向箭头，标明 episode 换段时何处 reset、普通截断时何处 detach。'],
  ['source',branch,['state','training/pretrain/stability'],'类被定义、配置被选中和训练时模块实际参与更新是三个层次；读取源码不能替代运行证据。','从一个样本追踪到 batch、forward、loss、optimizer、快照，并给每一步标静态依据或运行证据。'],
 ]),
 ...chapter('systems/simulation',[
  ['scene-assets',branch,['systems/world/transition'],'场景资产描述世界，仿真器推进世界，学习型世界模型拟合转移。能渲染房间不能证明碰撞、任务或训练数据正确。','列出一个房间的单位、碰撞、起终点和机器人尺寸，写出画面看不出的通行失败条件。'],
  ['navigation-lab',branch,['scene-assets'],'已知地图上的 BFS 是搜索基线，不是训练策略。地图可达与控制器实际到达也须分别检验。','给同一小栅格加障碍，分别得到直达、绕行和不可达结果；指出若只给相机观测还缺哪些组件。'],
  ['simulation-data',branch,['navigation-lab','training/methods/rl-basics'],'同一轨迹可提供下一状态、教师动作或环境奖励；数据字段相似，不代表监督或部署输入相同。','把同一回合改写为世界模型、行为克隆和 RL 三种样本，按房屋而不是按帧划分独立评测。'],
 ]),
 ...chapter('systems/robot',[
  ['policy',core,['systems/world/transition','systems/world/rollout'],'策略预测要执行的动作；行为克隆用示范动作监督。离线误差没有计入策略执行后偏离示范分布的后果。','用同一条轨迹给转移模型与策略分别圈出标签，说明怎样另测实际闭环成功率。'],
  ['vla',branch,['policy','models/multimodal/multimodal','models/image/diffusion'],'VLA 描述视觉、语言到动作的接口；Diffusion Policy 描述一种动作生成方式。生成一串动作不等于每步都要执行。','给定 10 步动作块，只执行前 2 步再观测；标清条件、预测空间和重新规划时刻。'],
  ['planning',core,['policy','systems/world/rollout'],'直接策略选动作，基于模型的规划比较候选动作序列。闭环控制靠真实反馈纠偏，而不是一次性相信想象轨迹。','对同一目标比较两个候选动作序列，执行首步后重读观测，分别记录预测代价和实际任务结果。'],
 ]),
 ...chapter('systems/agents',[
  ['agent-loop',core,['systems/robot/planning','training/posttrain/use-gap'],'工具返回可提供外部证据；模型声称成功不是环境验收。RAG 增加推理上下文，不等于训练参数。','对同一目标先送旧 request_id 再送当前已验证返回，说明哪一次可推进任务、何时必须停止。'],
 ]),
 ...chapter('engineering/reliable',[
  ['debug',core,['common/networks/autograd','common/predict/validate'],'小样本过拟合检验实现是否能学习，不检验泛化。训练失败先排数据和监督错位，再谈调大学习率。','选八条样本检查形状、标签、有效 mask 和参数差值；另用隔离验证集判断能否推广。'],
  ['resources',branch,['debug','training/pretrain/budget'],'梯度累积增加更新所覆盖的样本，不增加单条上下文长度。理论显存与目标硬件的峰值测量也要分列。','给出微批量、累积步数与设备数，算有效批量，分别记录执行一次前向与一次参数更新的成本。'],
  ['benchmarks',core,['common/predict/validate'],'benchmark 是任务、数据与评分协议，metric 是量化规则；一个公开榜单不能代理自己的闭环任务。','为一个实际任务指定隔离样本、计分方式和失败例，再写出拿到高分仍不能证明的能力。'],
 ]),
 ...chapter('engineering/architecture',[
  ['architecture-choice',branch,['engineering/reliable/resources','systems/memory/kda'],'读历史、增加条件容量、存储 KV 和优化算子解决不同瓶颈。渐近复杂度不是这台机器上的吞吐。','先给出瓶颈证据，在同一设计轴上选两种方案，对照质量、可读信息、实测延迟和硬件条件。'],
 ]),
 ...chapter('engineering/research',[
  ['question',core,['engineering/reliable/debug','engineering/reliable/benchmarks'],'可证伪的假设要求事先说明哪种结果不支持它；事后挑最亮眼的指标不是检验。','为已有模型写一句可被推翻的预测，预先确定比较对象、主指标、预算和否定条件。'],
  ['ablation',core,['question'],'移除一个模块时可能连带改变训练量或参数量；同样的 step 数并不总是公平预算。','列出两组实验唯一想改变的因素，核对有效样本、初始化和评分协议，保留不利的随机种子结果。'],
  ['evidence',core,['ablation'],'观测事实是日志直接支持的数字，机制解释是可被替代的推断；名字都叫 loss 也未必有同一分母。','把一项结果分成事实、可能解释、替代解释和下一次区分它们的实验。'],
 ]),
 ...chapter('engineering/portfolio',[
  ['reproduce',core,['engineering/research/evidence','training/pretrain/stability'],'可重跑某条命令不等于能恢复同一次训练。固定 seed 也不保证所有平台逐位相同。','留下数据与环境版本、配置、命令、产物和允许误差；让他人从干净目录按说明重建一个结果。'],
  ['defend',core,['reproduce'],'已测量的收益和猜测的原因不能混报；未做全量对照时，不应断言适配一定优于全量。','用一个成功和一个失败样例回答“为什么这样设计”，把没有做过的对照明确写作未测。'],
  ['transfer',core,['defend'],'迁移的是定义任务、建立基线和验证的方法，不是把旧指标或模型名字原封不动搬到新问题。','对一个新任务重写输入、允许的多种正确输出、基线和独立验收，并列出一条旧结论不再适用的原因。'],
 ]),
].map((step,index)=>({...step,index}));
export const progressionByKey=new Map(readingOrder.map(step=>[step.key,step]));
export const mainReading=readingOrder.filter(step=>step.track===core);

// Diagnostic decisions belong to learners, not to the saved completion state.
export const volumeMilestones={
 entry:{bridge:'先不谈模型架构。用一个能返回数字的函数，把输入、共享参数、预测和答案区分开。',gate:'能否不看示例写出预测函数，口算一次损失更新，并让一批预测与同一批目标逐条对应？',pass:'三项都能解释，可跳过本卷。只有轴或导数卡住，直接补相应一节，不必重学语法。'},
 common:{bridge:'函数能算出预测，还没有理由相信它算得准。现在固定数据、目标和基线，让参数根据损失更新，再用没见过的样本检验。',gate:'换成未见过的数据后，能否用同一基线说明改参数还是换结构才有帮助？',pass:'留下有数据划分、一次真实更新和验证结果的模型；如果训练集都拟合不了，先排查梯度和表达能力。'},
 models:{bridge:'保留上一卷的损失、更新和验证流程，先只替换输入与输出：一句话有多个位置，每个位置要有表示，还要知道能读取哪些位置。',gate:'能否把一句话变成编号和向量，画出每个位置可以读取的上下文，再说清输出怎样生成？',pass:'语言三节提供后续训练的共同例子。做图文问答加读视觉塔与多模态；做图像、视频生成沿压缩→生成→时序补课。'},
 training:{bridge:'会沿网络生成下一项，不代表会按人的要求完成任务。保留同一个骨干，分别改变数据分布、监督位置或反馈来源，查明能力在哪一步变化。',gate:'换一个 checkpoint 时，能否说明起点、数据、监督位置、更新范围和独立验收分别变了什么？',pass:'主线用同一计数基线保存阶段证据，再对照真实 SFT 的 mask。参数适配、偏好、在线 RL、蒸馏按手头信号选读，不当作必经流水线。'},
 systems:{bridge:'前面的模型在固定样本上评分；一旦输出变成动作，就会改变下一次收到的输入。要把预测、执行和外部反馈放在同一条时间线上。',gate:'模型报出好预测之后，谁选动作、谁执行、又由谁判定任务真的完成？',pass:'交付一次预测→决策→执行→反馈记录及失败终止。再按瓶颈选记忆、场景导航或视觉动作策略，不要求先装三维仿真器。'},
 engineering:{bridge:'系统完成一次任务，还不能说明为什么成功或能否重现。把同一任务变成固定的实验：带上基线、预算、独立样本和失败记录。',gate:'另一人能否从记录复算你的结果，指出哪个对照支持结论，又有哪些没有测？',pass:'交付复现命令、固定评测、单变量对照和反例。性能选型是方向选修；没有目标硬件时写明未测，不用理论速度代替实测。'},
};
