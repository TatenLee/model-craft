import {challenge} from './practice/shared.js';
const make=(id,title,d)=>({...challenge(5,1,title,d),id,day:null,book:true,level:'书籍实战',minutes:35});
export const bookExercises=[
 make('book-mixture','计算固定配比的分域指标',{
  goal:'验证配比变化如何影响平均值，并拒绝无意义的输入。',signature:'mixture_mean(losses, weights)',
  contract:'输入两个等长非空数值列表。losses 为有限非负数，weights 为有限非负数且总和大于零；返回加权平均 loss。非法输入抛 ValueError；不修改输入。',
  steps:['检查长度、类型、有限值、非负约束与权重总和。','计算各域 loss×weight 的和。','除以权重总和，而不是域的数量。'],
  context:'比较阶段训练时固定评测配比；改变配比本身就能让总分变化。',worked:'losses=[1,3]，weights=[3,7] → (3+21)/10=2.4。',mistake:'权重不必已归一化，不能直接求 sum(loss*weight)；零权重允许，但不能全零。',transfer:'真实训练按有效 token 计 loss；还需要保留逐域指标与样本数。',
  cases:[['mixture_mean([1,3],[3,7])','2.4','非归一权重'],['mixture_mean([1,3],[9,1])','1.2','改变配比'],['mixture_mean([1,100],[1,0])','1.0','零权重域'],['mixture_mean([2],[5])','2.0','单域']],
  extraTests:[{name:'拒绝非法输入，保留原列表',code:'xs=[1,3]; ws=[3,7]\nmixture_mean(xs,ws)\nassert xs==[1,3] and ws==[3,7]\nfor args in [([],[]),([1],[0]),([1],[-1]),([1],[float("nan")]),([float("inf")],[1]),([-1],[1]),([1],[1,2]),([True],[1])]:\n    try: mixture_mean(*args)\n    except ValueError: pass\n    else: raise AssertionError("invalid mixture accepted")'}],
  solution:'import math\ndef mixture_mean(losses, weights):\n    if not losses or len(losses)!=len(weights):\n        raise ValueError("unaligned domains")\n    if any(type(v) not in (int,float) or not math.isfinite(v) or v<0 for v in [*losses,*weights]):\n        raise ValueError("invalid value")\n    total=sum(weights)\n    if not math.isfinite(total) or total<=0:\n        raise ValueError("invalid total")\n    return sum(x*(w/total) for x,w in zip(losses,weights))\n'
 }),
 make('book-returns','为每个动作计算未来折扣回报',{
  goal:'从奖励序列反向累计未来回报，区分即时反馈和长期目标。',signature:'discounted_returns(rewards, gamma)',
  contract:'rewards 为有限数字列表，可为空；gamma 为 [0,1] 内有限数字。返回同长度列表 G[t]=r[t]+gamma*G[t+1]，末尾之后 G=0。非法输入抛 ValueError；不修改输入。',
  steps:['检查 gamma 范围与所有奖励为有限数。','从结尾向前，用 running=r+gamma*running 更新。','将结果恢复为原时间顺序。'],context:'只盯即时奖励，会忽略为后来成功铺路的动作。',worked:'[1,0,2]、gamma=0.5 → [1.5,1,2]。',mistake:'从前往后直接累计得到的是过去奖励，不是每一步未来回报。',transfer:'RL 还需策略采样、优势、损失与重新评测；此函数只计算有限轨迹回报。',
  cases:[['discounted_returns([1,0,2],0.5)','[1.5,1,2]','两步未来'],['discounted_returns([1,-2,3],1)','[2,1,3]','无折扣'],['discounted_returns([1,-2,3],0)','[1,-2,3]','即时奖励'],['discounted_returns([],0.9)','[]','空轨迹']],
  extraTests:[{name:'拒绝非法折扣与奖励且不改输入',code:'rs=[0,2]\nassert discounted_returns(rs,0.9)==[1.8,2]\nassert rs==[0,2]\nfor args in [([1],-0.1),([1],1.1),([1],float("nan")),([float("inf")],0.9),([True],0.9)]:\n    try: discounted_returns(*args)\n    except ValueError: pass\n    else: raise AssertionError("invalid trajectory accepted")'}],
  solution:'import math\ndef discounted_returns(rewards, gamma):\n    if type(gamma) not in (int,float) or not math.isfinite(gamma) or not 0<=gamma<=1:\n        raise ValueError("invalid gamma")\n    if any(type(r) not in (int,float) or not math.isfinite(r) for r in rewards):\n        raise ValueError("invalid reward")\n    result=[]\n    running=0.0\n    for reward in reversed(rewards):\n        running=reward+gamma*running\n        result.append(running)\n    return result[::-1]\n'
 }),
 make('book-ppo','实现 PPO 的裁剪替代目标',{
  goal:'正确处理正负优势，分清最大化目标与最小化 loss。',signature:'clipped_surrogate(ratio, advantage, epsilon)',
  contract:'ratio 为有限非负数，advantage 为有限数，epsilon 为 [0,1) 内有限数。返回 min(ratio*A,clip(ratio,1-eps,1+eps)*A)，不是取负后的 loss。非法输入抛 ValueError。',
  steps:['验证概率比、优势和 epsilon 的范围。','将 ratio 限制在 1-epsilon 与 1+epsilon 之间。','将裁剪前后分别乘 advantage，再取较小值。'],context:'最大化这个局部目标，减少继续鼓励过大的有利更新；它不是完整 PPO 训练器。',worked:'ratio=0.5，A=-2，eps=0.2 → min(-1,-1.6)=-1.6。',mistake:'先裁剪再乘优势还不够；min 与负优势的关系必须保留。裁剪目标不是概率变化的硬约束。',transfer:'完整 PPO 还需 rollout、old log-probs、优势估计、采样更新节奏与评测。',
  cases:[['clipped_surrogate(1.5,2,0.2)','2.4','正优势上侧裁剪'],['clipped_surrogate(0.5,-2,0.2)','-1.6','负优势下侧裁剪'],['clipped_surrogate(0.5,2,0.2)','1.0','正优势保留未裁剪'],['clipped_surrogate(1.5,-2,0.2)','-3.0','负优势保留未裁剪'],['clipped_surrogate(1.1,0,0.2)','0.0','零优势']],
  extraTests:[{name:'拒绝无效概率比与裁剪范围',code:'for args in [(-1,2,0.2),(1,float("nan"),0.2),(1,2,1),(1,2,-0.1),(float("inf"),2,0.2)]:\n    try: clipped_surrogate(*args)\n    except ValueError: pass\n    else: raise AssertionError("invalid PPO input accepted")'}],
  solution:'import math\ndef clipped_surrogate(ratio, advantage, epsilon):\n    if any(type(v) not in (int,float) or not math.isfinite(v) for v in (ratio,advantage,epsilon)):\n        raise ValueError("nonfinite input")\n    if ratio<0 or not 0<=epsilon<1:\n        raise ValueError("invalid range")\n    clipped=min(1+epsilon,max(1-epsilon,ratio))\n    return min(ratio*advantage,clipped*advantage)\n'
 })
];
