# 追踪一个小模型的成长

对应书籍第四卷第六章。仅需 Python 3 标准库，无模型下载或 GPU。

在仓库根目录（或下载包解压根目录）运行：

```bash
python3 projects/lifecycle-lab/lifecycle.py --out .openai/local/lifecycle
python3 projects/lifecycle-lab/lifecycle.py --domain-share 0.8 --out .openai/local/lifecycle-80
python3 -m unittest discover -s projects/lifecycle-lab -p 'test_*.py'
```

程序保存四个 JSON 快照及 report.json。base 学一般文本；mixed 和 domain_only 从同一个 base 出发，以相同新增转移计数权重比较配比；task_demo 从 mixed 增加任务格式示范。逐域 NLL 在固定评测字符串上计算，报告明确谱系、混合参数、样本数与预算单位。JSON 可重载后用 `nll` 复算。

先预测领域收益与通用退化，再运行。表格至少列阶段、父节点、通用/领域/任务 NLL、参数表大小、预算。记录一个与预期不符的现象；若没有，写明这一数据范围无法反驳什么。

这是加平滑的一阶字符计数模型，只看前一个字符。计数权重模拟数据混合，没有反向传播、优化器、回答 mask、完整 SFT 或 RL。task_demo 只能说明任务格式分布适配，不证明指令遵循。教学字符串有相似模式，不能当真实泛化基准。真实梯度预训练与 SFT/LoRA 接 P01/P02 实战；禁止把这个实验的最佳配比直接外推到大模型。
