"""Original, synthetic instruction/answer pairs for a mentored LoRA experiment.

No model is trained here. Each semantic command and all its paraphrases belong
to exactly one split. These grid commands are data examples, not robot control.
"""
import json


DIRECTIONS = [("左", "left"), ("右", "right"), ("前", "forward"), ("后", "backward")]
TEMPLATES = ["向{direction}移动{steps}格", "请往{direction}走{steps}格", "让机器人朝{direction}移动{steps}格"]


def build_dataset():
    splits = {"train": [], "validation": [], "test": []}
    for direction_index, (chinese, english) in enumerate(DIRECTIONS):
        for steps in range(1, 9):
            # Split by meaning before creating alternative phrasings.
            bucket = (direction_index + steps) % 8
            split = "test" if bucket == 0 else "validation" if bucket == 1 else "train"
            response = json.dumps(
                {"action": "move", "direction": english, "steps": steps},
                ensure_ascii=False, separators=(",", ":"),
            )
            for template in TEMPLATES:
                instruction = template.format(direction=chinese, steps=steps)
                splits[split].append({
                    "group": f"{english}:{steps}",
                    "instruction": instruction,
                    "prompt": f"将机器人移动指令转换为 JSON，只输出 action、direction、steps 三个字段。\n指令：{instruction}\n动作：",
                    "response": response,
                })
    return splits


def inspect_splits(splits):
    """Check generated labels and semantic-group separation without training."""
    groups = {}
    for name, rows in splits.items():
        groups[name] = {row["group"] for row in rows}
        for row in rows:
            answer = json.loads(row["response"])
            assert set(answer) == {"action", "direction", "steps"}
            assert answer["action"] == "move"
            assert row["group"] == f'{answer["direction"]}:{answer["steps"]}'
            assert row["prompt"].endswith("动作：")
            assert row["response"] not in row["prompt"]
    for left, right in [("train", "validation"), ("train", "test"), ("validation", "test")]:
        assert not groups[left] & groups[right], f"Semantic command overlap: {left}/{right}"
    return {name: {"examples": len(rows), "command_groups": len(groups[name])} for name, rows in splits.items()}
