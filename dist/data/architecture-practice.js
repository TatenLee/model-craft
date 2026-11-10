import {challenge} from './practice/shared.js';
const make=(id,title,d)=>({...challenge(4,1,title,d),id,level:'结构编程',minutes:35,architecture:true});
export const architectureExercises=[
 make('arch-window-mask','A01 · 实现因果滑窗 mask',{
  goal:'返回 T×T 的布尔矩阵，精确控制每个位置能读取谁。',signature:'window_mask(length, window)',
  contract:'length 是非负整数，window 是正整数且包含当前位置；返回 list[list[bool]]。不合法尺寸抛 ValueError，长度 0 返回 []。',
  context:'mask 的 True 表示可以读取。错误地开放未来会产生训练泄漏；窗口边界多一位也会改变计算和缓存预算。',
  steps:['先验证两个尺寸，拒绝 bool 冒充整数。','依次遍历 query 位置 t 与 key 位置 j。','仅当 max(0,t-window+1) <= j <= t 时返回 True。'],
  worked:'length=3, window=2 → [[True,False,False],[True,True,False],[False,True,True]]。最后一行只保留位置 1、2。',
  mistake:'不是 abs(t-j)<window；那会读到未来。window=1 只保留对角线。',transfer:'在 P01 的因果预测检查和 P07 的窗口对照中复用这个可见性约定。真实张量实现还要处理 padding 与批次维度。',
  cases:[['window_mask(3,2)','[[True,False,False],[True,True,False],[False,True,True]]','窗口边界'],['window_mask(2,1)','[[True,False],[False,True]]','仅当前'],['window_mask(2,8)','[[True,False],[True,True]]','窗口大于序列'],['window_mask(0,2)','[]','空序列']],
  extraTests:[{name:'拒绝负长度、零窗口与 bool',code:'for args in [(-1,2),(3,0),(True,2),(3,1.5)]:\n    try: window_mask(*args)\n    except ValueError: pass\n    else: raise AssertionError("尺寸必须验证")'}],
  solution:'def window_mask(length, window):\n    if type(length) is not int or type(window) is not int or length < 0 or window < 1:\n        raise ValueError("invalid dimensions")\n    return [[max(0,t-window+1) <= j <= t for j in range(length)] for t in range(length)]\n'
 }),
 make('arch-kv-budget','A02 · 算清 KV 缓存字节数',{
  goal:'实现标准、未压缩 KV 缓存预算，避免混淆 Q 头和 KV 头。',signature:'kv_bytes(batch, layers, tokens, kv_heads, key_dim, value_dim, element_bytes)',
  contract:'所有输入是整数；tokens 可为 0，其余必须 >0；非法输入抛 ValueError。返回字节数整数。仅计算 K/V，不计算模型权重。',
  context:'在相同 Q 头数下改变 kv_heads，就能对照 MHA、GQA 与 MQA 的理想缓存。此公式不能直接套 MLA 潜缓存。',
  steps:['校验整数类型与正负约束。','每个 KV 头保存 key_dim+value_dim 个元素。','乘以批次、缓存层数、历史长度、KV 头数和每元素字节数。'],
  worked:'batch=1,layers=2,tokens=100,kv_heads=4,key_dim=value_dim=4,element_bytes=2，返回 12800。换成 1 个 KV 头，得到 3200。',
  mistake:'不要把 key_dim 与 value_dim 相乘；它们是两个向量的长度，应相加。MiB 是字节数除以 1024²。',transfer:'把这个估算与 P09 的实际内存曲线对照。差额可能来自权重、分配器、临时激活与额外状态。',
  cases:[['kv_bytes(1,2,100,4,4,4,2)','12800','基本预算'],['kv_bytes(1,2,100,1,4,4,2)','3200','共享 KV'],['kv_bytes(2,1,3,2,4,8,4)','576','K/V 维度不同'],['kv_bytes(1,1,0,1,4,4,2)','0','无历史']],
  extraTests:[{name:'拒绝非法预算参数',code:'for args in [(1,0,4,1,2,2,2),(1,1,-1,1,2,2,2),(True,1,4,1,2,2,2)]:\n    try: kv_bytes(*args)\n    except ValueError: pass\n    else: raise AssertionError("必须检查参数")'}],
  solution:'def kv_bytes(batch, layers, tokens, kv_heads, key_dim, value_dim, element_bytes):\n    args=(batch,layers,tokens,kv_heads,key_dim,value_dim,element_bytes)\n    if any(type(x) is not int for x in args) or tokens < 0 or any(x <= 0 for x in (batch,layers,kv_heads,key_dim,value_dim,element_bytes)):\n        raise ValueError("invalid dimensions")\n    return batch*layers*tokens*kv_heads*(key_dim+value_dim)*element_bytes\n'
 }),
 make('arch-causal-topk','A03 · 写一个不会泄漏未来的索引器',{
  goal:'从因果范围内选出分数最高的历史位置。',signature:'causal_topk(scores, query_pos, k)',
  contract:'scores 为非空有限数值列表；query_pos 为合法整数位置，k 为非负整数。返回按分数降序排列的索引；同分时较小索引在前。k 超过可见数时返回全部可见位置。非法输入抛 ValueError。',
  context:'这是 DSA 选择阶段的机制练习；scores 已由外部给定，并未在浏览器里训练真实索引网络。',
  steps:['校验输入；候选只包含 0 到 query_pos。','按 (-scores[i], i) 排序，确保同分可复现。','最多取 k 个；不原地修改 scores。'],
  worked:'scores=[2,9,4,100], query_pos=2, k=2 → [1,2]。未来位置 3 虽然 100 分，不能参与候选。',
  mistake:'先 top-k 再过滤未来会少选合法候选。允许负分；分数并不需要是概率。',transfer:'完整训练还要实现索引监督与主注意力；先用此函数验证选择规则，再测远处目标被选中的召回率。',
  cases:[['causal_topk([2,9,4,100],2,2)','[1,2]','未来高分'],['causal_topk([3,3,1],2,2)','[0,1]','同分规则'],['causal_topk([-3,-1,-2],2,9)','[1,2,0]','负分和超大 k'],['causal_topk([1,2],1,0)','[]','零预算']],
  extraTests:[{name:'拒绝越界、非有限分数且不修改输入',code:'s=[2,9,4,100]\ncausal_topk(s,2,2)\nassert s==[2,9,4,100]\nfor args in [([1],1,1),([float("nan")],0,1),([1],0,-1)]:\n    try: causal_topk(*args)\n    except ValueError: pass\n    else: raise AssertionError("必须拒绝非法输入")'}],
  solution:'import math\ndef causal_topk(scores, query_pos, k):\n    if not scores or any(type(x) not in (int,float) or not math.isfinite(x) for x in scores):\n        raise ValueError("invalid scores")\n    if type(query_pos) is not int or not 0 <= query_pos < len(scores) or type(k) is not int or k < 0:\n        raise ValueError("invalid position or k")\n    return sorted(range(query_pos+1),key=lambda i:(-scores[i],i))[:k]\n'
 }),
 make('arch-sparse-read','A04 · 在选中的位置上做稳定 softmax',{
  goal:'区分索引选择与主注意力权重，返回标量 value 的加权读取。',signature:'sparse_read(logits, values, indices)',
  contract:'logits 与 values 是等长非空有限数值列表。indices 是非空、无重复且合法的整数索引列表。只在所选位置归一化，返回 float；非法输入抛 ValueError。',
  context:'这里 logits 来自主注意力；不是上一题索引器的分数。标量 value 简化了运算，真实模型会对向量的每个维度做同样加权。',
  steps:['检查列表长度、有限性、索引范围和重复。','取所选 logits 的最大值 m；计算 exp(logit-m)，避免溢出。','用这些权重除以其总和，再对所选 value 加权。'],
  worked:'logits=[0,0,100], values=[10,20,999], indices=[0,1] → 15。未选择的位置 2 再高分也不参与归一化。',
  mistake:'不能在全部位置做 softmax 再把未选择值清零；这样保留权重之和不一定为 1。',transfer:'这就是稀疏读取的核心。继续到 P07 检查候选召回率和最终输出质量，它们是两个不同指标。',
  cases:[['sparse_read([0,0,100],[10,20,999],[0,1])','15.0','仅选择集合'],['sparse_read([1000,1000],[2,4],[0,1])','3.0','大 logits 稳定性'],['sparse_read([-1000,1000],[5,8],[0])','5.0','单元素'],['sparse_read([0,math.log(3)],[0,4],[0,1])','3.0','非均匀权重']],
  extraTests:[{name:'重复、空集合与非有限输入需报错',code:'for args in [([0],[1],[]),([0],[1],[0,0]),([0],[1],[1]),([float("inf")],[1],[0]),([0],[1,2],[0])]:\n    try: sparse_read(*args)\n    except ValueError: pass\n    else: raise AssertionError("非法读取未报错")'}],
  solution:'import math\ndef sparse_read(logits, values, indices):\n    if not logits or len(logits)!=len(values) or any(type(x) not in (int,float) or not math.isfinite(x) for x in [*logits,*values]):\n        raise ValueError("invalid arrays")\n    if not indices or any(type(i) is not int or not 0<=i<len(logits) for i in indices) or len(set(indices))!=len(indices):\n        raise ValueError("invalid indices")\n    m=max(logits[i] for i in indices)\n    weights=[math.exp(logits[i]-m) for i in indices]\n    return sum(w*values[i] for w,i in zip(weights,indices))/sum(weights)\n'
 }),
 make('arch-ssm-scan','A05 · 实现 SSM 递推并传递状态',{
  goal:'计算 h=a*h+x，返回所有状态与末状态，验证分段等价。',signature:'ssm_scan(inputs, a, initial=0.0)',
  contract:'inputs 为有限数值列表（可空），a 与 initial 为有限数值。不限制 a 范围，便于观察不稳定系统。返回 (states, final_state)；非法数值抛 ValueError。',
  context:'这是标量 SSM 的机制实验，不含完整 Mamba 的选择性参数化。返回末状态，才能继续处理同一序列下一段。',
  steps:['验证输入、系数与初态均为有限数值。','从 initial 开始依序执行 h=a*h+x，并记录每步 h。','空输入返回空轨迹及原初态；不要修改输入列表。'],
  worked:'ssm_scan([1,0,0],0.8) → ([1,0.8,0.64],0.64)。下一段 [0] 从 initial=0.64 开始，得到 0.512。',
  mistake:'不是每一步把 h 重置为 initial；但切换到独立样本时应重置，避免样本污染。',transfer:'P06/P07 的长序列与 rollout 实验需要同样检查状态边界。训练时 detach 控制梯度传播，数值状态传递是另一个问题。',
  cases:[['ssm_scan([1,0,0],0.8)','([1,0.8,0.64],0.64)','脉冲衰减'],['ssm_scan([1,2],0)','([1,2],2)','无记忆'],['ssm_scan([],0.5,3)','([],3)','空片段'],['ssm_scan([0,0],2,1)','([2,4],4)','增长状态']],
  extraTests:[{name:'分段与整段一致，输入不被改写',code:'x=[1,2,3,4]\nwhole,end=ssm_scan(x,0.5)\nleft,h=ssm_scan(x[:2],0.5)\nright,last=ssm_scan(x[2:],0.5,h)\nassert whole==left+right and end==last and x==[1,2,3,4]\ntry: ssm_scan([float("nan")],0.5)\nexcept ValueError: pass\nelse: raise AssertionError("必须拒绝 nan")'}],
  solution:'import math\ndef ssm_scan(inputs, a, initial=0.0):\n    if any(type(x) not in (int,float) or not math.isfinite(x) for x in [a,initial,*inputs]):\n        raise ValueError("nonfinite input")\n    h=initial\n    states=[]\n    for x in inputs:\n        h=a*h+x\n        states.append(h)\n    return states,h\n'
 }),
 make('arch-gated-delta','A06 · 手写 KDA 的核心状态更新',{
  goal:'先逐通道遗忘，再按预测误差写入，最后用 q 读出。',signature:'gated_delta(state, alpha, key, value, beta, query)',
  contract:'state 为非空矩形 [dk,dv]；alpha/key/query 长度 dk，value 长度 dv。数值有限，alpha 与 beta 均在 [0,1]。返回 (new_state, output)，不修改任何输入；非法形状或数值抛 ValueError。',
  context:'简化核心公式：A=diag(alpha)S；pred=A.T@key；E=value-pred；S_new=A+beta*outer(key,E)；output=S_new.T@query。真实 KDA 还包含投影、门参数化等。',
  steps:['验证维度与门范围；新建 A，按行乘 alpha。','对每个 value 通道 j，累加 key[i]*A[i][j] 得到 pred[j]。','以 value-pred 形成误差外积，加入 A；从新状态读取 query。'],
  worked:'S=[[2,0],[0,4]], alpha=[0.5,1], key=[1,0], value=[5,1], beta=0.5, query=[1,1] → ([[3,0.5],[0,4]],[3,4.5])。',
  mistake:'alpha 乘状态的行；pred 读取衰减后的 A；输出读取写入后的 S_new。三处弄反可能在对称样例上碰巧通过。',transfer:'在 P07 验证多步记忆与检索；在 P10 核对真实实现的矩阵朝向、门、归一化、卷积状态和混合层比例。',
  cases:[['gated_delta([[2,0],[0,4]],[0.5,1],[1,0],[5,1],0.5,[1,1])','([[3,0.5],[0,4]],[3,4.5])','通道遗忘和纠错'],['gated_delta([[2]],[0.5],[1],[8],0,[1])','([[1]],[1])','只遗忘'],['gated_delta([[2]],[1],[1],[8],1,[1])','([[8]],[8])','完整纠错'],['gated_delta([[1,2,3],[4,5,6]],[1,1],[0,1],[7,8,9],1,[1,0])','([[1,2,3],[7,8,9]],[1,2,3])','非方阵和独立读取']],
  extraTests:[{name:'不修改状态，拒绝维度及门错误',code:'s=[[2,0],[0,4]]\ngated_delta(s,[0.5,1],[1,0],[5,1],0.5,[1,1])\nassert s==[[2,0],[0,4]]\nfor args in [([[1,2]],[1],[1],[3],1,[1]),([[1]],[2],[1],[3],1,[1]),([[1]],[1],[1],[3],float("nan"),[1])]:\n    try: gated_delta(*args)\n    except ValueError: pass\n    else: raise AssertionError("非法形状或门未拒绝")'}],
  solution:'import math\ndef gated_delta(state, alpha, key, value, beta, query):\n    dk=len(state)\n    if not dk or not state[0]:\n        raise ValueError("empty state")\n    dv=len(state[0])\n    if any(len(row)!=dv for row in state) or any(len(x)!=dk for x in (alpha,key,query)) or len(value)!=dv:\n        raise ValueError("shape mismatch")\n    numbers=[beta,*alpha,*key,*value,*query,*[x for row in state for x in row]]\n    if any(type(x) not in (int,float) or not math.isfinite(x) for x in numbers) or not 0<=beta<=1 or any(not 0<=x<=1 for x in alpha):\n        raise ValueError("invalid value")\n    a=[[alpha[i]*state[i][j] for j in range(dv)] for i in range(dk)]\n    error=[value[j]-sum(key[i]*a[i][j] for i in range(dk)) for j in range(dv)]\n    new=[[a[i][j]+beta*key[i]*error[j] for j in range(dv)] for i in range(dk)]\n    output=[sum(query[i]*new[i][j] for i in range(dk)) for j in range(dv)]\n    return new,output\n'
 }),
 make('arch-moe-load','A07 · 检查 MoE 专家负载',{
  goal:'统计每个专家收到多少次 token 分配，以及最高负载相对平均值的比例。',signature:'expert_load(routes, experts)',
  contract:'experts 是正整数；routes 为每个 token 选择的专家索引列表，同一 token 不可重复专家。返回 {"counts": [...], "max_over_mean": float}；无分配时比例为 0。非法输入抛 ValueError。',
  context:'这是训练诊断统计，不是完整路由算法。分配均匀也不代表专家有用，还要测质量与通信。',
  steps:['为每个专家初始化 0 次计数。','检查每个 token 的索引，累加分配次数。','平均负载=总分配/专家数，最大负载除以平均值；无分配单独处理。'],
  worked:'[[0,1],[0,1],[0,2],[0,3]]、4 个专家 → counts=[4,2,1,1]，平均 2，比例 2。',
  mistake:'平均值不是 token 数除以专家数；top-2 时每个 token 有两次分配。',transfer:'在 P09 的系统报告记录负载随训练变化，并查看慢专家、容量溢出、通信和任务指标。',
  cases:[['expert_load([[0,1],[0,1],[0,2],[0,3]],4)','{"counts":[4,2,1,1],"max_over_mean":2.0}','倾斜路由'],['expert_load([[0],[1]],2)','{"counts":[1,1],"max_over_mean":1.0}','均匀'],['expert_load([],3)','{"counts":[0,0,0],"max_over_mean":0.0}','空分配'],['expert_load([[1],[1]],3)','{"counts":[0,2,0],"max_over_mean":3.0}','单专家热点']],
  extraTests:[{name:'重复专家与越界分配需报错',code:'for args in [([[0,0]],2),([[2]],2),([],0),([[True]],2)]:\n    try: expert_load(*args)\n    except ValueError: pass\n    else: raise AssertionError("非法路由未拒绝")'}],
  solution:'def expert_load(routes, experts):\n    if type(experts) is not int or experts<1:\n        raise ValueError("invalid expert count")\n    counts=[0]*experts\n    for row in routes:\n        if any(type(i) is not int or not 0<=i<experts for i in row) or len(set(row))!=len(row):\n            raise ValueError("invalid route")\n        for i in row:\n            counts[i]+=1\n    total=sum(counts)\n    return {"counts":counts,"max_over_mean":max(counts)/(total/experts) if total else 0.0}\n'
 })
];
