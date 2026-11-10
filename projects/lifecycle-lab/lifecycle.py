"""A standard-library stage comparison, NOT a Transformer or full SFT trainer.

An additive character bigram model isolates data-distribution effects. Task
demonstrations update transition counts; there is no answer mask or optimizer.
All strings below are original synthetic teaching data. Evaluation is fixed,
not sampled from the training list. Near-pattern similarity is intentional in
this small mechanism experiment; these are not real-world benchmarks.
"""
import argparse
import copy
import json
import math
import string
from pathlib import Path

TRAIN = {
    "general": ["a cat sat.", "a dog ran.", "the sun is warm.", "a bird can fly."],
    "domain": ["motor torque rises.", "robot joint moves.", "sensor reads force.", "torque controls motion."],
    "task": ['q:red a:{"move":"red"}', 'q:blue a:{"move":"blue"}', 'q:stop a:{"move":"stop"}'],
}
EVAL = {
    "general": ["the cat ran.", "a bird sat."],
    "domain": ["motor joint torque.", "robot sensor force."],
    "task": ['q:red a:{"move":"stop"}', 'q:blue a:{"move":"red"}'],
}
# Fixed alphabet is declared independently of held-out samples.
VOCAB = list(string.ascii_lowercase + ' .:{}"') + ["<s>", "</s>"]


def new_model():
    return {"vocab": VOCAB, "alpha": 0.1,
            "counts": [[0.0 for _ in VOCAB] for _ in VOCAB]}


def pairs(text):
    tokens = ["<s>", *text, "</s>"]
    return list(zip(tokens, tokens[1:]))


def add_distribution(model, strings, budget):
    """Allocate exactly budget transition weight, regardless of string length."""
    if not math.isfinite(budget) or budget < 0:
        raise ValueError("budget must be finite and nonnegative")
    transitions = [p for text in strings for p in pairs(text)]
    if not transitions:
        raise ValueError("empty data")
    index = {token: i for i, token in enumerate(model["vocab"])}
    increment = budget / len(transitions)
    for left, right in transitions:
        model["counts"][index[left]][index[right]] += increment


def nll(model, strings):
    index = {token: i for i, token in enumerate(model["vocab"])}
    result = []
    for text in strings:
        for left, right in pairs(text):
            row = model["counts"][index[left]]
            probability = (row[index[right]] + model["alpha"]) / (
                sum(row) + len(row) * model["alpha"])
            result.append(-math.log(probability))
    if not result:
        raise ValueError("empty evaluation")
    return sum(result) / len(result)


def generate(model, prefix="a", length=35):
    index = {token: i for i, token in enumerate(model["vocab"])}
    text = prefix
    for _ in range(length):
        left = text[-1] if text else "<s>"
        row = model["counts"][index[left]]
        # Exclude <s> from generation; deterministic tie-breaking by vocabulary.
        allowed = [i for i, token in enumerate(model["vocab"]) if token != "<s>"]
        token = model["vocab"][max(allowed, key=lambda i: row[i])]
        if token == "</s>":
            break
        text += token
    return text


def experiment(domain_share=0.5):
    if not math.isfinite(domain_share) or not 0 <= domain_share <= 1:
        raise ValueError("domain_share must be in [0,1]")
    base = new_model()
    add_distribution(base, TRAIN["general"], 400)
    mixed, domain = copy.deepcopy(base), copy.deepcopy(base)
    add_distribution(mixed, TRAIN["general"], 200 * (1 - domain_share))
    add_distribution(mixed, TRAIN["domain"], 200 * domain_share)
    add_distribution(domain, TRAIN["domain"], 200)
    task = copy.deepcopy(mixed)
    add_distribution(task, TRAIN["task"], 200)
    models = {"base": base, "mixed": mixed, "domain_only": domain, "task_demo": task}
    parents = {"base": None, "mixed": "base", "domain_only": "base", "task_demo": "mixed"}
    report = {"schema": 1, "model": "additive-character-bigram", "dataset": "original-synthetic-v1",
              "domain_share": domain_share, "budget_unit": "transition count weight (not gradient steps)",
              "limitations": "No long context, gradient optimizer, answer mask, full SFT, RL or GPU benchmark.",
              "evaluation": {k: {"strings": len(v), "transitions": sum(len(pairs(t)) for t in v)} for k, v in EVAL.items()},
              "stages": []}
    for name, model in models.items():
        report["stages"].append({"name": name, "parent": parents[name],
            "checkpoint": name + ".json", "nll": {k: nll(model, v) for k, v in EVAL.items()},
            "total_weight": sum(map(sum, model["counts"])),
            "table_entries": len(VOCAB) ** 2, "greedy_example": generate(model),
            "data_mix": {"general": 1.0} if name == "base" else
                        {"domain": 1.0} if name == "domain_only" else
                        {"task": 1.0} if name == "task_demo" else
                        {"general": 1-domain_share, "domain": domain_share}})
    return models, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--domain-share", type=float, default=0.5)
    parser.add_argument("--out", type=Path, default=Path(".openai/local/lifecycle"))
    args = parser.parse_args()
    models, report = experiment(args.domain_share)
    args.out.mkdir(parents=True, exist_ok=True)
    for name, model in models.items():
        (args.out / (name + ".json")).write_text(json.dumps(model, indent=2), encoding="utf-8")
    (args.out / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    for stage in report["stages"]:
        print(stage["name"], {k: round(v, 4) for k, v in stage["nll"].items()})
    print("Saved:", args.out / "report.json")


if __name__ == "__main__":
    main()
