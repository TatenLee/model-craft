# Model Craft 原创 Python 练习；使用标准库，Python 3.9+。

# 一次梯度更新究竟改变了什么
def gradient_step(w, b, xs, ys, lr):
    if not xs or len(xs) != len(ys) or lr < 0:
        raise ValueError("需要等长非空数据和非负学习率")
    errors = [w * x + b - y for x, y in zip(xs, ys)]
    n = len(xs)
    loss = sum(e * e for e in errors) / n
    dw = 2 * sum(e * x for e, x in zip(errors, xs)) / n
    db = 2 * sum(errors) / n
    return w - lr * dw, b - lr * db, loss


# 让模型看不到未来
def causal_mask(length, valid_length=None):
    if valid_length is None:
        valid_length = length
    if length < 0 or not 0 <= valid_length <= length:
        raise ValueError("非法序列长度")
    return [[j > i or j >= valid_length for j in range(length)]
            for i in range(length)]


# 稳定地计算交叉熵
import math

def cross_entropy(logits, target):
    if not logits or not 0 <= target < len(logits):
        raise ValueError("空输入或非法标签")
    if not all(math.isfinite(v) for v in logits):
        raise ValueError("logits 必须有限")
    m = max(logits)
    return math.log(sum(math.exp(v-m) for v in logits)) + (m-logits[target])


# 累积梯度时应该怎样平均
def weighted_gradient(chunks):
    if any(count < 0 for _, count in chunks):
        raise ValueError("有效数量不能为负")
    total = sum(count for _, count in chunks)
    if total <= 0:
        raise ValueError("没有有效监督")
    return sum(grad * count for grad, count in chunks if count > 0) / total


# 亲手构造 LoRA 更新
def lora_update(W, A, B, alpha):
    def shape(matrix):
        if not matrix or not matrix[0] or any(len(row) != len(matrix[0]) for row in matrix):
            raise ValueError("需要非空矩形矩阵")
        return len(matrix), len(matrix[0])
    m,n = shape(W)
    r,an = shape(A)
    bm,br = shape(B)
    if an != n or bm != m or br != r:
        raise ValueError("矩阵形状不匹配")
    return [[W[i][j] + alpha/r * sum(B[i][k]*A[k][j] for k in range(r))
             for j in range(n)] for i in range(m)]


# 按轨迹切分，避免时间泄漏
def split_episodes(records, train_fraction=0.8):
    if not 0 < train_fraction < 1:
        raise ValueError("比例必须位于 0 与 1 之间")
    starts = {}
    for row in records:
        episode = row["episode"]
        starts[episode] = min(starts.get(episode, row["time"]), row["time"])
    if len(starts) < 2:
        raise ValueError("至少需要两个独立 episode")
    ordered = sorted(starts, key=lambda ep: (starts[ep], str(ep)))
    cut = max(1, min(len(ordered)-1, int(len(ordered)*train_fraction)))
    train_ids = set(ordered[:cut])
    key = lambda row: (row["time"], str(row["episode"]))
    train = sorted([row for row in records if row["episode"] in train_ids], key=key)
    valid = sorted([row for row in records if row["episode"] not in train_ids], key=key)
    return train, valid


# 记忆仍在，梯度历史可以截断
def scan_memory(values, resets, detaches, decay=0.5):
    if len(values)!=len(resets) or len(values)!=len(detaches) or not 0<=decay<=1:
        raise ValueError("长度或 decay 不合法")
    state = 0.0
    history = 0
    outputs = []
    for value, reset, detach in zip(values, resets, detaches):
        if reset:
            state, history = 0.0, 0
        if detach:
            history = 0
        state = decay*state + value
        history += 1
        outputs.append((state, history))
    return outputs


# 测量连续预测的误差积累
def evaluate_rollout(initial, actions, targets, predictor):
    if len(initial)!=2 or len(actions)!=len(targets):
        raise ValueError("状态维度或序列长度错误")
    state = tuple(initial)
    predictions, errors = [], []
    for action, target in zip(actions, targets):
        if len(action)!=2 or len(target)!=2:
            raise ValueError("需要二维动作与状态")
        state = tuple(predictor(state, action))
        if len(state)!=2:
            raise ValueError("预测必须是二维状态")
        predictions.append(state)
        errors.append(sum((state[i]-target[i])**2 for i in range(2))/2)
    return {"predictions": predictions, "mse_by_step": errors,
            "mean_mse": sum(errors)/len(errors) if errors else 0.0}
