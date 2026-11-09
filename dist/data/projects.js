import {challenge} from './practice/shared.js';

const source = {
 lora:{label:'LoRA 原论文：低秩权重增量',url:'https://arxiv.org/abs/2106.09685'},
 kda:{label:'Kimi Linear：KDA 与混合骨干',url:'https://arxiv.org/abs/2510.26692'},
 dino:{label:'DINOv3 官方代码与权重说明',url:'https://github.com/facebookresearch/dinov3'},
 jepa:{label:'I-JEPA：在表示空间中预测',url:'https://arxiv.org/abs/2301.08243'},
 torch:{label:'PyTorch：保存与加载训练状态',url:'https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html'},
 qwen:{label:'Qwen2.5-0.5B 基座模型卡',url:'https://huggingface.co/Qwen/Qwen2.5-0.5B'},
 peft:{label:'PEFT：LoRA 配置与实现',url:'https://huggingface.co/docs/peft/en/package_reference/lora'},
 attention:{label:'Transformer 原论文',url:'https://arxiv.org/abs/1706.03762'},
};
// Each step teaches first, then checks the SAME mechanism with real Python.
function stage(projectId,id,title,week,d){
 title='M'+title; // Mechanisms keep stable IDs and progress, separate from P projects.
 const ex=challenge(week,2,title,{goal:d.goal,signature:d.signature,contract:d.contract,
   context:d.story,steps:d.steps,worked:d.walkthrough,mistake:d.failure,transfer:d.transfer,
   cases:d.cases,solution:d.solution,quiz:d.quiz});
 ex.id='project-'+id;ex.level='项目机制编程';ex.minutes=30;
 const answer=d.quiz[1],options=[...d.quiz[2]],shift=week%options.length;
 const rotated=options.slice(shift).concat(options.slice(0,shift));
 return {id,projectId,title,week,minutes:d.minutes||90,...d,exercise:ex,
  check:{id:id+'-check',prompt:d.quiz[0],options:rotated,answer:rotated.indexOf(options[answer]),explanation:d.quiz[3]}};
}
export const projectStages=[
 stage('world','world-contract','01 · 定义一个会运动的小世界',1,{
  goal:'分清环境规律、模型输入、预测目标和可训练参数。',
  story:'机器人现在位于 x=1，速度 v=0.5；你下达动作 a=-1。我们规定摩擦系数是 0.8、动作强度是 0.2。下一刻速度不是 -1，而是 0.8×0.5+0.2×(-1)=0.2；下一刻位置是 1.2。环境负责产生事实，模型负责根据过去预测这些事实。先把事实算对，后面的 loss 才有意义。',
  explanation:['一条训练样本是 (当前位置、当前速度、当前动作) → (下一位置、下一速度)。把下一位置放进输入会泄漏答案；把动作漏掉，则同一状态对应多个可能未来。参数是网络中的权重，不是这次输入的位置。','这里的预训练是从随机参数学习环境序列规律，并没有先训练通用语言能力。世界模型描述“做了动作以后会发生什么”；策略描述“为了目标该做什么动作”。二者可以连接，但不能直接画等号。'],
  decision:'先用已知规律生成数据，才能区分数据错误与学习失败。直接用真实机器人视频会同时引入标定、遮挡、压缩和标注问题，难以定位第一处错误。',
  alternative:'规则系统在这个合成环境中就是上界；学习模型的价值在于练习不知道规则时的拟合、评测与泛化流程。',
  steps:['先计算新速度 0.8*v+0.2*a。','用旧位置加新速度得到新位置。','返回 (新位置, 新速度)，不要交换顺序。'],walkthrough:['x=1,v=0.5,a=-1','v_next=0.2；x_next=1.2','同一位置改成 v=-0.5，会得到另一种未来。'],
  signature:'transition(x, v, a)',contract:'输入三个实数，返回二元组 (x_next, v_next)。',
  cases:[['transition(1, 0.5, -1)','(1.2, 0.2)','有惯性的反向动作'],['transition(0, 0, 1)','(0.2, 0.2)','从静止加速'],['transition(2, -0.5, 0)','(1.6, -0.4)','无动作仍会移动']],
  solution:'def transition(x, v, a):\n    new_v = 0.8 * v + 0.2 * a\n    return x + new_v, new_v\n',
  quiz:['位置相同、速度不同，下一位置一定相同吗？',1,['相同，位置足够了','不一定，速度也是状态','取决于模型参数量'], '环境有惯性，速度影响未来。模型缺少速度时，可以尝试从历史位置估计速度。'],
  failure:'如果用 x+a，混淆了动作与位移；如果以 x_next 作为输入，会产生答案泄漏。',transfer:'对照真实数据的一次 observation/action/target：标出各自时间戳，证明预测时能拿到输入。',
  experiment:['打开 projects/world-lab/lab.py 的 episodes，找到更新速度、更新位置、保存状态三行。','只在临时副本把摩擦系数从 0.8 改为 0.95，手算同一条样本，解释变化。','写下一个真实数据中可能错一帧的字段，并说明如何检测。'],
  command:'python3 projects/world-lab/lab.py --arch mlp --observation full --steps 0 --out .openai/local/world-contract',commandNote:'运动规律先在网页手算；准备好 PyTorch 环境后，这条命令建立不更新权重的起点报告。',
  expected:'网页三个用例通过；能指出 observation 在 t、target 在 t+1。尚未训练神经网络。',links:['w1-l1','w8-l1'],sources:[source.torch]
 }),
 stage('world','world-baseline','02 · 建立模型必须超越的基线',2,{
  goal:'实现均方误差，并区分独立轨迹划分与相邻帧泄漏。',story:'假设真实下一位置是 [1,2,3]，一个完全不学习的预测器给出 [1,1,1]。平方误差分别是 0、1、4，平均为 5/3。这个“下一刻保持不动”的 persistence 基线经常比想象中强：相邻视频帧本来就变化很小。只看到 loss=0.1，你不知道模型是否有用；必须与同一测试集上的基线比较。',
  explanation:['我们用完整 episode 划分数据：训练生成器 seed=42，验证 seed=10042。训练集用于更新权重，验证集用于比较配置，测试集最后才报告。按帧随机拆分会让同一轨迹几乎相同的画面出现在两边。','MSE 是每个预测元素平方差的平均。不同单位、归一化方式、预测长度会改变数值。MMLU 是语言知识考试，MMMU / MMStar 评测特定多模态能力；这些分数不能直接证明机器人世界预测准确。'],
  decision:'先保存不学习的基线，再训练模型。否则增加层数后变好的分数可能仅仅来自更容易的数据。',alternative:'可加已知物理规律的 oracle 上界；它读取真实速度，在部分可观测任务中必须标明使用了额外信息。',
  signature:'mse(predictions, targets)',contract:'等长非空数字列表，返回 MSE；长度不一致或为空时抛 ValueError。',steps:['检查长度和空列表。','逐项平方差。','除以元素数量，不是除以 batch 名称或 epoch 数。'],walkthrough:['预测 [1,1,1]，目标 [1,2,3]','平方差 [0,1,4]','MSE=5/3'],
  cases:[['mse([1,1,1],[1,2,3])','5/3','逐元素平均'],['mse([2],[2])','0','完美预测'],['mse([-1,2],[1,0])','4','正负误差都惩罚']],
  solution:'def mse(predictions, targets):\n    if not predictions or len(predictions) != len(targets):\n        raise ValueError("nonempty equal lengths required")\n    return sum((p-t)**2 for p,t in zip(predictions, targets))/len(targets)\n',
  quiz:['同一段视频的相邻帧被随机放入训练与验证，首先担心什么？',0,['验证泄漏，分数过于乐观','模型层数不足','必须改成 LoRA'], '应先按轨迹、场景或采集会话隔离，再在集合内部抽样。换模型不能修复划分泄漏。'],failure:'只报告训练误差，或拿不同测试集的分数比较两个模型。',transfer:'为自己的训练数据选择隔离单位：episode、任务、场景还是机器人实例，并解释它对应的泛化问题。',
  experiment:['先运行 0 步模型，保存随机模型的验证误差和 persistence 误差。','查看 report.json 的 split 与 rollout_by_horizon，解释每个轴。','从报告摘录基线数值，不要预先填入教程中的“理想分数”。'],
  command:'python3 projects/world-lab/lab.py --arch mlp --observation full --steps 0 --out .openai/local/world-zero',expected:'生成 checkpoint.pt 和 report.json；随机模型不保证比不动基线好。',links:['w1-l3','w4-l3'],sources:[source.torch]
 }),
 stage('world','world-learn','03 · 第一次训练：参数为什么会改变',3,{
  goal:'完成一次梯度更新，再训练可恢复的 MLP。',story:'从最小模型 y_hat=w*x 开始，x=2、目标 y=6、初始 w=1。预测是 2，误差平方是 16；对 w 的梯度是 2*(2-6)*2=-16。学习率 0.1 时 w_new=2.6，预测变成 5.2。负梯度并非“参数必须减小”，它指示增大 w 能降低当前误差。',
  explanation:['MLP 把当前状态与动作拼成向量，经过线性层与非线性后预测状态增量。输出加回当前状态，模型只需学习变化。PyTorch 的 backward 计算梯度，optimizer.step 才更新参数；eval 或 no_grad 不会让权重继续学习。','width、层数决定参数形状与容量；learning rate、batch size、训练步数决定优化过程；checkpoint 保存的是学到的数值。AdamW、梯度裁剪和固定随机种子已放进脚本，先一次只改一个变量。'],
  decision:'用 MLP 建立可调试的训练闭环。只有当前状态确实不足时才增加序列结构。',alternative:'更大模型可能拟合更快，也可能过拟合或更难优化。先证明小模型能过拟合一个小 batch，再扩大数据。',
  signature:'sgd_step(w, x, target, lr)',contract:'平方误差 (w*x-target)^2，返回一次 SGD 后的 w。',steps:['算 prediction=w*x。','算 gradient=2*(prediction-target)*x。','返回 w-lr*gradient。'],walkthrough:['w=1,x=2,target=6','gradient=-16','lr=0.1 → w_new=2.6'],
  cases:[['sgd_step(1,2,6,0.1)','2.6','负梯度'],['sgd_step(3,2,6,0.1)','3','已到零误差'],['sgd_step(1,2,0,0.1)','0.2','正梯度']],solution:'def sgd_step(w, x, target, lr):\n    return w - lr * 2 * (w*x - target) * x\n',
  quiz:['loss.backward() 执行后，谁真正更新模型权重？',1,['model.eval()','optimizer.step()','保存 checkpoint'], 'backward 产生梯度；优化器按照梯度、学习率与自身状态更新参数。'],failure:'忘记 zero_grad 会累积旧梯度；把每次新模型的随机初始值当作同一对照。',transfer:'能沿着 batch → forward → loss → backward → clip → step 找到每个对象的角色。',
  experiment:['运行 100 步 MLP，比较 before、validation 与 persistence。','保持数据种子不变，新目录使用 --lr 0.0003 重跑。','解释误差改变与训练时间；不能仅凭一次结果断言某学习率普遍最好。'],command:'python3 projects/world-lab/lab.py --arch mlp --observation full --steps 100 --out .openai/local/world-mlp',expected:'真实训练报告与权重文件；以验证误差下降为观察项，未下降时检查数据、梯度和学习率。',links:['w1-l2','w3-l3'],sources:[source.torch]
 }),
 stage('world','world-history','04 · 为什么要 Decoder-only 和历史',4,{
  goal:'理解因果可见性，再比较相同输入条件下的 MLP 与 Transformer。',story:'你只能看见位置，速度被遮住了。位置从 0 到 0.2 与从 0.4 到 0.2，当前画面相同，运动方向却相反。MLP 只看当前帧无法区分；序列模型能从历史估计速度。我们先做一个因果均值：第 t 个输出只平均第 0 到 t 个输入，绝不能偷看后面的数字。',
  explanation:['Decoder-only 在这里指单一路径的因果序列预测器，没有一个单独读取整段目标的 encoder，也没有 encoder-decoder cross-attention。训练时整段并行计算，每个位置仍然通过 mask 限制可见范围；推理时按时间顺序把预测接回输入。','world-lab 使用 PyTorch 的 TransformerEncoderLayer 积木配显式上三角 mask。类名含 Encoder 不改变这里的因果信息流。位置编码区分先后顺序；没有它，注意力对历史的排列缺少明确位置信息。'],decision:'先隐藏速度，制造需要历史的任务，再验证架构是否解决了问题。',alternative:'显式输入估计速度也能帮助 MLP，且更便宜。Transformer 的价值不能只靠名字证明；需与相同观测的基线比较。',
  signature:'causal_means(values)',contract:'返回每个前缀的平均值；空列表返回 []。这只模拟因果可见性，不是注意力实现。',steps:['按顺序累加。','第 i 个输出只除以前 i+1 个元素数量。','不要使用整段总和计算早期输出。'],walkthrough:['[2,4,100]','前两个结果是 2、3','最后的 100 不能影响前两个结果'],
  cases:[['causal_means([2,4,100])','[2,3,106/3]','禁止未来泄漏'],['causal_means([5])','[5]','单位置'],['causal_means([])','[]','空序列']],solution:'def causal_means(values):\n    total=0\n    result=[]\n    for i,v in enumerate(values):\n        total+=v\n        result.append(total/(i+1))\n    return result\n',
  quiz:['训练时可以并行处理整段序列，是否说明模型看到了未来？',1,['是，并行一定泄漏','不一定，要检查因果 mask','只要叫 Decoder 就安全'], '并行是计算调度；可见性由 mask 和数据对齐决定。测试应修改未来输入并确认过去输出不变。'],failure:'拿 full-observation MLP 与 partial-observation Transformer 混在一起，无法归因架构收益。',transfer:'用未来扰动不影响过去输出的测试，审查真实骨干的因果契约。',
  experiment:['分别运行 partial MLP 和 partial Transformer，保持 seed、步数、batch 不变。','运行 test_lab.py，检查“改变未来不会改变过去预测”。','记录参数数与耗时；等步数并不意味着等 FLOPs，再设计等时间预算对照。'],command:'python3 projects/world-lab/lab.py --arch transformer --observation partial --steps 100 --out .openai/local/world-transformer',expected:'得到因果 Transformer 的真实训练结果；它不保证在这个小预算上胜过 MLP。',links:['w2-l2','w2-l3'],sources:[source.attention]
 }),
 stage('world','world-rollout','05 · 单步很准，为什么越预测越偏',5,{
  goal:'实现闭环 rollout，用多步误差检查训练和使用方式的差异。',story:'训练时给模型的每一帧来自真实环境，这叫 teacher forcing。使用时下一帧可能来自模型自己：一个小位置误差会变成下一步输入误差，再继续传播。你不能在每次预测后偷偷用真实位置替换预测，然后把结果称为闭环 rollout。',
  explanation:['这道题先用准确规则实现 rollout，验证循环正确性。神经网络版本在 evaluate 中只保留最初四帧真实上下文，之后追加自己的预测；动作序列保持已知，这是一种动作条件预测。','分别报告 horizon=1 到 8 的 MSE，而不只一个平均数。长时误差可能源于模型偏差、分布变化或状态信息不足；scheduled sampling、多步目标和更好的表示是不同候选，不能未经对照就混合修改。'],decision:'让训练指标与下游使用方式对齐。世界模型是否能支持规划，不能由 teacher-forced loss 单独判断。',alternative:'开环单步评测便宜且容易定位局部问题；闭环评测更接近连续使用，但诊断难度更高。两者都保留。',
  signature:'rollout(x, v, actions)',contract:'每次 v=0.8*v+0.2*a，x=x+v；返回每步新位置列表。',steps:['保留更新后的 x 和 v。','对每个动作重复状态转移。','记录新位置，下一步使用自己刚算出的状态。'],walkthrough:['初始 x=0,v=0；动作 [1,0]','第一步 x=0.2,v=0.2','第二步 x=0.36,v=0.16'],
  cases:[['rollout(0,0,[1,0])','[0.2,0.36]','传递状态'],['rollout(1,0,[])','[]','零步'],['rollout(0,0,[-1,-1])','[-0.2,-0.56]','持续加速']],solution:'def rollout(x, v, actions):\n    positions=[]\n    for a in actions:\n        v=0.8*v+0.2*a\n        x=x+v\n        positions.append(x)\n    return positions\n',
  quiz:['闭环 rollout 第二步的状态来自哪里？',0,['第一步预测','第二步真实标签','验证 loss'], '闭环要把自己的预测接回。持续喂真实状态评测的是另一种能力。'],failure:'只展示最漂亮的一条轨迹；必须汇总独立轨迹，并保留失败样例。',transfer:'在 OmniFM 的推理入口确认：喂入的视觉表示是观测、生成结果还是外部固定条件。',
  experiment:['打开 world-lab 的 evaluate，找到 history 拼接 prediction 的位置。','在独立临时分支改为真实下一帧，对比两个评测数值。','画出或记录各 horizon 的误差，解释两种评测回答的不同问题。'],command:'python3 projects/world-lab/test_lab.py',expected:'通过因果、状态分块、episode 划分与恢复训练检查；这些正确性测试不等同于泛化成绩。',links:['w8-l1','w8-l3'],sources:[source.jepa]
 }),
 stage('world','world-vision','06 · 加入视觉塔：DINO 到底输出什么',6,{
  goal:'理解 patch 特征、池化、冻结与 connector，先检查形状再接模型。',story:'前面模型直接读位置；相机给的却是像素。视觉塔把图像变成向量：例如一张图有 4 个 patch，每个 patch 3 维，就得到 [4,3] 特征。平均池化输出 [3]，保留 patch 则保留 [4,3] 的空间结构。今天先亲手算池化，让后续的张量尺寸有具体含义。',
  explanation:['DINO 系列是学习视觉表示的方法与模型家族。DINOv3 的官方实现提供不同骨干与权重。它不是把动作变成视频的完整世界模型，也不自动提供可生成 RGB 的解码器。选择版本、权重、预处理、特征层与 patch/CLS 输出都影响结果。','冻结视觉塔是让它提供固定特征，训练 connector 把视觉维度映射到序列骨干宽度。冻结参数不等于自动切到 eval：dropout 等行为也要考虑。平均池化便宜，却会丢空间信息；抓取任务可能需要 patch 级位置。'],decision:'先冻结视觉表示，隔离“感知特征是否可用”和“序列模型能否学习”两个问题。',alternative:'从头训练 CNN 便宜易控；预训练 DINO 表示更丰富但有领域差异。端到端微调成本更高，也可能破坏已有特征。',
  signature:'mean_pool(patches)',contract:'非空且等宽的二维列表，按 patch 维平均，返回一个向量。',steps:['确认有多少 patch。','对每个特征维分别求和。','每维除以 patch 数，不要混合所有维度。'],walkthrough:['patches=[[1,2],[3,4]]','第一维 (1+3)/2=2','第二维 (2+4)/2=3 → [2,3]'],
  cases:[['mean_pool([[1,2],[3,4]])','[2,3]','保留通道'],['mean_pool([[2,4,6]])','[2,4,6]','单 patch'],['mean_pool([[0],[2],[4]])','[2]','三个 patch']],solution:'def mean_pool(patches):\n    if not patches or not patches[0] or any(len(p)!=len(patches[0]) for p in patches):\n        raise ValueError("nonempty rectangular features required")\n    return [sum(p[j] for p in patches)/len(patches) for j in range(len(patches[0]))]\n',
  quiz:['把 16 个 patch 特征平均成一个向量的主要代价是什么？',1,['参数量一定变大','空间位置细节被压缩','自动得到更好的动作策略'], '池化合并空间信息。需要细粒度定位时，应比较 patch tokens 与 pooled features。'],failure:'把随机初始化视觉塔的输出称作预训练 DINO 特征；只看形状、不检查权重来源和输入归一化。',transfer:'本地索引的 vision 分组用于找到视觉输出与 connector 的交界；实际启用版本必须看运行配置。',
  experiment:['先完成网页池化代码。','在官方 DINOv3 仓库确认一个已获授权权重与对应预处理；课程不自动下载权重。','在本地记录 image → patches → connector → backbone 四个 shape，比较 pooled/patch 两种输入的信息与成本。'],command:'python3 projects/source-map/inspect_repo.py --repo ~/Code/OmniFM',expected:'本关网页验证池化；真实 DINO 特征实验需权重与环境，未执行前保持“待做”，不能写为复现完成。',links:['w6-l1','w6-l2'],sources:[source.dino]
 }),
 stage('world','world-latent','07 · 预测像素还是表示：理解 JEPA',7,{
  goal:'比较像素误差与表示误差，识别表示坍塌。',story:'两张图只是光照不同，像素差可能很大，机器人状态却相同。表示预测希望保留任务相关结构。余弦距离比较两个向量的方向：[1,0] 和 [2,0] 距离为 0；[1,0] 和 [0,1] 距离为 1。它会忽略尺度，这既可能有益，也可能隐藏问题。',
  explanation:['JEPA 的核心思路是在表示空间预测被遮蔽或未来部分，具体目标、teacher 更新、遮蔽设计依论文而异。不能把所有 latent regression 都叫完整 JEPA 复现，更不能假设小的 latent loss 等于可生成清晰视频。','如果目标编码器和预测器一起学成常数，loss 可能很小但信息消失。这叫坍塌。检查特征方差、样本区分度与下游任务；stop-gradient、EMA teacher 等设计需要结合完整目标解释。'],decision:'先问目标表示保留什么信息，再决定 loss。表征选择与损失一起定义模型被鼓励学习的能力。',alternative:'像素重建可直接看效果，但容易耗费容量在背景与纹理；latent 预测更抽象，却需要额外读出或解码来验证用途。',
  signature:'cosine_loss(a, b)',contract:'等长非零向量，返回 1-cos(a,b)。零范数抛 ValueError。',steps:['计算点积。','计算两个向量的 L2 范数。','返回 1-dot/(norm_a*norm_b)，检查零范数。'],walkthrough:['a=[1,0],b=[2,0]','点积=2，范数乘积=2','cosine_loss=0；MSE 却不是零'],
  cases:[['cosine_loss([1,0],[2,0])','0','尺度不敏感'],['cosine_loss([1,0],[0,1])','1','正交'],['cosine_loss([1,0],[-1,0])','2','反向']],solution:'import math\ndef cosine_loss(a, b):\n    if not a or len(a)!=len(b):\n        raise ValueError("shape")\n    norm=math.sqrt(sum(x*x for x in a)*sum(x*x for x in b))\n    if norm==0:\n        raise ValueError("zero norm")\n    return 1-sum(x*y for x,y in zip(a,b))/norm\n',
  quiz:['所有样本都得到同一个非零向量，cosine loss 很低，能说明表示优秀吗？',0,['不能，要检查坍塌与下游能力','能，loss 足够低','换成更大 batch 就一定解决'], '同一个向量无法区分状态。必须同时看表示统计和任务效果。'],failure:'把目标也跟着预测器任意变化，却只用 loss 下降说明学到了动态。',transfer:'追踪目标分支是否 detach、是否使用 EMA、目标在哪个特征空间、使用什么归一化。',
  experiment:['在网页比较同方向不同尺度的输入。','找到真实项目的视觉目标空间、目标编码器与 loss 归一化证据。','设计常数预测与上一帧复制两个基线，写出它们可能骗过哪些单一指标。'],command:'python3 projects/source-map/inspect_repo.py --repo ~/Code/OmniFM',expected:'留下目标构造的证据与一个坍塌检测方案；这不是完整 JEPA 训练脚本。',links:['w8-l2','w7-l2'],sources:[source.jepa,source.dino]
 }),
 stage('world','world-memory','08 · 从显式记忆走向 KDA',8,{
  goal:'实现一次矩阵记忆的 delta 更新，理解为什么需要控制读、写与遗忘。',story:'把 S 看成可改写的关联表，key 用来查询、value 是想写入的答案。先读 old=kᵀS，再算误差 v-old，然后按 beta*k*(v-old)ᵀ 修正 S。与不停把新值累加相比，delta 更新会根据已存内容修正写入。下面实现的是 delta-rule 的小机制，不是完整 KDA。',
  explanation:['KDA 在 Gated DeltaNet 路线上引入更细粒度门控。实际模块还包含投影、门、归一化、短卷积及高效 kernel；Kimi Linear 完整模型又是混合骨干。不能把一个标量递推或这道矩阵题当作 KDA 论文复现。','先用 world-lab 的 GRU 学会显式 state 与分块等价性，再回到实际 KDA 适配层，检查 state 的形状、dtype、所有者、reset 与 detach 时机。GRU 与 KDA 机制不同，GRU 只是练习状态接口的便宜工具。'],decision:'长上下文要同时考虑表达能力、持久状态大小与计算成本。有限状态记忆可能降低随长度增长的存储，但并非所有任务都能无损压缩历史。',alternative:'Transformer 可以保留可检索的历史 KV；状态模型把过去压入状态。应在同一任务、上下文和硬件上比较质量与资源，不能泛称谁永远更快。',
  signature:'delta_update(state, key, value, beta)',contract:'state 是 [key_dim,value_dim] 矩阵；返回 S+beta*k*(v-kᵀS)ᵀ；不修改原列表。',steps:['先用旧 state 计算每个 value 维的读取结果。','算 value-read 的残差。','用同一个旧读取结果更新整个矩阵。'],walkthrough:['S=[[1],[0]],k=[1,0],v=[3],beta=0.5','读取 1，残差 2','新 S=[[2],[0]]'],
  cases:[['delta_update([[1],[0]],[1,0],[3],0.5)','[[2],[0]]','按误差修正'],['delta_update([[1],[2]],[1,0],[9],0)','[[1],[2]]','禁止写入'],['delta_update([[0,0]],[1],[2,3],1)','[[2,3]]','两个 value 通道']],solution:'def delta_update(state, key, value, beta):\n    read=[sum(key[i]*state[i][j] for i in range(len(key))) for j in range(len(value))]\n    return [[state[i][j]+beta*key[i]*(value[j]-read[j]) for j in range(len(value))] for i in range(len(key))]\n',
  quiz:['这道 delta 更新题与完整 KDA 的关系是什么？',1,['完全等价，可以直接报告 KDA 成绩','帮助理解记忆修正，缺少完整门控与工程实现','它就是 DINO 编码器'], '必须把机制练习、参考实现对齐和完整模型复现分开记录。'],failure:'将 detach 当清零，或把上一个 episode 的 state 带到下一个 episode。',transfer:'在本地源码索引中同时查看 backbone/state/training，连起状态的产生、传递、切断梯度与重置。',
  experiment:['运行 partial GRU，与 partial MLP / Transformer 比较。','阅读 test_lab.py 的整段与两段推理等价测试，观察 reset 后为什么变了。','在本机确认真实 KDA 类型与 kernel 依赖；再用有效配置核对是否实际启用。'],command:'python3 projects/world-lab/lab.py --arch gru --observation partial --steps 100 --out .openai/local/world-gru',expected:'GRU 教学训练可运行；真实 KDA kernel 与公司训练尚待在相应环境中验证。',links:['w9-l1','w9-l2'],sources:[source.kda]
 }),
 stage('language','sft-mask','09 · SFT：只让回答区域承担监督',5,{
  goal:'把人工标注变成输入 token 与 labels，理解 SFT 在优化什么。',story:'输入“向左移动2格”，标注是 {"action":"move","direction":"left","steps":2}。SFT 是用这些有标准回答的样本继续训练模型。我们希望模型学会回答，提示词作为条件即可。把提示词对应 labels 设成 -100，回答与 EOS 保留 token ID，就形成回答区域监督。',
  explanation:['预训练常从大量序列中学习预测规律；SFT 使用整理好的输入与期望输出继续优化。后训练是更宽的阶段概念，可包含 SFT 和偏好优化。LoRA 则回答更新哪些参数的问题，因而能够和 SFT 同时使用。','本项目的 Hugging Face causal LM 内部将 logits 和 labels 错位一格。传入的 labels 与 input_ids 长度一致，不要再手工 shift 一次。忽略 prompt 的 loss 不代表看不到 prompt：回答依然可以注意到它。'],decision:'先打印一条样本、token 和监督位置，再启动训练。错位一格可能比所有超参数都更致命。',alternative:'全序列 loss 也有使用场景，但目标不同。对短回答的指令任务，prompt 很长会显著改变监督权重。',
  signature:'make_labels(prompt, answer, eos)',contract:'输入 token ID 列表，返回 (input_ids, labels)；prompt labels 用 -100。',steps:['拼接 prompt+answer+[eos]。','labels 前 len(prompt) 个位置置 -100。','保留 answer 和 eos；不在此手工右移。'],walkthrough:['prompt=[1,2],answer=[7],eos=9','inputs=[1,2,7,9]','labels=[-100,-100,7,9]'],
  cases:[['make_labels([1,2],[7],9)','([1,2,7,9],[-100,-100,7,9])','回答监督'],['make_labels([3],[4,5],0)','([3,4,5,0],[-100,4,5,0])','多 token 回答'],['make_labels([1],[],2)','([1,2],[-100,2])','只监督结束符']],solution:'def make_labels(prompt, answer, eos):\n    return prompt+answer+[eos], [-100]*len(prompt)+answer+[eos]\n',
  quiz:['prompt labels 被忽略以后，模型还可以利用 prompt 吗？',0,['可以，它仍是输入条件','不可以，已经被删除','只有 LoRA 才能看见'], 'loss mask 控制哪里计算误差，不是 attention mask，也不是把输入删除。'],failure:'把 padding 当回答监督；把 -100 当输入 token；重复 shift。',transfer:'在实际训练数据中区分 loss_mask、attention 可见性、memory_update 与 reset，名字类似也不是同一种开关。',
  experiment:['运行 inspect_data，解释为什么同一命令的三种改写不能跨训练与测试。','运行 mechanics，观察真实送给因果 loss 的配对。','打开 train.py 找 response_labels 和 model(...labels=...)，逐个解释参数。'],command:'python3 projects/robot-lora/mechanics.py',expected:'打印监督位置、LoRA 梯度与 loss；这里尚未微调预训练语言模型。',links:['w5-l1','w3-l1'],sources:[source.qwen,source.peft]
 }),
 stage('language','lora-layer','10 · LoRA：冻结大矩阵，学习小增量',5,{
  goal:'亲手计算 W*x + (alpha/r)*B*A*x，核对冻结与梯度。',story:'原始线性层 W 为 [out,in]，LoRA 放入 A=[r,in]、B=[out,r]。原来要更新 out×in 个数，现在更新 r×in+out×r 个数。比如 in=4,out=3,r=2，原矩阵12个数、增量14个数，反而没有省；低秩优势需要合适的尺寸与 rank，不能只看到 LoRA 名字。',
  explanation:['W 保持不变，前向仍用 W*x，再加小矩阵学习的增量。通常 A 随机、B 初始化为零，使最初输出与基座一致。第一次反向时 A 的梯度可能为零，因为 B 还为零；B 更新后，A 才得到非零梯度。','rank 是容量选择，alpha/r 是缩放。target_modules 决定在哪些投影加适配器。本教学训练器明确只对 q_proj、v_proj 加 LoRA；与全量 SFT 的参数数、显存、效果都要实测。'],decision:'需要保留基座并以较少可训练参数适配任务时使用 LoRA。它节省优化器与梯度状态，不代表整个模型无需加载。',alternative:'全量微调自由度更大、资源更多；LoRA 限制增量子空间。最终胜负取决于任务、数据、rank 与预算。',
  signature:'lora_forward(w, a, b, x, alpha)',contract:'二维列表 W,A,B 和向量 x；r=len(A)，返回 W*x+(alpha/r)*B*A*x。',steps:['先算原始矩阵 W 与 x 的乘积。','再算 A*x，随后 B*(A*x)。','用 alpha/r 缩放后逐维相加。'],walkthrough:['W=[[1,0]],A=[[0,1]],B=[[2]],x=[3,4],alpha=1','W*x=3；A*x=4；B*A*x=8','最终输出 [11]'],
  cases:[['lora_forward([[1,0]],[[0,1]],[[2]],[3,4],1)','[11]','增量路径'],['lora_forward([[1]],[[1]],[[0]],[3],2)','[3]','零 B 保持原输出'],['lora_forward([[1,1]],[[1,0],[0,1]],[[1,1]],[2,4],2)','[12]','rank 缩放']],solution:'def lora_forward(w, a, b, x, alpha):\n    def mv(m, v):\n        return [sum(c*z for c,z in zip(row,v)) for row in m]\n    base=mv(w,x)\n    delta=mv(b,mv(a,x))\n    return [u+alpha/len(a)*v for u,v in zip(base,delta)]\n',
  quiz:['SFT 与 LoRA 可以同时使用的原因是什么？',0,['一个定义监督任务，一个定义参数更新方式','它们是同一个缩写','LoRA 必须在没有标签时用'], 'SFT 用标注回答计算训练目标；LoRA 限制可训练权重的参数化方式。'],failure:'忘记冻结基础权重；仅比较不同初始化、不同数据的两次训练；未记录 adapter 对应的基座版本。',transfer:'先用 mechanics.py 检查冻结、初始输出等价和首步梯度，再进入真实模型。',
  experiment:['运行 mechanics.py，解释 A 首步梯度和 B 首步梯度的不同。','在相同 base、划分、seed 下分别运行 baseline/full/lora，保存输出。','比较验证成绩与可训练参数；小合成任务仅验证机制，不代表通用语言能力。'],command:'python3 projects/robot-lora/train.py --base Qwen/Qwen2.5-0.5B --mode lora --steps 40 --out .openai/local/robot-lora',commandNote:'先按项目 README 安装可选依赖；该命令会加载或下载基座，浮点训练需要额外内存。先在适合的机器上运行小步数。',expected:'可选预训练模型训练器已提供；本次交付未下载 Qwen 或完成其训练，结果必须由自己的运行产生。',links:['w5-l2'],sources:[source.lora,source.peft]
 }),
 stage('language','task-eval','11 · 格式对了，任务真的对了吗',9,{
  goal:'分别计算 JSON 合法与语义正确，建立有失败样例的任务评测。',story:'模型输出 {"direction":"right"} 是合法 JSON，却可能把向左走执行成向右走。评测至少有语法解析、schema 检查、字段语义匹配三层。只看生成流畅与否，无法判断具身指令的危险错误。今天先把最小的“解析成功 / 答案相同”拆开统计。',
  explanation:['网页题用完整 JSON 对象相等演示；本地训练器进一步限制 action、direction、steps 的类型与范围。字符串空白或键顺序不同不应被误判，额外字段则要按契约决定是否允许。','验证集用于选择学习率、rank 或提示格式。测试集如果反复查看并据此改配置，就已参与开发。保留结构化失败样本：格式失败、方向失败、步数失败、未见组合失败。'],decision:'先定义可机器检查的输出契约，再决定训练是否成功。',alternative:'人工偏好打分能评估语言自然度，但不能替代字段级任务正确性。reward model 或 DPO 也需要可靠的偏好来源。',
  signature:'grade_json(expected, outputs)',contract:'expected 为对象列表，outputs 为等长字符串列表，返回 {parsed:n, exact:n}。',steps:['逐个 json.loads，解析失败记为失败。','解析成功计 parsed。','解析对象与对应 expected 相等才计 exact。'],walkthrough:['目标 {"x":1}，输出 {"x":2}','parsed=1','exact=0：格式和语义分开'],
  cases:[["grade_json([{'x':1}],['{\"x\":2}'])","{'parsed':1,'exact':0}",'合法但错误'],["grade_json([{'x':1}],['bad'])","{'parsed':0,'exact':0}",'解析失败'],["grade_json([{'x':1}],['{\"x\": 1}'])","{'parsed':1,'exact':1}",'忽略空白']],solution:'import json\ndef grade_json(expected, outputs):\n    if len(expected)!=len(outputs):\n        raise ValueError("length mismatch")\n    parsed=exact=0\n    for target, text in zip(expected, outputs):\n        try:\n            value=json.loads(text)\n        except (ValueError, TypeError):\n            continue\n        parsed+=1\n        exact+=int(value==target)\n    return {"parsed":parsed,"exact":exact}\n',
  quiz:['根据测试集错误反复调整 rank 后，这份测试成绩还能代表独立测试吗？',1,['能，因为没有对测试反向传播','不能，测试已经参与配置选择','只要报告更高分即可'], '信息泄漏也包括人为看测试结果来调参；保留新的独立测试才能评估泛化。'],failure:'只统计 JSON 能否解析；只报告最好的随机种子；只留下成功示例。',transfer:'为世界模型区分表征误差、rollout 误差和下游控制成功率，不能互相替代。',
  experiment:['运行未微调 baseline 保存验证输出。','运行同一基座的 full 与 lora，逐条检查错误类别。','完成配置选择后，使用 --test 才生成独立测试报告；保存版本与选择理由。'],command:'python3 projects/robot-lora/train.py --base Qwen/Qwen2.5-0.5B --mode baseline --out .openai/local/robot-baseline',expected:'输出验证集 schema_valid / exact_match 计数与所有失败输出；不保证零样本基座能完成任务。',links:['w4-l3','w5-l3'],sources:[source.qwen]
 }),
 stage('language','inference-cache','12 · 推理优化：先理解 KV cache',10,{
  goal:'估算 KV 缓存，区分参数显存、上下文状态与端到端延迟。',story:'生成第100个 token 时，普通注意力需要前99个 token 的 K、V。cache 保存过去计算，避免每次重算。若有2层、4个 KV heads、每头8维、上下文100、每元素2字节，K与V共 2×2×4×8×100×2=25600 字节。这里没有算权重、临时张量和框架开销。',
  explanation:['GQA 的 KV head 数可能小于 query head 数，估算时不要错用。KV cache 随上下文与并发增长；KDA 的持久状态结构不同，不能套用同一公式。prefill 处理提示上下文，decode 逐 token 生成，瓶颈常不相同。','量化改变权重或缓存表示；FlashAttention 改变注意力计算的读写方式；continuous batching 调度请求。这些优化的作用位置不同。先测 p50/p95、吞吐、显存、质量，再决定用哪一种。'],decision:'先定义负载与指标，再优化；短请求低并发和长上下文高并发的最优设置不同。',alternative:'增加 batch 可能提高总吞吐却抬高单请求等待时间；缓存会省计算但占内存。质量与延迟一起比较。',
  signature:'kv_bytes(layers, kv_heads, head_dim, length, bytes_per_element)',contract:'返回单请求 K+V 的理论字节数；不含权重、激活、元数据与 padding。',steps:['算一个 K 张量元素数 layers*kv_heads*head_dim*length。','乘 2 计入 V。','乘每元素字节数。'],walkthrough:['2 层 × 4 KV heads × 8 dim × 100 长度','K、V 共 12800 元素','FP16/BF16 每元素 2 bytes → 25600 bytes'],
  cases:[['kv_bytes(2,4,8,100,2)','25600','常规上下文'],['kv_bytes(2,1,8,100,2)','6400','GQA 的 KV heads'],['kv_bytes(2,4,8,0,2)','0','空上下文']],solution:'def kv_bytes(layers, kv_heads, head_dim, length, bytes_per_element):\n    return 2*layers*kv_heads*head_dim*length*bytes_per_element\n',
  quiz:['world-lab 的 full_prefix_no_cache 延迟能称作部署服务的 TTFT 吗？',0,['不能，负载和计时范围不同','能，都是毫秒','只要 GPU 相同就可以'], 'TTFT 需定义请求接收至首 token 的范围。教学脚本只测固定 batch 的整段前向。'],failure:'异步 CUDA 运算不做同步便计时；忽略 warmup；把 tokens/s 当成单用户延迟。',transfer:'在实际推理器核对 cache/state 的生命周期，并设计同请求长度、并发和精度下的质量/延迟对照。',
  experiment:['读取 world-lab 报告的 latency.mode、batch、context。','改变序列长度时同时记录时间和状态内存，避免只比较一个点。','为真实服务定义 TTFT、TPOT、吞吐、p95 与任务准确率，再选择量化或批处理实验。'],command:'python3 projects/world-lab/lab.py --arch transformer --observation partial --steps 0 --out .openai/local/inference-profile',expected:'教学脚本给出 warmup 后整段前向延迟；部署服务、KV cache 与量化实验仍需单独实现并验收。',links:['w4-l1','w9-l1'],sources:[source.attention,source.kda]
 }),
 stage('engineering','loss-reduction','13 · 训练工程：loss 到底怎么平均',9,{
  goal:'按有效监督单位归一化，理解梯度累积与分布式统计。',story:'第一个 microbatch 只有1个有效目标，loss sum=2；第二个有3个目标，loss sum=0。直接平均两个 batch 的均值会得1；全体目标平均应是 (2+0)/(1+3)=0.5。长短序列混合、不同 loss mask 或跨卡数量不均时，这个差别会改变训练目标。',
  explanation:['梯度累积允许多个 microbatch 共用一次 optimizer.step，节省峰值激活内存，但正确缩放取决于目标如何定义。按 token 平均与按轨迹平均都是可能的目标，关键是明确并在训练、日志与验证中保持一致。','DDP 同步梯度，FSDP 分片参数与相关状态；混合精度、activation checkpointing、编译和数据预取分别改变算术、重算、执行图与供给。它们不能靠开关名称证明端到端收益。'],decision:'先把单卡损失定义说清，再扩展多卡。错误归一化在更多 GPU 上会被更快地放大。',alternative:'每个样本权重相等和每个 token 权重相等对应不同偏好。应在数据长度分布上计算具体例子。',
  signature:'weighted_loss(loss_sums, counts)',contract:'等长非空列表，counts 为非负数；返回总 loss / 总 count；总 count=0 时返回 0。',steps:['求所有 loss_sum 的和。','求有效 count 的和。','只有总 count 非零才做除法。'],walkthrough:['sums=[2,0],counts=[1,3]','总误差=2，总单位=4','全局均值=0.5，不是 batch 均值的平均'],
  cases:[['weighted_loss([2,0],[1,3])','0.5','不等长'],['weighted_loss([6],[3])','2','单 batch'],['weighted_loss([0,0],[0,0])','0','无监督目标']],solution:'def weighted_loss(loss_sums, counts):\n    if len(loss_sums)!=len(counts) or any(c<0 for c in counts):\n        raise ValueError("invalid counts")\n    total=sum(counts)\n    return sum(loss_sums)/total if total else 0\n',
  quiz:['两个 GPU 的有效 token 数不相等，简单平均各自的 loss 均值等于全局 token 均值吗？',1,['总是相等','不一定，需要按有效数量加权','只取更低的 loss'], '分母不同，均值不能直接平均。先明确 token / sample / lane 的单位。'],failure:'日志记录一种平均、反向优化另一种；空 mask 导致除零；累计步数与学习率调度步数混淆。',transfer:'在源码 loss → backward → normalize → optimizer 之间追踪分子与分母；记录实际配置选择的 reduction。',
  experiment:['用网页用例推算两个 microbatch 的真实权重。','在 OmniFM 本地索引的 loss/training 中寻找实际归一化路径。','为 H20 实验写出单卡基线、有效 batch、吞吐单位、显存与质量门槛；准备好再启动。'],command:'python3 projects/source-map/inspect_repo.py --repo ~/Code/OmniFM',expected:'得到符号定位线索；仅凭存在某方法不能证明当前训练启用了该功能。',links:['w3-l2','w4-l1'],sources:[source.torch]
 }),
 stage('engineering','resume-state','14 · 断点续训、detach 与 reset',10,{
  goal:'区分数值记忆与计算图，验证恢复训练连续性。',story:'模型读完一个 chunk 后，需要把数值状态带到下一个 chunk；但如果一直保留所有计算图，显存会持续增长。detach 保留数值、切断跨边界梯度；reset 则开始一个新 episode，清掉记忆。这是两种独立操作，不能互相代替。',
  explanation:['TBPTT 把梯度传播限制在有限窗口，并不必然截断前向信息。窗口越短，显存越省，但模型难以直接从更早的事件获得梯度信号。lane 还必须保证属于同一轨迹的状态不会被错误交换。','真正续训需要模型权重、优化器状态、步数、随机数与数据采样位置，必要时还包括 scheduler、scaler、各设备随机状态。world-lab 的无 dropout CPU 实验保存所需状态，并用连续6步与3+3步的参数逐项相等验证；该结论不能外推到多卡非确定性训练。'],decision:'用可验证的恢复实验替代“文件可以读回来”这一弱检查。',alternative:'只加载模型是初始化新实验；resume 是延续同一个优化过程。两种行为都合理，但实验身份与学习率应明确。',
  signature:'boundary(value, reset, detach)',contract:'机制示意：返回 {value:新数值, carry_gradient:是否跨边界传播梯度}；reset 清零并切断，detach 只切断。',steps:['若 reset 为真，数值变为0。','否则保留原数值。','只有既不 reset 也不 detach 才保留跨边界梯度标记。'],walkthrough:['value=5,reset=False,detach=True','数值仍为5','carry_gradient=False；这只是图语义示意'],
  cases:[['boundary(5,False,True)',"{'value':5,'carry_gradient':False}",'只断梯度'],['boundary(5,True,False)',"{'value':0,'carry_gradient':False}",'新 episode'],['boundary(5,False,False)',"{'value':5,'carry_gradient':True}",'连贯窗口']],solution:'def boundary(value, reset, detach):\n    return {"value":0 if reset else value,"carry_gradient":not reset and not detach}\n',
  quiz:['detach 一个循环状态会把已经记住的数值清零吗？',1,['会','不会，只切断梯度关系','只在 KDA 中会'], 'detach 与 reset 的职责不同。真实 PyTorch 测试同时检查数值相等与 requires_grad。'],failure:'把权重加载当完全续训；修改数据或参数形状后仍称同一个实验；把跨 episode 记忆污染当长上下文能力。',transfer:'在实际 checkpoint 清单中逐项核对优化器、scheduler、数据游标、分布式状态与恢复约束。',
  experiment:['运行 test_lab.py 的恢复连续性测试。','做 40 步训练，再用相同配置 --resume 接着跑到总步数80。','改学习率后观察脚本拒绝 resume；解释为何应另开实验而不是悄悄改变旧记录。'],command:'python3 projects/world-lab/test_lab.py',expected:'CPU 连续/恢复训练参数完全一致；MPS、CUDA 与多卡恢复需要各自验证。',links:['w3-l3','w9-l2'],sources:[source.torch]
 }),
 stage('engineering','experiment-review','15 · 做一张能经得起追问的实验表',11,{
  goal:'用相同任务的证据判断质量与速度取舍，形成可复核的消融实验。',story:'A 的 rollout MSE=0.02、延迟10ms；B 是0.03、4ms。没有单一数字可以说明谁更好。如果业务误差门槛是0.025，只有A合格；如果允许0.04，B可能更合适。先确定质量约束，再比较成本，避免为“更快”牺牲了任务。',
  explanation:['消融实验是有控制地改变一个因素，例如相同观测与训练预算下去掉历史、冻结视觉塔、替换骨干。结果表要包含数据版本、seed、配置、参数数、预算、指标口径和失败样例。一次胜出只是观察，重要结论需要多个种子。','就业作品要能重跑和解释：README 给命令，报告给指标，测试保障契约，日志帮助定位问题。公开作品使用原创合成环境；公司训练的私有证据与公开演示分开保存。'],decision:'建立质量门槛与复现实验，而不是给模型名字排名。',alternative:'等步数方便隔离优化行为，但参数量不同意味着计算预算不同；等时间或等 FLOPs 是另一种问题，需分别报告。',
  signature:'select_run(runs, max_error)',contract:'runs 为 {name,error,latency} 列表；选择 error<=门槛且 latency 最小的 name，无合格返回 None。',steps:['先按误差上限筛选。','再按 latency 从小到大选择。','没有合格项返回 None，不硬选一个。'],walkthrough:["A:error=.02,latency=10；B:error=.03,latency=4",'max_error=.025 → A','max_error=.04 → B'],
  cases:[["select_run([{'name':'A','error':.02,'latency':10},{'name':'B','error':.03,'latency':4}],.025)","'A'",'先质量后速度'],["select_run([{'name':'A','error':.02,'latency':10},{'name':'B','error':.03,'latency':4}],.04)","'B'",'合格中更快'],["select_run([{'name':'A','error':.2,'latency':1}],.1)",'None','无合格项']],solution:'def select_run(runs, max_error):\n    good=[r for r in runs if r["error"]<=max_error]\n    return min(good,key=lambda r:r["latency"])["name"] if good else None\n',
  quiz:['换骨干的同时换数据、学习率和训练时长，能把提升归因于骨干吗？',0,['不能，需要受控对照','能，只要分数变高','只看参数量就知道'], '多个变化混在一起无法确定原因。先做最小对照，再逐步组合收益。'],failure:'用测试集选择最佳种子；复制别人的指标当本机结果；隐去失败实验。',transfer:'准备五分钟项目答辩：问题是什么、为什么这样设计、如何证伪、失败在哪里、下一步改什么。',
  experiment:['用相同 partial 观测运行 mlp/transformer/gru 三组。','导入真实 report.json，在本页保存假设、观察、解释和下一步；记录至少一个失败。','以新的 seed 重复最关键结论，选择配置后再 --test 检查独立分布和 OOD 摩擦系数。'],command:'python3 projects/world-lab/lab.py --arch gru --observation partial --steps 100 --seed 43 --out .openai/local/world-gru-seed43',expected:'独立报告、可复现命令和限制说明；通过网页机制题只是其中一部分。',links:['w11-l1','w11-l2','w12-l3'],sources:[source.torch]
 }),
 stage('engineering','omnifm-audit','16 · 串起 OmniFM 的真实训练链',12,{
  goal:'从一条数据追到一次参数更新，再追到推理与恢复。',story:'代码仓库可以支持多种视觉塔、骨干和目标，但一次训练只启用其中一组。读到 KDA 类不等于当前 run 正在用 KDA；配置写了某个选项也不等于运行成功采用它。我们用三层证据区分：源码支持、有效配置、运行观测。',
  explanation:['从入口开始记录：配置解析 → 数据读取与 collate → 视觉编码与序列组装 → backbone/state → 目标与 loss → backward/归一化 → optimizer/scheduler → checkpoint。再从同一 checkpoint 找推理入口，核对 tokenizer、视觉预处理、状态 reset 和输出协议。','本地源码索引只收集 Python 符号、行号、文件哈希和 revision，不执行公司代码、不读取数据或配置值。它给你定位线索，不自动总结当前训练。有效配置与日志需要在公司环境里由你核对，结论保存在本地。'],decision:'把一个具体 run 作为阅读主线，比从头通读所有文件更容易理解设计与真实行为。',alternative:'先浏览整个仓库能建立目录印象，但不能替代一条 batch 的执行证据。未知的选项保留未知。',
  signature:'evidence_level(source_supports, config_enables, runtime_confirms)',contract:'返回 evidenced / configured / supported / unknown；只有三项都真才能 evidenced。',steps:['源码不支持或未知时返回 unknown。','仅源码支持返回 supported。','配置启用后为 configured；再有运行证据才 evidenced。'],walkthrough:['找到 KDA 构建函数 → supported','有效配置选择 KDA → configured','日志或实例确认使用该路径 → evidenced'],
  cases:[['evidence_level(True,False,False)',"'supported'",'只读源码'],['evidence_level(True,True,False)',"'configured'",'尚无运行证据'],['evidence_level(True,True,True)',"'evidenced'",'完整证据链'],['evidence_level(False,True,True)',"'unknown'",'矛盾证据需排查']],solution:'def evidence_level(source_supports, config_enables, runtime_confirms):\n    if not source_supports:\n        return "unknown"\n    if not config_enables:\n        return "supported"\n    return "evidenced" if runtime_confirms else "configured"\n',
  quiz:['当前实际训练配置未知，能从默认配置断言正在使用 DINO+KDA 吗？',1,['能，默认就是实际','不能，需有效配置与运行证据','只要文件名包含 KDA 即可'], '默认、示例、CLI 覆盖、恢复配置可能不同。先确认实际 run 的有效配置。'],failure:'将源码支持的所有能力描述为当前训练启用；把公司代码与路径直接提交到公开作品。',transfer:'最后交付一张真实 run 的数据流图、一份参数与状态清单、一项质量/性能对照，以及可解释的失败案例。',
  experiment:['运行本地索引并在本页选择生成的 JSON，只在当前浏览器内存查看。','每个环节只找一个入口与一个证据：输入 shape、输出 shape、mask、trainable 参数和状态生命周期。','拿到有效 run 配置后逐项核对；选一个小改动，在隔离实验中验证后再讨论真实训练迭代。'],command:'python3 projects/source-map/inspect_repo.py --repo ~/Code/OmniFM',expected:'生成 .openai/local/omnifm-map.json；当前 run 配置和公司 GPU 训练仍标为未验证。',links:['w9-l3','w12-l1'],sources:[source.kda,source.dino,source.torch]
 }),
];
export const projectExercises=projectStages.map(s=>s.exercise);
export const projects=[
 {id:'world',title:'从小世界到 OmniFM',tag:'主线 · 世界模型',description:'从可手算的状态转移开始，逐个引入学习、历史、视觉表示与记忆。每一步先制造问题，再用实验判断新组件是否解决问题。',deliverable:'独立的世界模型训练仓库：MLP / causal Transformer / GRU，对照数据、rollout、checkpoint 与失败分析。',range:'第 1–8 周',color:'green'},
 {id:'language',title:'机器人指令与 LoRA 复现',tag:'支线 · 后训练与推理',description:'从一条中文指令和 JSON 标注出发，理解 SFT 监督、LoRA 参数化、任务评测与推理状态。复现核心机制和小任务对照，不冒充原论文全套实验。',deliverable:'同一基座的 baseline / full SFT / LoRA-SFT 对照，输出契约、参数统计和失败样例。',range:'第 5–10 周',color:'blue'},
 {id:'engineering',title:'训练工程与转岗作品',tag:'综合 · 证据与性能',description:'把前两项实战变成可以重跑、恢复、测量和解释的项目；再用同一检查方式串起本地 OmniFM 的真实 run。',deliverable:'可复现命令、消融表、恢复测试、质量/资源报告、源码证据链与项目答辩。',range:'第 9–12 周',color:'purple'},
];
export const capabilityMap=[
 ['训练基础与预训练','机制 M01–M05：数据、目标、梯度、优化器、因果预测、rollout','w3-l1'],
 ['SFT / LoRA / 参数控制','09–11：回答监督、冻结与 rank、全量/低秩对照','w5-l2'],
 ['DINO / JEPA / 多模态','06–07：表示、connector、目标与坍塌；真实视觉训练是后续实验','w6-l2'],
 ['KDA / 长上下文 / 状态','08、14、16：机制、边界与真实源码；GPU kernel 验证待做','w9-l1'],
 ['DDP / FSDP / 混合精度 / 重算','13–15：先学损失与性能口径，多卡扩展需 H20 实验','w4-l1'],
 ['推理 / cache / 量化 / 服务','12、15：资源估算与基准；真实服务压测、量化质量对照为进阶交付','w4-l2'],
 ['Diffusion / Flow / DiT / CFG','原课程第 7 周保留；与 AR 生成作方法比较，不塞进每个模型','w7-l1'],
 ['RLHF / DPO / reward / VLA / 策略','原课程第 5、10 周与任务评测连接；偏好训练和机器人策略另立实验','w10-l1'],
 ['MoE / 蒸馏 / 检索与工具调用','扩展专题：先能定位职责与取舍；不作为本轮已经完成的实战','w12-l3'],
];
