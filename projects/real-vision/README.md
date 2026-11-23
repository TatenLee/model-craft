# 第一项：真实图片上的训练、诊断与迭代

完成目标：把 CIFAR-10 图片分为十类。最终交付的不只是一个权重，而是数据检查、线性/CNN 对照、失败样例、恢复与独立评测。这个入门项目先练算法工程共同工作；不把它包装成大模型或机器人项目。

网页入口：`#/practice/vision-baseline`。建议按五个任务推进，每次 30–120 分钟，卡住才回查概念。不要一次下载全路线的所有数据。

## 任务 1：下载并确认一条样本

1. 打开 [官方 CIFAR 页面](https://www.cs.toronto.edu/~kriz/cifar.html)，选择 **CIFAR-10 binary version**，文件名 `cifar-10-binary.tar.gz`，约 162 MB。你自行下载；训练器不会连接网络。
2. 放在仓库/解压根目录的 `.openai/local/data/`，不必解压。
3. [HF 数据集卡](https://huggingface.co/datasets/uoft-cs/cifar10)可浏览样本；本脚本输入不是 HF Parquet，也不是 CIFAR Python 版。
4. 在独立环境中安装 PyTorch 与 NumPy。以下是 CPU/Mac 的开始方式；CUDA 安装按 [PyTorch 官方选择器](https://pytorch.org/get-started/locally/)匹配驱动，不把 CPU wheel 当 GPU 环境。

```bash
python3 -m venv .openai/local/vision-env
source .openai/local/vision-env/bin/activate
python -m pip install torch numpy
python -m pip freeze > .openai/local/vision-environment.txt
python projects/real-vision/train.py inspect --data .openai/local/data/cifar-10-binary.tar.gz
```

预期看到 shape `[50000,3,32,32]`、uint8、0–255、十类各 5000 条，以及独立官方测试集 10000 条。脚本核对官方二进制包 MD5，并记录 SHA256。它只在内存读固定文件，不解压、不执行 pickle。

打开 `train.py`，先只看四处：`read_data` 解释原始字节，`split_indices` 解释开发划分，`tensor` 做数值归一化，`Classifier` 定义预测程序。一条记录首字节是标签，后面三个 1024 字节平面是 RGB；如果错当 RGBRGB 顺序，图像结构就错了。

训练数据先固定分为 40000/10000 开发训练/验证。默认只用其中 5000/1000，原始索引存在 `split_indices.npz`。官方 test 留到方案确定后；修改 seed 会改变开发划分，比较模型时保持不变。

**动手**：写出输入、输出、标签各自 shape。解释为什么标签 3 和 4 不表示“数值距离 1 的两个对象”。保存 inspect 输出；没有这份数据契约先不训练。

## 任务 2：线性模型作为基线

```bash
python projects/real-vision/train.py train --data .openai/local/data/cifar-10-binary.tar.gz --arch linear --epochs 5 --seed 42 --out .openai/local/real-vision/linear
```

CPU 默认；可加 `--device mps` 或 `--device cuda`，前提是你环境实际支持。未测过你的硬件，不预报运行分钟数或显存。

逐个对应：图片归一化 → 3072 维向量 → 十个 logits → 交叉熵 → backward → AdamW.step。每条 epoch 日志包含 train/val loss、accuracy 和整轮秒数。计时包含验证与同步，不是服务吞吐测评。

检查 `report.json`：`initial_or_resume_validation` 是开始或恢复时的模型；`majority_validation_accuracy` 是只猜训练集多数类的基线。随机模型与多数类接近偶然正确水平，但有限子集不保证恰好 10%。

**验收**：保留初始/训练后/多数类三组结果。不设一个凭空的合格准确率；首先确认训练过程确实改变参数、loss 有意义、模型不只是多数类预测。

## 任务 3：只把模型换成 CNN

```bash
python projects/real-vision/train.py train --data .openai/local/data/cifar-10-binary.tar.gz --arch cnn --epochs 5 --seed 42 --out .openai/local/real-vision/cnn
```

两次使用相同划分、子集、epoch、batch 和学习率。CNN 利用局部图像结构，但参数量和 FLOPs 不同；报告中不要写成严格等计算预算对比。

逐层 shape：`[B,3,32,32] → [B,32,32,32] → [B,32,16,16] → [B,64,16,16] → [B,64,8,8] → [B,4096] → [B,128] → [B,10]`。

**你改代码**：把第一层输出通道 32 改为 16，同时修改第二层输入通道，另存实验。先写下预期：中间激活与参数减少；质量不一定同方向变化。不要同时改学习率、epoch 和数据。

网页本项目底部可导入 `report.json` 画训练/验证曲线，只在本机读取。`confusion_true_rows_pred_cols` 的行是真实类、列是预测类；`mistakes.subset_index` 是本次验证子集索引，结合 `split_indices.npz` 找回原图。

想看到自己模型错判的图片，运行下面的命令，再用浏览器打开生成的 `errors.html`。这是实际 checkpoint 在固定验证子集上的前 20 个错误，原图 32×32 放大显示；文件不连接外部服务。

```bash
python projects/real-vision/train.py evaluate --data .openai/local/data/cifar-10-binary.tar.gz --checkpoint .openai/local/real-vision/cnn/best.pt --split validation --error-gallery .openai/local/real-vision/cnn/errors.html
```

**验收**：至少解释两种错误，如猫/狗混淆和背景捷径。训练 loss 小、验证 loss 大不能独自证明“数据不够”，还需排查容量、划分、实现与分布。

## 任务 4：人为制造失败

```bash
python projects/real-vision/train.py train --data .openai/local/data/cifar-10-binary.tar.gz --arch cnn --epochs 5 --shuffle-labels --out .openai/local/real-vision/shuffled
python projects/real-vision/train.py train --data .openai/local/data/cifar-10-binary.tar.gz --arch cnn --epochs 30 --train-size 128 --out .openai/local/real-vision/small
```

第一条只打乱训练标签，真实验证标签不变；第二条用小样本检查能否过拟合。先预测，再运行。记住随机标签仍可能被容量足够的网络记住；这不表示学到了正确分类规律。不要对两个数据规模不同的命令宣称单因素模型比较。

排错顺序：能读对样本吗 → logits/label shape 对吗 → loss/梯度有限吗 → optimizer 更新了谁 → 小样本能拟合吗 → 独立验证如何。需要解释时回网页的 loss、数据划分和泛化词条。

## 任务 5：恢复、最终测试与交付

```bash
python projects/real-vision/train.py train --data .openai/local/data/cifar-10-binary.tar.gz --arch cnn --epochs 8 --resume .openai/local/real-vision/cnn/last.pt --out .openai/local/real-vision/cnn-resumed
python projects/real-vision/train.py evaluate --data .openai/local/data/cifar-10-binary.tar.gz --checkpoint .openai/local/real-vision/cnn/best.pt --split validation
# 选定配置后才运行，并保存输出；不要反复据 test 调参。
python projects/real-vision/train.py evaluate --data .openai/local/data/cifar-10-binary.tar.gz --checkpoint .openai/local/real-vision/cnn/best.pt --split test
```

`--epochs 8` 是总轮数，从已保存 5 轮继续到第 8 轮。恢复锁定数据指纹、架构、学习率、seed、batch、子集、标签实验与设备；改变这些应创建明确的新实验。本简单网络没有 dropout/随机增强，每轮排列由 seed+epoch 确定，CPU 恢复等价性有自动测试；这不是所有复杂训练都能省略 RNG 状态的理由。GPU 不承诺位级一致。

`last.pt` 保存优化器与当前轮，`best.pt` 按开发验证 loss 选择。恢复到新目录时复制同目录的旧 best（若存在），不要删除来源最佳模型。只加载你自己或可信来源的 checkpoint。新运行拒绝覆盖非空目录。

网页第五步后已内嵌这个 Coding 的 Python 编辑器、样例、提示和完整检查；先在线实现，再复制回训练器。

**最后一处 Coding**：在混淆矩阵上实现每类召回率 `TP / support`；用一个手工 3×3 矩阵验证，支持数为零的类别返回空值。把结果接进 report，而不是只写一个永远返回 1 的函数。

交付清单：命令和依赖；数据哈希与划分；三个主要对照；checkpoint；独立测试；两类失败图片及解释；一次被证据否定的猜想；下一次最小实验。你可以把 `report.json` 和最困惑的错误发回对话，下一步依据你的真实结果推进。

## 已完成的验证与边界

`test_train.py` 使用明确标为合成夹具的二分类图像，验证梯度学习、权重重载、CPU 续训一致性、划分不重叠、二进制读取和错误配置拒绝。**这不是 CIFAR-10 成绩**。本次没有下载你的数据，没有运行真实 CIFAR 训练，也没有测 MPS/CUDA。代码未加入增强、scheduler、分布式、实验平台；它们是有基线以后按证据扩展的模块。

```bash
python -m unittest discover -s projects/real-vision -p 'test_*.py'
```
