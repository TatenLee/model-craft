# 深入项目工作坊：运行、实现与验收

网页入口 `#/projects` 中有 10 个工作坊、50 个里程碑。这里补充执行细节。原有16关帮助理解单个机制；完整项目要求你把数据、实现、实验、诊断和交付串起来。每一步可拆成多次30分钟，不要求一口气读完全部材料。

## 先选路径与时间

核心建议顺序为 P01 语言模型 → P06 世界模型 → P02 SFT/LoRA → P04 视觉 → P07 状态/KDA → P09 系统 → P10 OmniFM。核心项目预算合计106小时，再留约20小时机制练习与补课。三个月需要约每周10–11小时；每天只有半小时时延长周期。P03偏好、P05生成、P08规划额外约32小时。

时间预算不代表熟练度或录用保证。真实数据、多卡调试、模型下载和排队可能延长进度。每个项目的核心交付是能重跑、能解释、能修改并验证，而不是页面勾选数量。

## 环境和文件位置

在仓库根目录（代码包解压根目录）运行：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r projects/requirements.txt
python projects/advanced-labs/test_labs.py
```

已有环境直接激活。进阶小实验默认 **CPU、单线程、固定 seed**。没有自动使用公司 GPU，也不会下载模型权重。结果写入你显式传入的 `--out`；已有目录会拒绝覆盖。课程统一使用 `.openai/local/`，由 `.gitignore` 排除。

- `report.json`：配置、Python/PyTorch版本、源码文件哈希、指标与实验范围。
- `weights.pt`：部分实验保存权重；**不是完整续训 checkpoint**。完整优化器恢复练习在 `world-lab`。
- `samples.svg`：Flow实验的实际生成样本图，由 Matplotlib 绘制。
- 浏览器：工作坊记录随学习备份导出；上传查看的报告只留当前页面内存，不发送服务器，也不自动认证训练发生。

源码与输出路径在本地报告中可能包含本机路径，公开分享前按自己的授权范围处理。下载包仅包含教学源代码，不含运行输出、公司源码、配置值或权重。

## 让自己的代码真正参与实验

复制 `student_ops.py` 后实现三个接口；也可直接在自己的分支编辑它。每个项目单独检查，无需先学完其他算法：

```bash
python projects/advanced-labs/check_ops.py --task dpo --submission projects/advanced-labs/student_ops.py
python projects/advanced-labs/check_ops.py --task flow --submission projects/advanced-labs/student_ops.py
python projects/advanced-labs/check_ops.py --task quant --submission projects/advanced-labs/student_ops.py
```

未实现代码应报 `NotImplementedError`，这是正常的起点。参考在 `common.py`；先独立尝试，再对照。检查不仅看数值，还看梯度、极端值、dtype与误差界。通过之后把 `--ops projects/advanced-labs/student_ops.py` 传给对应训练/评测脚本，实验就实际调用你的函数。省略 `--ops` 则运行参考实现，报告的配置会保留区别。

## P03：DPO偏好实验

```bash
python projects/advanced-labs/preference.py --steps 150 --beta 0.5 --out .openai/local/dpo-clean
python projects/advanced-labs/preference.py --steps 150 --label-noise 0.3 --out .openai/local/dpo-noisy
# 完成学生接口后：
python projects/advanced-labs/preference.py --steps 150 --ops projects/advanced-labs/student_ops.py --out .openai/local/dpo-mine
```

按顺序读代码：

1. `make_data`：上下文是目标的方向，chosen/rejected是同一上下文的两个动作。训练标签噪声只作用于训练集。
2. `reference`：复制初始策略，冻结并退出训练模式。验证时也用同一固定参考计算 KL。
3. `log_softmax`：先得到完整动作概率分布，再提取 chosen/rejected。不是对任意未经归一化的分数假称 logp。
4. `dpo_loss`：策略log odds减参考log odds，再乘beta、取稳定负log-sigmoid。初始相等时loss为log(2)。
5. `evaluate`：独立上下文的偏好准确率与KL。loss下降、偏好提升、KL大小分别回答不同问题。

至少做干净/噪声标签和两个beta对照。不要预设beta与KL一定单调。这里是离散动作策略；迁移语言模型要额外实现回答区域序列logp、长度口径、padding、基座与adapter、生成质量检查。它不是完整RLHF或PPO复现。

## P04：视觉塔与位置读出

```bash
python projects/advanced-labs/vision.py --encoder cnn --pool spatial --out .openai/local/vision-cnn
python projects/advanced-labs/vision.py --encoder random-frozen --pool spatial --out .openai/local/vision-random
python projects/advanced-labs/vision.py --encoder cnn --pool mean --out .openai/local/vision-mean
```

先读 `images`，确认 `[B,3,24,24]` 像素与 `[B,2]` 位置。训练和验证使用独立随机流；颜色偏移集与验证的位置完全相同，只把红通道目标变蓝。然后读 `CNN.forward`：特征被池化为4×4空间格或1×1均值，flatten后送线性头。

`cnn` 训练编码器和头；`random-frozen` 冻结随机CNN并缓存特征，只训练线性头。这两者均不是DINO。需要真正DINO时，先按官方仓库安装匹配依赖、取得已授权的 ViT-S/16 权重，再显式提供本地路径：

```bash
python projects/advanced-labs/vision.py --encoder dinov3 --pool spatial \
  --dino-repo /path/to/trusted/dinov3 \
  --dino-weights /path/to/authorized/dinov3_vits16_weights.pth \
  --out .openai/local/vision-dino
```

代码以 `source='local'` 加载指定checkout，取 `x_norm_patchtokens`；缩放到224并使用明确通道归一化。CPU提取可能较慢，缓存只在进程内；需要持久特征缓存时必须保存权重、预处理与数据版本。这个DINO分支未在本次本机试跑中验证，不能用CNN的分数代替。

实验报告至少同时包含：feature_dim、可训练参数、原分布MSE、颜色偏移MSE和零位置基线。池化改变空间信息也改变头部参数量，若要单独归因空间信息，继续补等容量或固定编码器实验。

## P05：Flow Matching

```bash
python projects/advanced-labs/flow.py --steps 150 --sample-steps 30 --out .openai/local/flow-reference
python projects/advanced-labs/flow.py --steps 150 --ops projects/advanced-labs/student_ops.py --out .openai/local/flow-mine
```

先在纸上算 `xt=(1-t)x0+t*x1`、`u=x1-x0`。训练输入 `[x,y,t]`、输出二维速度。训练不断采样新配对；验证配对固定且独立。采样从固定随机噪声开始，用Euler积分，不会读取真实终点。

看 `samples.svg` 的两簇是否都覆盖，再看左右占比与距离模式中心0.75内的比例。这个比例不能单独防止坍塌到两个点，因此还要检查簇内散布、与目标分布的差异。**验证速度MSE与生成质量不是同一个指标。**

比较采样步数时，应加载同一weights并只重跑采样部分。参考CLI每次从头训练，虽然固定seed可重现，最清晰的扩展仍是自己拆出 `sample.py --checkpoint ...`，加上固定噪声和模型配置验证。条件生成、CFG、图像DiT、Diffusion Policy都属于迁移作业，未实现前不要写成已完成。

## P08：世界模型用于规划

```bash
python projects/world-lab/lab.py --arch mlp --observation full --steps 100 --out .openai/local/planning-model
python projects/advanced-labs/planning.py --checkpoint .openai/local/planning-model/checkpoint.pt --out .openai/local/mpc-h6
python projects/advanced-labs/planning.py --checkpoint .openai/local/planning-model/checkpoint.pt --horizon 12 --out .openai/local/mpc-h12
```

先看 `transition`：它是环境事实。`choose` 分别用真实动力学或学习模型预测候选序列，最后按终点位置误差与动作代价选择第一步动作。执行该动作后重新规划。16个固定场景、12个实际控制步；零动作、随机动作、oracle MPC、learned MPC共用场景和可比随机流。

oracle不是全局最优控制上界，它仍受候选搜索、horizon与成本限制。部分场景下学习模型可能偶然取得更低终点MSE，因此要同时检查成功率、多种子和逐场景轨迹。当前规划器只支持完整观测MLP；GRU/Transformer需要正确传递候选分支的历史与state，不能复用这份无状态接口。

这是合成环境控制项目。真实机器人还需要观测时延、控制频率、动作边界、任务重置、硬件与系统接口的独立验证。

## P09：缓存与量化

```bash
python projects/advanced-labs/cache.py --length 64 --out .openai/local/cache64
python projects/advanced-labs/cache.py --length 128 --out .openai/local/cache128
python projects/advanced-labs/cache.py --length 64 --ops projects/advanced-labs/student_ops.py --out .openai/local/cache-mine
```

`Attention.forward` 先做QKV投影，缓存K/V并计算query的绝对位置偏移。重点手画前缀3个token、新块2个token的可见性，说明为什么新query不能继续从位置0算mask。`compare`检查整段与缓存输出；测试还覆盖一次输入多token的新chunk。

先通过等价检查，再看warmup后的CPU中位计时。实验是单层注意力、固定embedding、无位置编码、无完整语言模型生成，也没有服务请求/网络/排队。因此不能称作TTFT或TPOT基准。

`quantize_rows` 实现int8存储和FP32 scale；报告同时统计scale开销和反量化误差。它没有int8 matmul kernel，不能声称获得量化推理加速。真正GPU实验还要核对kernel、精度、吞吐和任务质量。

## 看懂失败，才算完成关键部分

本机首轮参考试跑（seed=42、CPU、上述默认预算）观察到：DPO偏好准确率约0.402→0.988；CNN原分布位置MSE约0.00063，换颜色约0.228；缓存最大输出误差约1.2e-7。这些是特定教学任务的运行观察，不是目标分数、通用性能或你的个人成绩。并行试跑会干扰计时，不据此宣布加速。

规划的终点MSE和成功率排序也可能不同。不要急着挑一个更好看的指标：先解释成本与成功定义、场景分组和候选搜索。Flow采样仍可能落在两簇之间，这是诊断与改进的起点。

| 现象 | 先收集什么 | 下一次只改变什么 |
| --- | --- | --- |
| loss不动 | 有效标签、梯度范数、参数变化 | 固定一个小batch验证拟合 |
| 训练好、验证差 | episode划分、重复样本、输入分布 | 修正一种划分或去掉一种捷径 |
| 单步准、rollout差 | horizon曲线、预测接回的位置 | 固定模型改变评测喂入方式 |
| 优化更快、质量下降 | 目标、mask、dtype、数值偏差 | 回退一个优化开关再对齐 |
| 缓存输出不一致 | offset、mask、reset、位置编码 | 先在短序列逐位置比较 |
| 报告和现实不符 | 命令、版本、split、原始日志 | 重跑最小可证伪例子 |

## 交接单与作品验收

每次记录：问题与假设 → 具体改动 → 代码/数据/依赖版本 → 命令与预算 → 全部结果 → 失败解释 → 下一步。网页每个里程碑都提供这个记录区与下载交接单。

每个最终作品至少能回答：你亲手实现了什么；为什么需要它；最小基线是什么；什么对照支持结论；哪些测试保护正确性；什么结果推翻过你的想法；在哪些场景还不能使用。P10再将这些方法迁移到一个真实OmniFM run。

通过网页自查、读完参考答案、运行参考脚本，分别只是不同证据。算法岗位能力需要独立实现、实验判断和故障处理，不能仅由项目数量或页面完成率推断。
