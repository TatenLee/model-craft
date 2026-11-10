# 一个机器人，逐步增加能力

这是网页 `#/journey` 的同一个参考工程：从传感器的 `wx+b` 标定开始，经过非线性预测、动作条件世界模型、记忆、视觉接口、规划，连接到有限任务循环。每站都说明已有能力、失败、原因、改动文件、检查和下一次需求。

它是 **一维桌面滑台的教学系统**。当前真正学习的是标定模型与动态模型；语言模块是明确标注的规则基线，视觉模块是合成条带上的质心基线。DINO、真实语言基座、完整 KDA、动作生成模型与多卡是对应模块的进阶接入任务，不冒充已经完成的实现。

## 首次安装

在仓库根目录，或解压下载包后的根目录执行：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r projects/requirements.txt
cd projects/robot-workbench
python -m robot.cli scalar
```

后续命令均在 `projects/robot-workbench/` 运行。初始 `scalar` 子命令只使用标准库；神经网络实验需要 PyTorch。默认产物位于仓库/下载包根目录下 `.openai/local/robot-workbench/`，已被 Git 忽略。换实验时用 `--out` 指定不同目录，避免覆盖原报告和 checkpoint。

## 目录按职责划分

```text
robot/
  contracts.py          观测、目标、模型与大脑接口
  environment.py        合成环境；真实转移与模型预测分开
  data.py               独立 episode、时间对齐、full / partial 观测
  models/
    scalar.py           wx+b、手写更新、同一标定任务上的 linear / MLP
    dynamics.py         同一 world 接口的 linear / MLP / GRU / causal Transformer
    perception.py       解析质心视觉基线，未来视觉塔在此适配
    brain.py            闭集任务规则基线，未来语言模型在此适配
  training/
    supervised.py       训练、验证、配置、checkpoint、优化器与 RNG 恢复
    distill.py          两领域学生轨迹上的多教师蒸馏机制实验
  planning.py           学习世界模型 + random-shooting MPC
  agent.py              目标进度、观察、动作、验证、预算与失败日志
  evaluation.py         一步预测与自由 rollout 分开评测
  cli.py                组装模块的统一入口
  tests.py              数值、因果、状态、恢复与闭环检查
```

所有文件是完整参考实现，方便先跑出结果再拆解。学习时每站只打开标出的文件，可在自己的分支改造对应函数，保留基线。网页 Python 题训练关键接口，并不自动覆盖本地文件；把自己的实现接入工程后还需运行检查。复用已有模块可以省掉内部重造，接口与任务验收仍需完成。

## 依次遇到的问题与命令

1. **读数不等于坐标。**先做标定；再从误差更新参数。

   ```bash
   python -m robot.cli scalar
   ```

   输入 `[-1,0,1,2]`、目标 `[-1,1,3,5]`，应学到接近 `w=2,b=1`。保留输入 `[0.5,1.5]` 的输出应接近 `[2,4]`。

2. **直线表达不了弯曲标定。**保持任务与验证位置，替换模型内部。

   ```bash
   python -m robot.cli calibrate --model linear --steps 400
   python -m robot.cli calibrate --model mlp --steps 400
   python -m robot.cli calibrate --model mlp --steps 400 --width 12
   ```

   数据为 `2x+1+0.5x²`。报告参数量、训练和保留位置误差；MLP 默认 width=24，改为 12 或 48 可只比较宽度。此处是同域插值，不能宣称分布外泛化。此时还没有动作或世界模型。

3. **动作改变未来。**开始训练 `world(obs, actions, state)`，首次可直接使用默认输出目录。

   ```bash
   python -m robot.cli train --arch mlp --observation full --steps 400
   ```

   `full` 提供位置和速度；环境的下一状态取决于两者及动作。输出 `world.pt` 与 `report.json`。预测、真实环境公式和评测分开，不能用环境真值冒充模型预测。

4. **单帧位置看不出速度。**固定部分观测，对照 MLP、GRU 和因果 Transformer。分别保存，避免覆盖供 MPC 使用的 full MLP。

   ```bash
   python -m robot.cli train --arch mlp --observation partial --steps 400 --out ../../.openai/local/robot-workbench/partial-mlp
   python -m robot.cli train --arch gru --observation partial --steps 400 --out ../../.openai/local/robot-workbench/partial-gru
   python -m robot.cli train --arch transformer --observation partial --steps 400 --out ../../.openai/local/robot-workbench/partial-transformer
   ```

   比较一步与 rollout 曲线；不预设某个名字必然胜出。GRU 分段处理需要延续状态，独立 episode 要 reset。Transformer 的未来扰动不能改变前缀输出。

5. **语言与相机是不同接口。**先分别跑通透明基线。

   ```bash
   python -m robot.cli plan --instruction '先去红色，再去蓝色'
   python -m robot.cli observe
   ```

   前者只返回目标列表，没有执行动作。规则基线拒绝否定句及未知目标；后者只计算合成条带的质心，不是 DINO。真实基座的 SFT/LoRA 见相邻 `robot-lora/` 项目，需额外实现并验收 `plan` 适配器；真实视觉权重见 `advanced-labs/vision.py` 的迁移说明。

6. **用预测选择动作，再用环境确认。**执行当前 full MLP + MPC + 规则大脑 + 质心视觉的完整组合。

   ```bash
   python -m robot.cli agent --instruction '先去红色，再去蓝色'
   python -m robot.cli agent --instruction '去红色' --stuck --budget 5 --out ../../.openai/local/robot-workbench/stuck.json
   ```

   观察 `planned`、`completed`、`success`、`events`。成功必须来自真实观测的目标距离与速度阈值；卡住应有限终止并返回失败。默认单一场景结果不是泛化成功率。本 planner 明确只支持 **full-state linear/MLP**，GRU/Transformer 必须增加候选历史/状态适配后再接，代码会拒绝不兼容配置。

7. **多个教师整合能力。**先理解学生采样、领域归属和教师打分。

   ```bash
   python -m robot.cli distill --steps 200
   ```

   使用两个领域、三动作、两步轨迹；教师是解析且冻结的分布，学生是小参数表。学生采样自己的第一步，老师在同一个前缀上评分。损失是学生访问状态上的全分布 reverse KL，不对离散访问路径求导，**不是完整序列策略梯度算法，也没有领域 RL 或语言模型训练**。报告按领域的 KL 与轨迹；进一步复现需使用 [MOPD 原论文](https://arxiv.org/abs/2606.30406) 和 [Open-MOPD](https://github.com/BytedTsinghua-SIA/Open-MOPD) 的真实训练与评测协议。

8. **续训必须是同一条轨迹。**配置、优化器、步数和 RNG 一起恢复。

   ```bash
   python -m robot.cli train --arch mlp --steps 20 --out ../../.openai/local/robot-workbench/resume
   python -m robot.cli train --arch mlp --steps 40 --out ../../.openai/local/robot-workbench/resume --resume ../../.openai/local/robot-workbench/resume/world.pt
   python -m unittest robot.tests
   ```

   测试比较连续训练与中断恢复的参数，并检查错误配置被拒绝。例子只用 CPU，未验证 GPU 跨版本确定性、分布式恢复或生产性能。

## 迁移到 OmniFM

把真实仓库的 dataset、encoder、mixer、head、loss、optimizer、state、planner/agent 和 eval 对应到上面的职责。先找实际启动配置，再追一条 batch 与一次更新；模块“存在”不等于“本次启用”。不复制公司源码、配置、样本或权重到公开工程。

工程模块替换时，保持输入语义与评测固定；如果单位、shape、mask、状态或目标改变，就显式改适配层并重新验收。下一项研究由失败证据驱动，不要求先复现全部结构目录。
