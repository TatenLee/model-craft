// Small, editable mechanism demonstrations. No assertions or mastery credit.
const ex=(slug,title,conceptIds,starter,expectedOutput,change,prediction)=>({
 id:'concept-'+slug,title,conceptIds,sourceConceptId:conceptIds[0],week:1,minutes:10,
 summary:'先手算原始结果，再运行；每次只改变一个输入，比较你的预测与实际输出。',
 instructions:['先逐行读代码，写下你预计看到的数值。','保持原样运行，对照下方预期输出。',change,'再次运行，解释变化的原因；不要把这个小演示当作完整模型训练。'],
 starter,solution:starter,expectedOutput,change,prediction,hints:[prediction],tests:[]
});
export const conceptExamples=[
ex('navigation','给户型加一堵墙，机器人还能到达吗？',['navigation','navmesh','scene-layout'],`from collections import deque
# Coordinates are (row, column). Point robot, full map, unit moves.
grid = [list(row) for row in ["#######", "#S...G#", "#.....#", "#######"]]
# Try: grid[1][3] = "#"
# Then also try: grid[2] = list("#######")
def shortest_steps(grid, start, goal):
    height, width = len(grid), len(grid[0])
    def free(pos):
        r, c = pos
        return 0 <= r < height and 0 <= c < width and grid[r][c] != "#"
    if not free(start) or not free(goal):
        return None
    queue, seen = deque([(start, 0)]), {start}
    while queue:
        (r, c), distance = queue.popleft()
        if (r, c) == goal:
            return distance
        for nxt in [(r-1,c), (r+1,c), (r,c-1), (r,c+1)]:
            if free(nxt) and nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, distance + 1))
    return None
print("shortest steps:", shortest_steps(grid, (1,1), (1,5)))`, 'shortest steps: 4','先取消第一条 Try 注释放障碍，再取消第二条封住绕行路。','原图 4 步，中间加墙后 6 步，两条路都堵住后 None。已知全图的 BFS 是规划基线，不是视觉导航训练；机器人宽度与碰撞尚未建模。'),

ex('gradient','一次梯度更新，误差为什么变小？',['gradient','loss','learning-rate','optimizer','model-contract'],`x, target = 2.0, 7.0
w, b, lr = 2.0, 1.0, 0.1
prediction = w * x + b
loss = (prediction - target) ** 2
grad_w = 2 * (prediction - target) * x
grad_b = 2 * (prediction - target)
w -= lr * grad_w
b -= lr * grad_b
new_loss = (w * x + b - target) ** 2
print(f"loss: {loss:.2f} -> {new_loss:.2f}")
print(f"w={w:.2f}, b={b:.2f}")`, 'loss: 4.00 -> 0.00\nw=2.80, b=1.40','只把 lr 改成 0.3，先猜新 loss。','新 loss 为 16，比 4 更大。更新方向正确也可能因为步长过大而越过合适区域。'),
ex('softmax','分数如何变成概率？',['softmax','cross-entropy'],`import math
scores = [0.0, math.log(3)]
shift = max(scores)
weights = [math.exp(s - shift) for s in scores]
probs = [w / sum(weights) for w in weights]
print([round(p, 2) for p in probs])
print(f"sum={sum(probs):.2f}")`, '[0.25, 0.75]\nsum=1.00','把两个 score 都加 1000，预测概率是否变化。','概率不变。减最大值保留相对差值，同时避免 exp(1000) 溢出；不是让两个原始分数直接除以总和。'),
ex('attention','Attention 加权汇总与遮挡',['attention','causal-mask','transformer'],`import math
scores = [0.0, math.log(3)]
values = [2.0, 10.0]
allowed = [True, True]
# Only allowed positions enter the denominator.
visible = [s for s, ok in zip(scores, allowed) if ok]
assert visible, "at least one position must be visible"
shift = max(visible)
weights = [math.exp(s - shift) if ok else 0.0
           for s, ok in zip(scores, allowed)]
weights = [w / sum(weights) for w in weights]
output = sum(w * v for w, v in zip(weights, values))
print([round(w, 2) for w in weights])
print(f"output={output:.2f}")`, '[0.25, 0.75]\noutput=8.00','把 allowed 改成 [True, False]，预测输出。','权重变 [1,0]，输出为 2。遮挡要在归一化分母中排除位置；不是把原输出 8 乘一个开关。'),
ex('window','因果窗口允许读哪些位置？',['swa','causal-mask','context-window'],`length, window = 5, 2
for query in range(length):
    allowed = [key for key in range(length)
               if max(0, query - window + 1) <= key <= query]
    print(query, allowed)`, '0 [0]\n1 [0, 1]\n2 [1, 2]\n3 [2, 3]\n4 [3, 4]','把 window 从 2 改成 3，预测 query=4 能读什么。','query=4 读取 [2,3,4]。窗口计入当前位置，不允许未来；这只演示掩码，不证明实现已经节省了计算或缓存。'),
ex('lora','全量矩阵与低秩增量怎样相加？',['lora','parameters','sft'],`# W has shape [4,3]; rank=1. No training in this example.
W = [[1,0,0], [0,1,0], [0,0,1], [1,1,1]]
x = [1,2,3]
A = [[1,0,-1]]
B = [[0.1], [0.2], [0.3], [0.4]]
scale = 1.0  # alpha / rank
base = [sum(w * v for w, v in zip(row, x)) for row in W]
ax = sum(a * v for a, v in zip(A[0], x))
adapted = [y + scale * row[0] * ax for y, row in zip(base, B)]
print('base:', base)
print('adapted:', [round(v, 2) for v in adapted])
print('W parameters:', 4 * 3, 'adapter:', 1 * 3 + 4 * 1)`, 'base: [1, 2, 3, 6]\nadapted: [0.8, 1.6, 2.4, 5.2]\nW parameters: 12 adapter: 7','把 scale 改成 0，再改成 2，预测输出。','scale=0 返回基座 [1,2,3,6]；scale=2 得 [0.6,1.2,1.8,4.4]。这里的 A/B 是手填的，真实训练需用 loss 学习它们。'),
ex('loss-mask','只给回答算分，分母是谁？',['loss-mask','loss-reduction','sft'],`losses = [5.0, 4.0, 1.0, 3.0]
mask = [0, 0, 1, 1]  # two prompt tokens, two answer tokens
count = sum(mask)
assert count > 0, "there must be supervised tokens"
loss = sum(v * m for v, m in zip(losses, mask)) / count
print(f"supervised={count}, loss={loss:.2f}")`, 'supervised=2, loss=2.00','把 mask 改成 [1,1,1,1]，再试 [0,0,0,0]。','全监督的均值为 3.25；全零应报错或被训练器显式跳过，不能悄悄除零。mask 不改变模型是否能读取 prompt。'),
ex('accumulation','为什么不能直接平均各批均值？',['gradient-accumulation','loss-reduction','microbatch-ddp'],`means = [2.0, 5.0]
counts = [3, 1]  # effective supervised tokens
naive = sum(means) / len(means)
weighted = sum(m * n for m, n in zip(means, counts)) / sum(counts)
print(f"naive={naive:.2f}, token_mean={weighted:.2f}")`, 'naive=3.50, token_mean=2.75','把 counts 改成 [2,2]，预测两种平均是否一致。','两种均值都为 3.5。不同微批有效 token 数不同，等权平均会改变目标；真实梯度缩放还要结合框架的归约行为。'),
ex('return','即时奖励怎样变成折扣回报？',['discounted-return','reward','policy-gradient'],`rewards = [1.0, 0.0, 2.0]
gamma = 0.5
returns, future = [], 0.0
for reward in reversed(rewards):
    future = reward + gamma * future
    returns.append(future)
returns.reverse()
baseline = 1.0
print('returns:', returns)
print('advantages:', [r - baseline for r in returns])`, 'returns: [1.5, 1.0, 2.0]\nadvantages: [0.5, 0.0, 1.0]','把 gamma 改成 1，预测三个回报。','回报变成 [3,2,2]。这是有限三步、结尾未来价值为零的例子；被截断但未终止的轨迹可能要 bootstrap。'),
ex('ppo','PPO 裁剪为什么要看优势正负？',['ppo','grpo'],`epsilon = 0.2
for ratio, advantage in [(1.5, 2.0), (1.5, -2.0), (0.5, -2.0)]:
    clipped = min(max(ratio, 1 - epsilon), 1 + epsilon)
    objective = min(ratio * advantage, clipped * advantage)
    print(f"ratio={ratio:.1f}, A={advantage:.1f}, objective={objective:.1f}")`, 'ratio=1.5, A=2.0, objective=2.4\nratio=1.5, A=-2.0, objective=-3.0\nratio=0.5, A=-2.0, objective=-1.6','把 epsilon 改成 0，先手算三个 objective。','结果为 2、-3、-2。此处展示要最大化的单样本替代目标；实际训练通常最小化其负值，还有采样、价值估计等流程。'),
ex('state','有限状态怎样保留和忘掉历史？',['ssm','recurrent-state','kda'],`inputs = [2.0, 0.0, 0.0]
decay, state = 0.5, 0.0
for value in inputs:
    state = decay * state + value
    print(f"state={state:.2f}")`, 'state=2.00\nstate=1.00\nstate=0.50','把 decay 改成 1，再改成 0，比较状态。','decay=1 一直保留 2；decay=0 后两步立即归零。这是标量递推直觉，不是完整 Mamba 或 KDA 的矩阵状态、门控及训练实现。'),
ex('flow','沿速度场走，步长意味着什么？',['flow-matching','numerical-integration','sampling'],`# Constant velocity field: x(t)=2t, from x(0)=0 to x(1)=2.
steps, x = 4, 0.0
velocity = 2.0
dt = 1.0 / steps
for step in range(steps):
    x += dt * velocity
    print(f"t={(step+1)*dt:.2f}, x={x:.2f}")`, 't=0.25, x=0.50\nt=0.50, x=1.00\nt=0.75, x=1.50\nt=1.00, x=2.00','将 steps 改为 2，终点会变吗？','仍到达 2，因为速度恰好恒定。真实学习到的速度随时间和位置变化，减少积分步数一般会改变误差，不能由此推断两步生成总是足够。'),
ex('cfg','条件引导是怎样外推的？',['cfg','diffusion'],`unconditional, conditional = 2.0, 5.0
for scale in [0.0, 1.0, 2.0]:
    guided = unconditional + scale * (conditional - unconditional)
    print(f"scale={scale:.1f}, output={guided:.1f}")`, 'scale=0.0, output=2.0\nscale=1.0, output=5.0\nscale=2.0, output=8.0','把 conditional 改成 -1，预测三次输出。','得到 2、-1、-4。引导放大条件相对无条件的方向；数值更大或更远不意味着质量更好，且不同代码可能采用不同 scale 定义。'),
ex('metrics','PSNR 与困惑度分别看什么？',['psnr','perplexity','metric-benchmark'],`import math
mse, max_value = 0.01, 1.0
nll = math.log(4)
psnr = 10 * math.log10(max_value**2 / mse)
ppl = math.exp(nll)
print(f"PSNR={psnr:.2f} dB")
print(f"PPL={ppl:.2f}")`, 'PSNR=20.00 dB\nPPL=4.00','把 mse 改成 0.001，nll 改成 log(2)，分别预测指标。','PSNR 变 30dB，PPL 变 2。二者的输入、单位和任务不同，不能直接比大小；MSE=0 时 PSNR 为无穷，需要显式处理边界。'),
ex('cache','KV cache 为什么随上下文增长？',['kv-cache','context-window'],`layers, batch, kv_heads, head_dim, bytes_per_value = 2, 1, 2, 4, 2
for tokens in [8, 16]:
    size = 2 * layers * batch * tokens * kv_heads * head_dim * bytes_per_value
    print(f"tokens={tokens}, KV bytes={size}")`, 'tokens=8, KV bytes=512\ntokens=16, KV bytes=1024','把 batch 改成 2，预测两次缓存大小。','分别变成 1024 和 2048 字节。这里只计算普通逐 token K/V 的有效载荷；不包含权重、激活、分配开销，也不直接适用于压缩缓存等其他设计。'),
ex('ema','EMA 教师怎样平滑学生变化？',['ema','dino'],`teacher = 0.0
momentum = 0.9
for student in [10.0, 10.0, 0.0]:
    teacher = momentum * teacher + (1 - momentum) * student
    print(f"teacher={teacher:.2f}")`, 'teacher=1.00\nteacher=1.90\nteacher=1.71','把 momentum 改成 0，再改成 0.99。','0 时教师立即等于学生；0.99 时约为 [0.10,0.20,0.20]，变化更慢。EMA 本身并不能防止表示坍塌。')
];
export const examplesForConcept=id=>conceptExamples.filter(ex=>ex.conceptIds.includes(id));
