# Model Craft 编码与训练实验

这里的代码均为教学实现，使用公开机制和原创合成数据，不包含 OmniFM 或古琴项目的源码、数据或权重。浏览器里的八个练习只依赖 Python 标准库；两个训练脚本需要 PyTorch。所有曲线和日志都由运行计算产生。

## 1. 在本地完成浏览器练习

把 `exercise_starters.py`、`check_exercises.py` 和 `exercises.json` 放在同一目录。填写一个函数后运行：

```bash
python3 check_exercises.py exercise_starters.py --exercise causal-mask
```

省略 `--exercise` 会检查全部 8 个练习、40 个断言。`exercise_solutions.py` 是可选择查看的参考实现，建议先写自己的预测和代码：

```bash
python3 check_exercises.py exercise_solutions.py
```

练习 ID 依次为 `gradient-step`、`causal-mask`、`stable-cross-entropy`、`weighted-accumulation`、`lora-update`、`episode-split`、`memory-boundary`、`rollout-error`。通过测试说明这些受检行为正确，仍需解释机制和边界条件。

## 2. 建立独立训练环境

建议 Python 3.10 或更新版本；代码语法兼容 Python 3.9，实际 PyTorch wheel 支持随版本和平台变化。先创建项目自己的环境：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

默认 CPU 即可开始。支持 MPS 的 Mac 可显式传 `--device mps`；配置了兼容 CUDA PyTorch 的 GPU 机器可传 `--device cuda`。两个脚本均不下载模型或数据。脚本不会自动选择 GPU，也不会自动安装依赖。

## 3. 微型因果语言模型

```bash
python tiny_lm.py --steps 120 --seed 42 --output runs/tiny_lm.pt
```

脚本生成 400 条不同的英文模板句，按完整句子分为 320 条训练句和 80 条验证句。词表固定为英文字母、标点和特殊符号；任务是下一个字符预测。模型为两层小型因果 Transformer，使用 AdamW、warmup/cosine 学习率、梯度裁剪，并忽略 PAD 的监督损失。

日志包括训练 batch loss、验证集平均交叉熵、perplexity、非 PAD token 准确率和梯度范数。输出示例文本只是辅助观察，不能替代留出评测。验证句与训练句不重复，但来自同一模板生成分布，因此结果不能说明自然语言泛化能力。

建议实验：固定数据与 seed，仅改变学习率；记录早期稳定性和验证损失。然后使用另一 seed 复核关键结论。不要只挑最好看的输出。

## 4. 动作条件世界模型

```bash
python tiny_world_model.py --steps 300 --horizon 20 --seed 42 --output runs/world.pt
```

环境使用二维状态、二维动作和光滑的非线性转移规则。训练与验证使用不同随机种子生成的整条轨迹，再仅将训练轨迹展开为单步样本。模型预测状态增量，初始预测与保持原状态的 persistence 基线相同。

日志同时报告：

- 使用真实当前状态的单步 MSE。
- 连续反馈自身预测的 rollout MSE，以及逐 horizon 误差。
- 保持初始状态的 persistence 基线。
- 将动作在验证轨迹间打乱后的 rollout 误差，作为检查条件使用的辅助实验。验证轨迹只有一条时这个检查无效。

建议实验：保持训练预算不变，比较不同 horizon 下的误差；再尝试去掉动作输入，检查任务是否仍可被模型充分解决。这个二维环境只验证机制，不代表真实机器人性能或物理泛化。

## 5. 保存与复现

只有传入 `--output` 时才写入 checkpoint 和同名 `.metrics.json`。checkpoint 包含模型、优化器、结构配置、step、数据种子/词表、CPU RNG 等信息。语言模型另存采样器状态和学习率计划。当前脚本没有 `--resume` 功能；这些字段供后续续训课程使用，并不宣称在不同硬件或后端上能精确恢复。未保存 GPU RNG 也限制了精确 GPU 续训。

每份实验报告至少包含：假设、代码版本、完整命令、数据划分、资源与耗时、训练/验证指标、失败样例、对照结果、局限与下一次实验。
