import {challenge as C} from './shared.js';
export default [
C(2,2,'实现词表编码与向量查表',{
 goal:'把文本 token 依次变成编号，再变成模型可计算的向量。',signature:'embed(tokens, vocab, table)',
 contract:'tokens 是字符串列表，vocab 把 token 映射到 table 的合法行号。返回各 token 对应向量的新列表；每行也要复制，修改输出不能污染参数表。未知 token 抛 KeyError。',
 context:'编号只是地址，并没有可加减的语义。把“猫”的编号设成 100，不意味着它比编号 10 的“狗”更大。embedding 查表取出一个可训练向量，训练改变的是表内的数值，词表映射应保持稳定。',
 steps:['依次读取 token，用 vocab[token] 找到行号；不要直接把字符串当列表下标。','从 table 中取出这一行，复制后加入结果；重复 token 应得到相同数值，但独立的列表。','检查 B、T、D：本题只有一条序列，结果为 T×D；参数表则是 V×D。'],
 worked:['vocab={a:0,b:1}，table=[[1,0],[0,2]]。','序列 [b,a,b] 编码为 [1,0,1]。','查表后是 [[0,2],[1,0],[0,2]]，T=3、D=2，参数表仍只有 4 个数。'],
 mistake:'直接 append(table[index]) 会共享可变列表；在后续实验中改输出可能意外改掉参数。',transfer:'真实框架的 embedding 有自动求导和高效索引；本题先固定 token、编号、向量、参数四者的边界。',
 cases:[['embed(["b","a","b"],{"a":0,"b":1},[[1,0],[0,2]])','[[0,2],[1,0],[0,2]]','顺序与重复'],['embed([],{},[])','[]','空序列'],['embed(["x"],{"x":0},[[0.2,-1,3]])','[[0.2,-1,3]]','表示维度可改变']],
 extraTests:[{name:'不共享可变行',code:'t=[[1,2]]\nr=embed(["a","a"],{"a":0},t)\nr[0][0]=99\nassert t==[[1,2]] and r[1]==[1,2]'}],
 solution:'def embed(tokens,vocab,table):\n    return [list(table[vocab[t]]) for t in tokens]\n',
 quiz:['序列长度翻倍，V×D 的查找表参数量怎样变化？',['不变','翻倍','变成 T×T'],0,'同一参数表被重复读取，序列变长主要增加中间计算量。']
}),
C(2,4,'让注意力概率只分给允许的位置',{
 goal:'实现数值稳定的 masked softmax。',signature:'masked_softmax(scores, allowed)',
 contract:'两个列表等长，scores 有限，allowed 中 True 明确表示允许读取。返回概率列表；禁止位置为 0，允许位置之和为 1。全部禁止或空输入时返回全零列表。本题约定与某些框架的 mask 语义不同。',
 context:'把未来位置的分数设为零并不能禁止读取，因为 exp(0)=1。正确思路是只让允许位置参与归一化。还要处理整行都不能读的情况，否则可能出现 0/0 或负无穷相减。',
 steps:['先收集允许位置；为空时直接返回等长零列表。','只在允许位置找最大分数 m，计算 exp(score-m)，禁止位置权重设为零。','用全部有效权重之和归一化，检查概率和与禁止位置。'],
 worked:['分数 [0,0,1000]，允许标志 [True,True,False]。','第三项虽然分数最大，仍不能进入最大值选择和分母。','前两项权重相同，结果是 [0.5,0.5,0]。'],
 mistake:'先对所有位置 softmax 再把禁止项清零，会让剩余概率和小于 1。',transfer:'因果约束控制信息来源，数值稳定控制计算是否可靠，两者都不能靠增加训练步数修复。',
 cases:[['masked_softmax([0,0,1000],[True,True,False])','[0.5,0.5,0]','未来高分仍被屏蔽'],['masked_softmax([1000,1000],[True,True])','[0.5,0.5]','大分数不溢出'],['masked_softmax([1,2],[False,False])','[0,0]','全部禁止'],['masked_softmax([],[])','[]','空输入']],
 solution:'import math\ndef masked_softmax(scores,allowed):\n    active=[s for s,a in zip(scores,allowed) if a]\n    if not active: return [0.0]*len(scores)\n    m=max(active)\n    weights=[math.exp(s-m) if a else 0.0 for s,a in zip(scores,allowed)]\n    return [v/sum(weights) for v in weights]\n',
 quiz:['禁止位置的原始分数很大，应怎样处理？',['先参与归一化再丢掉','在归一化时就排除','把分数改成零即可'],1,'禁止位置不能获得概率，也不能挤占其他位置的概率质量。']
}),
C(2,6,'构造下一 token 预测样本',{
 goal:'从完整序列生成严格对齐的输入和目标。',signature:'next_token_pairs(sequences)',
 contract:'sequences 是多个 token ID 列表。返回 (inputs,targets)，每条输入为原序列去掉最后一项，目标为去掉第一项；长度不足 2 的序列跳过。不要自动补 PAD 或 EOS。',
 context:'自监督不等于没有标签。下一 token 预测的目标来自序列本身，但必须右移一个位置。若输入与目标完全相同，网络可能学会复制当前 token，而不是预测下一个。',
 steps:['逐条处理序列，不把不同样本直接拼接。','用 seq[:-1] 和 seq[1:] 形成一对，保证长度相等。','在第 i 个输入位置，目标对应原始第 i+1 个 token；画出两个索引检查。'],
 worked:['原始序列 [10,20,30]。','输入 [10,20]，目标 [20,30]；第一位置看 10 预测 20。','两条序列分别切片，不能把第一条末尾与第二条开头变成真实相邻关系。'],
 mistake:'shift 目标后忘记去掉输入末尾，会出现长度错误；不做因果约束仍可能偷看目标。',transfer:'这里准备监督样本，尚未实现模型。下一 token 标签构造和注意力可见性需要同时正确。',
 cases:[['next_token_pairs([[10,20,30],[5,6]])','([[10,20],[5]],[[20,30],[6]])','两条独立序列'],['next_token_pairs([[],[1]])','([],[])','跳过无预测对的序列'],['next_token_pairs([[1,1,1]])','([[1,1]],[[1,1]])','重复 token']],
 solution:'def next_token_pairs(sequences):\n    valid=[s for s in sequences if len(s)>=2]\n    return [s[:-1] for s in valid],[s[1:] for s in valid]\n',
 quiz:['[4,7,9] 的下一 token 训练目标是？',['[4,7]','[4,7,9]','[7,9]'],2,'输入 [4,7] 对应目标 [7,9]，每个目标比输入向后一个位置。']
}),
C(2,7,'周项目：实现一个因果注意力头',{
 goal:'把点积、缩放、因果屏蔽与加权读取连起来。',signature:'causal_attention(q, k, v)',
 contract:'q、k 是 N×D 数字矩阵，v 是 N 个标量，N≥1、D≥1。输出 N 个标量。位置 i 只读取 j≤i；分数 dot(q[i],k[j])/sqrt(D)，softmax 后加权求和 v[j]。不更新参数。',
 context:'这是 Transformer 中一个机制的最小实现，不含投影参数、多头、残差或前馈层。综合题的重点是确定信息能从哪里来；只要未来值影响早先输出，即使结果形状正确也属于失败。',
 steps:['对每个查询 i，只遍历 0 到 i 的键，计算缩放点积。','对这一行有效分数做稳定 softmax。','用权重读取相同位置的 v；每行单独归一化，不能把所有行混在一起。'],
 worked:['q、k 全为零，所以每一行允许位置的分数都相同。','v=[2,4,9]：第一行只能得到 2，第二行平均得到 3。','第三行读前三项，得到 5；改最后一项不能影响前两项。'],
 mistake:'只在最终输出上处理 mask 已经太晚；未来信息必须在读取之前排除。',transfer:'你现在能检查一个注意力实现是否满足因果性。这个性质测试通常比只看某一组输出更能发现索引错误。',
 cases:[['causal_attention([[0],[0],[0]],[[0],[0],[0]],[2,4,9])','[2,3,5]','逐位置可见性'],['causal_attention([[2,3]],[[4,5]],[7])','[7]','单个位置权重必为一'],['causal_attention([[0],[0]],[[9],[8]],[-2,2])','[-2,0]','负值也参与加权']],
 extraTests:[{name:'未来值不影响过去',code:'q=[[1],[2],[3]]; k=[[2],[1],[4]]\na=causal_attention(q,k,[1,2,3])\nb=causal_attention(q,k,[1,2,999])\nassert a[:2]==b[:2]'}],
 solution:'import math\ndef causal_attention(q,k,v):\n    out=[]\n    for i,row in enumerate(q):\n        scores=[sum(a*b for a,b in zip(row,k[j]))/math.sqrt(len(row)) for j in range(i+1)]\n        m=max(scores)\n        weights=[math.exp(s-m) for s in scores]\n        out.append(sum(w*v[j] for j,w in enumerate(weights))/sum(weights))\n    return out\n',
 quiz:['对第三个 value 加 100，哪些输出绝不能改变？',['所有输出','前两个输出','只有第三个输出'],1,'前两个查询不允许读取第三个位置。']
})];
