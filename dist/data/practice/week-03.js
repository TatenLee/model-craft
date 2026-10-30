import {challenge as C} from './shared.js';
export default [
C(3,2,'建立可预测下一项的转移计数表',{
 goal:'从独立序列统计 token 转移，为语言模型建立简单基线。',signature:'transition_counts(sequences, vocab_size)',
 contract:'输入 token ID 都在 [0,vocab_size)，vocab_size≥1。返回 V×V 计数矩阵，C[i][j] 表示同一序列里 i 后接 j 的次数。跨序列不计数，空序列跳过。',
 context:'在昂贵训练之前，先用数据本身建立一个弱基线。转移表只记住一个 token 的上下文，无法建模远程关系，但它能暴露数据是否重复、目标是否错位、词表是否稳定。',
 steps:['初始化 V 行独立的零列表；不要用同一行的重复引用。','对每条序列遍历相邻对 a、b，执行 counts[a][b]+=1。','换一条序列时重新开始，不能把前一条末尾保存为上下文。'],
 worked:['序列 [0,1,0] 产生 0→1 和 1→0。','再遇到 [0,1]，0→1 的总次数变成 2。','最终矩阵 [[0,2],[1,0]]，行是来源，列是下一项。'],
 mistake:'[[0]*V]*V 共享行；更新一个位置会污染多行。',transfer:'这是计数模型的数据准备，不是 Transformer 梯度训练；后续周综合用同一表计算平滑概率与验证损失。',
 cases:[['transition_counts([[0,1,0],[0,1]],2)','[[0,2],[1,0]]','合并独立序列统计'],['transition_counts([[0],[1]],2)','[[0,0],[0,0]]','不跨序列拼接'],['transition_counts([[],[1,1,1]],2)','[[0,0],[0,2]]','重复转移']],
 solution:'def transition_counts(sequences,vocab_size):\n    c=[[0]*vocab_size for _ in range(vocab_size)]\n    for seq in sequences:\n        for a,b in zip(seq,seq[1:]): c[a][b]+=1\n    return c\n',
 quiz:['两条独立序列 [0] 和 [1]，是否有一次 0→1？',['有','没有','取决于学习率'],1,'独立样本之间没有定义这个相邻关系。']
}),
C(3,4,'只对有效目标计算交叉熵',{
 goal:'计算一批位置的稳定交叉熵并正确排除 PAD。',signature:'masked_cross_entropy(logits, targets, valid)',
 contract:'logits 是 N×V 有限分数，targets 是合法下标，valid 为等长布尔列表。只对 True 位置取平均自然对数交叉熵；无有效位置抛 ValueError。',
 context:'补齐能让数组形状一致，却不产生真实标签。即使 PAD 位置有 logits 和类别编号，也不应该自动算进损失。归一化分母必须与监督定义匹配，否则短序列占比变化就会改变损失尺度。',
 steps:['遍历位置，只处理 valid=True 的行。','每行计算 log(sum(exp(z-m)))+m-z_target，其中 m=max(z)。','把有效行损失求和除以有效行数；无监督时明确报错。'],
 worked:['第一行 logits=[0,0]，目标 0，损失 log(2)。','第二行无论分数如何，只要 valid=False 就不参与。','结果是 log(2)，不能除以总位置数 2。'],
 mistake:'先 softmax 再把概率传给期望 logits 的损失接口会改变目标；直接 exp(1000) 可能溢出。',transfer:'本题使用 Python 明确公式；真实框架应使用稳定的交叉熵实现，同时核对 reduction 与 ignore_index 的规则。',
 cases:[['masked_cross_entropy([[0,0],[1000,-1000]],[0,1],[True,False])','0.6931471805599453','PAD 不稀释损失'],['masked_cross_entropy([[1000,-1000]],[1],[True])','2000','大分数差仍有限'],['masked_cross_entropy([[0,0],[0,0]],[0,1],[True,True])','0.6931471805599453','按有效位置平均']],
 extraTests:[{name:'无有效目标报错',code:'try:\n    masked_cross_entropy([[0,0]],[0],[False])\n    assert False,"需要拒绝空监督"\nexcept ValueError: pass'}],
 solution:'import math\ndef masked_cross_entropy(logits,targets,valid):\n    losses=[]\n    for row,t,ok in zip(logits,targets,valid):\n        if ok:\n            m=max(row)\n            losses.append(math.log(sum(math.exp(x-m) for x in row))+m-row[t])\n    if not losses: raise ValueError("no targets")\n    return sum(losses)/len(losses)\n',
 quiz:['10 个位置只有 2 个有效，其损失分别为 1 和 3，平均损失是？',['0.4','2','4'],1,'总有效损失 4 除以有效位置数 2。']
}),
C(3,6,'实现可核对的学习率日程',{
 goal:'生成先线性 warmup、再线性衰减的学习率列表。',signature:'learning_rates(total_steps, warmup_steps, peak)',
 contract:'total_steps>0，0≤warmup_steps<total_steps，peak≥0。步号从 1 开始。warmup 内 lr=peak*step/warmup_steps；之后 lr=peak*(total_steps-step)/(total_steps-warmup_steps)。无 warmup 直接按后一式。',
 context:'学习率日程是训练循环的控制规则，不是模型参数。先定义步号再实现很重要：从 0 还是 1 开始、在更新前还是更新后调用，都会使曲线错开一步。这里给出严格约定，便于数值验收。',
 steps:['遍历 step=1 到 total_steps。','处于 warmup 时按上升公式；否则按下降公式。','确认 warmup 末端达到 peak，最后一步为 0；无 warmup 时不能除以 0。'],
 worked:['total=4、warmup=2、peak=1。','第 1、2 步分别是 0.5、1；第 3、4 步分别是 0.5、0。','改变日程只改变更新尺度，不改变模型层数或参数数量。'],
 mistake:'使用 len(history) 当恢复后的全局 step 会在续训时重复 warmup。',transfer:'保存 scheduler 状态或明确的全局步数，才能让续训沿用相同日程。这里不包含 AdamW 的动量状态。',
 cases:[['learning_rates(4,2,1)','[0.5,1,0.5,0]','升温与下降'],['learning_rates(2,0,1)','[0.5,0]','无 warmup'],['learning_rates(3,1,0.2)','[0.2,0.1,0]','非整数峰值']],
 solution:'def learning_rates(total_steps,warmup_steps,peak):\n    return [peak*s/warmup_steps if s<=warmup_steps else peak*(total_steps-s)/(total_steps-warmup_steps) for s in range(1,total_steps+1)]\n',
 quiz:['恢复到第 100 步却把日程 step 重置为 0，是否等价于连续训练？',['是，只要权重相同','否，更新尺度可能改变','是，因为学习率不是参数'],1,'优化路径也依赖训练状态；权重相同不是完整恢复的充分条件。']
}),
C(3,7,'周项目：训练并评估一个 bigram 基线',{
 goal:'从训练序列估计概率，用独立序列计算平均负对数似然。',signature:'bigram_nll(train_sequences, valid_sequences, vocab_size)',
 contract:'V≥1，token 下标合法。训练转移计数使用 add-one 平滑：p(j|i)=(C[i][j]+1)/(sum(C[i])+V)。返回验证所有相邻对的平均 -log(p)。验证无相邻对时抛 ValueError；不能用验证数据更新计数。',
 context:'bigram 只依赖上一个 token，能力很弱，却是一条完整、可解释的数据学习链路。计数是从训练数据得到的统计参数，平滑避免未见转移概率为零。本题用它作为语言模型对照，不把它称为 Transformer 预训练。',
 steps:['建立 V×V 转移计数，严格限定在各条训练序列内部。','为每个验证相邻对读取平滑概率，累计自然对数负值。','分母是验证转移总数，不是句子数；验证句长不同也按 token 平均。'],
 worked:['训练 [[0,1]]、V=2，来源 0 的计数为 [0,1]。','平滑后 p(1|0)=2/3，验证 [[0,1]] 的 NLL=−log(2/3)≈0.4055。','验证 [[0,0]] 的概率为 1/3，NLL 更大；这没有改变训练计数。'],
 mistake:'把训练与验证先合起来统计，会让看似更好的验证结果失去独立性。',transfer:'完成后可将该基线与 tiny_lm.py 在一致编码和切分下比较；不同 token 单位的 NLL/PPL 不宜直接排大小。',
 cases:[['bigram_nll([[0,1]],[[0,1]],2)','0.40546510810816444','见过的转移'],['bigram_nll([[0,1]],[[0,0]],2)','1.0986122886681098','未见转移有平滑'],['bigram_nll([],[[0,1,0]],2)','0.6931471805599453','无训练数据为均匀概率']],
 solution:'import math\ndef bigram_nll(train_sequences,valid_sequences,vocab_size):\n    c=[[0]*vocab_size for _ in range(vocab_size)]\n    for seq in train_sequences:\n        for a,b in zip(seq,seq[1:]): c[a][b]+=1\n    losses=[]\n    for seq in valid_sequences:\n        for a,b in zip(seq,seq[1:]): losses.append(-math.log((c[a][b]+1)/(sum(c[a])+vocab_size)))\n    if not losses: raise ValueError("no targets")\n    return sum(losses)/len(losses)\n',
 quiz:['某个转移在训练中未出现，add-one 平滑主要解决什么？',['让词表变小','避免概率为零导致无穷损失','保证模型理解语义'],1,'平滑赋予未见事件非零概率，但不会创造长程理解能力。']
})];
