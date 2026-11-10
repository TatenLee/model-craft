# Model Craft 项目实战

当前推荐入口是网页 `#/journey` 的因果主线。先从 [robot-workbench/README.md](robot-workbench/README.md) 跑同一个机器人工程；下面各专题按主线需要展开，不要求重复从 P01 或 M01 重新走一遍。

新增 **10 个深入项目工作坊 / 50 个里程碑**，详细运行与学生代码说明见 [advanced-labs/README.md](advanced-labs/README.md)。7 个核心作品约106小时，配合机制练习；3 个扩展项目另留32小时。

在网页的「项目实战」进入带练；每关先解释具体问题，再做浏览器机制题，最后执行这里的实验。16 关与 12 周课程交替推进，不要求每天把两套课程都做完。

## 从第一条命令开始

Mac / Linux，在仓库根目录（下载代码包则在解压目录）：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r projects/requirements.txt
python projects/robot-lora/inspect_data.py
python projects/world-lab/lab.py --arch mlp --observation full --steps 100 --out .openai/local/my-first-world
```

已经有环境时直接激活，不必重复创建。`python3` / `python` 都应指向该环境。CPU 是默认；Mac 可显式用 `--device mps`，H20 可用 `--device cuda`，需先确认相应 PyTorch 环境可用。这里的试跑与恢复检查在 CPU 验证，不能等同于 GPU 验证。

输出在 `.openai/local/`，被仓库忽略：`checkpoint.pt` 保存模型/优化器/采样器状态；`report.json` 保存配置、代码哈希、验证误差、训练记录与前向延迟。网页可读取报告并帮助记录解释，不会上传文件或自动认证实验成功。新实验使用新目录，避免覆盖旧结果。

## 主线：从可手算世界到序列模型

1. 先做网页 01：位置、速度、动作 → 下一状态。规则为 `v_next=0.8*v+0.2*a; x_next=x+v_next`。
2. 网页 02：运行 `--steps 0`，保存随机模型和 persistence 基线。
3. 网页 03：训练 full-observation MLP；只改学习率，重新跑一次对照。
4. 网页 04：隐藏速度，用相同 partial 输入比较 MLP、Transformer、GRU。相同 seed、batch、步数；这不等于相同 FLOPs。
5. 网页 05：比较 teacher-forced 单步误差与 8 步闭环 rollout。只有最初 4 帧是真实历史，其余预测接回。
6. 网页 06–08：从视觉表示、目标空间、状态机制迁移到真实源码。真实 DINO 特征提取、完整 JEPA、KDA GPU kernel 实验尚需本地权重与环境；标为待做，不冒充已训练。

```bash
python projects/world-lab/lab.py --arch mlp --observation partial --steps 100 --out .openai/local/partial-mlp
python projects/world-lab/lab.py --arch transformer --observation partial --steps 100 --out .openai/local/partial-transformer
python projects/world-lab/lab.py --arch gru --observation partial --steps 100 --out .openai/local/partial-gru
python projects/world-lab/test_lab.py
```

Transformer 使用显式因果 mask，无 encoder-decoder cross attention。GRU 用于练习显式 state，它不是 KDA。规则环境完全由本项目原创教学代码生成，与真实机器人世界模型的难度和能力不同。

## 恢复与评测

`--steps` 表示训练总步数，不是“再跑多少步”。恢复需要相同模型、训练配置和脚本哈希；改变配置请建立新实验。

```bash
python projects/world-lab/lab.py --arch gru --observation partial --steps 40 --out .openai/local/resume-demo
python projects/world-lab/lab.py --arch gru --observation partial --steps 80 --out .openai/local/resume-demo --resume .openai/local/resume-demo/checkpoint.pt
```

验证集用于选配置。选择完成后才加 `--test` 运行独立测试与 `drag=0.95` 的分布外检查。反复根据测试结果选配置会破坏独立评估。合成轨迹按独立随机流生成，split 单位为 episode。已知动力学意味着不存在真实环境的传感器噪声、碰撞或复杂控制，不能将这些分数解释成机器人成功率。

full 模式预测位置与速度，MSE 平均这两个输出维度；partial 模式只预测位置。两组 MSE 口径不同，不能直接据此给模型排名。比较架构时固定 observation 模式。

训练报告的 latency 是 batch=1、context=16、warmup 后整段前向，没有 KV cache。p50/p95 不是服务端 TTFT，也未包含请求排队、网络、图像预处理。并发试跑会干扰计时，性能结论应独占资源重测。

## 支线：SFT 与 LoRA

```bash
python projects/robot-lora/mechanics.py
```

先在不下载权重的条件下检查回答 labels、真实 PyTorch LoRA 层、冻结与梯度。它只证明核心机制；不等于已经微调语言模型。

完整基座的小任务训练器为 `projects/robot-lora/train.py`。安装可选依赖后，从同一基座分别运行 baseline / full / lora：

```bash
python -m pip install -r projects/robot-lora/requirements.txt
python projects/robot-lora/train.py --base Qwen/Qwen2.5-0.5B --mode baseline --out .openai/local/text-baseline
python projects/robot-lora/train.py --base Qwen/Qwen2.5-0.5B --mode full --steps 40 --out .openai/local/text-full
python projects/robot-lora/train.py --base Qwen/Qwen2.5-0.5B --mode lora --steps 40 --out .openai/local/text-lora
```

这会下载/加载显式指定的基座；也可将 `--base` 替换成本地权重目录。代码使用 FP32 以减少教学中的精度分支，全量 AdamW 训练会占用数 GB 乃至更多内存。先小步数、batch=1 检查，再根据实测选择 Mac 或 H20。没有自动调用公司机器。首次验证默认只评 validation，选定配置后加 `--test`。模型版本、依赖版本、运行命令要随实验保留，正式复现应锁定基座 revision 或本地快照。

训练器使用 response-only loss（causal LM 内部 shift），全量更新或 q_proj/v_proj LoRA。保存的 LoRA 是 adapter，恢复使用需要对应基座；该教学脚本不包含全量训练状态恢复。优化器续训教学在 world-lab 实现。Qwen、DINO 与真实 KDA 的训练成绩不包含在交付声明内。

## 已验证环境与接口范围

本次使用 Python 3.12、PyTorch 2.15.0、Transformers 5.22.2、PEFT 0.21.2、NumPy 2.5.4；requirements 保留兼容范围，正式实验请额外保存自己的依赖锁定文件。`test_train.py` 在完全离线的随机微型 Qwen2 上跑过 baseline/full/lora 三个 CLI，检查 mask、冻结与保存 adapter；它不验证 Qwen2.5-0.5B 的效果或你的目标硬件。

```bash
python projects/robot-lora/test_train.py
```

## 本地理解 OmniFM

```bash
python projects/source-map/inspect_repo.py --repo ~/Code/OmniFM
```

默认写 `.openai/local/omnifm-map.json`。在第 16 关选择此文件，只在页面内存展示符号位置、文件哈希与 revision。工具不导入或执行目标代码，不抽取配置值、训练数据、权重或源码片段；输出仍属于本地阅读材料，不提交公开仓库。

索引是关键词匹配的候选位置，既可能漏掉代码，也可能含不相关符号。它不构造完整调用图，更不能证明实际启用了什么。跟读一条真实 batch，并逐项填出：

| 环节 | 你要留下的证据 |
| --- | --- |
| 入口与配置 | 实际 run、代码版本、有效配置；不是示例默认值 |
| 数据 | 一条样本时间关系、batch shape、划分与 mask 含义 |
| 视觉与序列 | 预处理、视觉权重、patch/pooled 特征、connector 形状 |
| 骨干与状态 | 实际类型、参数形状、state 大小、reset/detach |
| 目标与训练 | loss 分子/分母、有效 batch、梯度、optimizer/scheduler |
| 推理与恢复 | 同一数据协议、checkpoint、缓存、采样与评测 |

## 转岗作品验收

机制题通过、完整实验与岗位能力分开看。作品至少包含：可复现入口；固定数据和独立测试；最小基线；一个受控对照；参数与资源记录；恢复/因果正确性检查；失败分析；明确局限；五分钟设计讲解。多卡、视觉训练、量化服务与完整 KDA 验证是后续真实实验，不因为看过教程就算完成。

目前网页与训练之间通过文件交接，不启动后台 GPU 作业。报告、交接单和学习备份默认在本地；不需要 GPT 账号或 API Key。
