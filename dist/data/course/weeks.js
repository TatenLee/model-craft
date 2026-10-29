export const weekMetadata = [
  {
    "id": 1,
    "title": "把训练看清楚",
    "subtitle": "从一份样本到一次参数更新",
    "phase": "基础训练",
    "hours": 10,
    "goal": "用一个小模型理解参数、更新与独立评测，不预设任何大模型术语知识。",
    "deliverable": "一个可观察的训练循环和你的第一份实验笔记。",
    "lessonIds": [
      "w1-l1",
      "w1-l2",
      "w1-l3"
    ]
  },
  {
    "id": 2,
    "title": "拆开 Transformer",
    "subtitle": "Attention、因果关系与逐步生成",
    "phase": "基础训练",
    "hours": 10,
    "goal": "能跟踪张量形状，并解释模型为什么能或不能看到某个位置。",
    "deliverable": "关键 Attention 实现与一次信息泄漏排错。",
    "lessonIds": [
      "w2-l1",
      "w2-l2",
      "w2-l3"
    ]
  },
  {
    "id": 3,
    "title": "预训练一个小模型",
    "subtitle": "让数据真正改变模型",
    "phase": "基础训练",
    "hours": 10,
    "goal": "完成数据到 checkpoint 的可复现小规模语言模型训练。",
    "deliverable": "微型语言模型基线、配置和验证报告。",
    "lessonIds": [
      "w3-l1",
      "w3-l2",
      "w3-l3"
    ]
  },
  {
    "id": 4,
    "title": "学会诊断训练",
    "subtitle": "用证据区分问题来源",
    "phase": "基础训练",
    "hours": 10,
    "goal": "从 loss、梯度、样例和资源曲线提出可检验的解释。",
    "deliverable": "一次故障修复、一次资源测量和阶段考试。",
    "lessonIds": [
      "w4-l1",
      "w4-l2",
      "w4-l3"
    ]
  },
  {
    "id": 5,
    "title": "让模型适应任务",
    "subtitle": "SFT、LoRA 与偏好反馈",
    "phase": "跨模态理解",
    "hours": 10,
    "goal": "区分监督形式、参数更新方式、奖励和优化算法。",
    "deliverable": "小型 SFT/LoRA 对照与偏好损失追踪。",
    "lessonIds": [
      "w5-l1",
      "w5-l2",
      "w5-l3"
    ]
  },
  {
    "id": 6,
    "title": "看懂视觉表示",
    "subtitle": "从像素到视觉 token",
    "phase": "跨模态理解",
    "hours": 10,
    "goal": "解释视觉塔、对齐、压缩与连接层的不同职责。",
    "deliverable": "图像前向路径图和冻结参数检查。",
    "lessonIds": [
      "w6-l1",
      "w6-l2",
      "w6-l3"
    ]
  },
  {
    "id": 7,
    "title": "理解图像生成",
    "subtitle": "AR、Diffusion 与 Flow Matching",
    "phase": "跨模态理解",
    "hours": 10,
    "goal": "把网络主干、学习目标和采样过程分别说清。",
    "deliverable": "二维生成实验、采样比较与奖励评测记录。",
    "lessonIds": [
      "w7-l1",
      "w7-l2",
      "w7-l3"
    ]
  },
  {
    "id": 8,
    "title": "建立一个世界模型",
    "subtitle": "环境状态、动作与未来",
    "phase": "世界模型实践",
    "hours": 12,
    "goal": "训练动作条件动态模型，并评价多步泛化而非只看单步误差。",
    "deliverable": "二维环境世界模型、基线与第二次阶段考试。",
    "lessonIds": [
      "w8-l1",
      "w8-l2",
      "w8-l3"
    ]
  },
  {
    "id": 9,
    "title": "理解 KDA 与记忆",
    "subtitle": "状态延续、梯度截断与数据边界",
    "phase": "世界模型实践",
    "hours": 12,
    "goal": "区分递归记忆的持续时间和梯度传播的范围。",
    "deliverable": "跨块记忆实验与 OmniFM 源码追踪。",
    "lessonIds": [
      "w9-l1",
      "w9-l2",
      "w9-l3"
    ]
  },
  {
    "id": 10,
    "title": "从预测到行动",
    "subtitle": "策略、VLA 与闭环控制",
    "phase": "世界模型实践",
    "hours": 12,
    "goal": "将世界模型、策略和规划器放进同一个具身系统中。",
    "deliverable": "小型行为克隆实验及闭环成功率分析。",
    "lessonIds": [
      "w10-l1",
      "w10-l2",
      "w10-l3"
    ]
  },
  {
    "id": 11,
    "title": "设计算法对照实验",
    "subtitle": "把直觉变成可验证的假设",
    "phase": "世界模型实践",
    "hours": 12,
    "goal": "选择一个训练问题，控制变量并记录可复现证据。",
    "deliverable": "专项实验的基线、变体、数据账本和初步结论。",
    "lessonIds": [
      "w11-l1",
      "w11-l2",
      "w11-l3"
    ]
  },
  {
    "id": 12,
    "title": "形成转岗作品",
    "subtitle": "复现、答辩与下一轮研究",
    "phase": "世界模型实践",
    "hours": 12,
    "goal": "独立解释项目的建模选择、实现、证据和局限。",
    "deliverable": "可复现报告、核心代码与三类模拟面试。",
    "lessonIds": [
      "w12-l1",
      "w12-l2",
      "w12-l3"
    ]
  }
];
