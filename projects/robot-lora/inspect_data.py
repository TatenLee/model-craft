#!/usr/bin/env python3
"""First mentored session: inspect one SFT example. Python standard library only."""
import json
from data import build_dataset, inspect_splits


def main():
    splits = build_dataset()
    print("第 1 步：观察任务和标注（尚未加载或训练模型）")
    print(json.dumps(inspect_splits(splits), ensure_ascii=False, indent=2))
    example = next(row for row in splits["train"] if row["instruction"] == "向左移动2格")
    print("\n【推理时提供给模型的条件】")
    print(example["prompt"])
    print("\n【训练时提供的标准回答】")
    print(example["response"])
    print("\n这里的回答是我们生成的标注，不是模型生成的结果。")
    print("训练后会分别检查：能否解析为 JSON、三个字段是否正确、未见过的指令组合是否成功。")
    print("\n今天先讨论：如果标注把 left 错写成 right，训练会倾向于学到什么？")


if __name__ == "__main__":
    main()
