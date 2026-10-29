# Model Craft 原创 Python 练习；使用标准库，Python 3.9+。

# 一次梯度更新究竟改变了什么
def gradient_step(w, b, xs, ys, lr):
    # 先用旧参数计算所有误差，再更新两个参数。
    raise NotImplementedError("计算 loss、dw、db 并返回新参数")


# 让模型看不到未来
def causal_mask(length, valid_length=None):
    raise NotImplementedError("逐行判断 key 是否位于未来或补齐区域")


# 稳定地计算交叉熵
import math

def cross_entropy(logits, target):
    raise NotImplementedError("稳定计算 logsumexp(logits) - logits[target]")


# 累积梯度时应该怎样平均
def weighted_gradient(chunks):
    raise NotImplementedError("先恢复梯度和，再按总有效数量归一化")


# 亲手构造 LoRA 更新
def lora_update(W, A, B, alpha):
    raise NotImplementedError("先核对形状，再计算低秩增量")


# 按轨迹切分，避免时间泄漏
def split_episodes(records, train_fraction=0.8):
    raise NotImplementedError("先确定整条 episode 的归属，再分配其中的记录")


# 记忆仍在，梯度历史可以截断
def scan_memory(values, resets, detaches, decay=0.5):
    raise NotImplementedError("分别维护状态数值和历史长度")


# 测量连续预测的误差积累
def evaluate_rollout(initial, actions, targets, predictor):
    raise NotImplementedError("将预测状态持续反馈，并按预测长度记录误差")
