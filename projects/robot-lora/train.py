"""Small response-only SFT experiment. Downloads the explicitly chosen base model."""
import argparse
import json
from pathlib import Path
import random
import time

import torch
from data import build_dataset, inspect_splits
from mechanics import response_labels


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", required=True, help="Local model path or HF model ID, e.g. Qwen/Qwen2.5-0.5B")
    p.add_argument("--mode", choices=["baseline", "full", "lora"], required=True)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--steps", type=int, default=40)
    p.add_argument("--batch-size", type=int, default=1)
    p.add_argument("--lr", type=float, default=0.0001)
    p.add_argument("--rank", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--threads", type=int, default=1)
    p.add_argument("--device", choices=["cpu", "mps", "cuda"], default="cpu")
    p.add_argument("--test", action="store_true")
    args = p.parse_args()
    if args.steps < 0 or args.batch_size < 1 or args.lr <= 0 or args.rank < 1 or args.threads < 1:
        p.error("invalid steps, batch size, learning rate or rank")
    if args.out.exists():
        p.error("use a new output directory for each experiment")
    from transformers import AutoModelForCausalLM, AutoTokenizer
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    rng = random.Random(args.seed)
    splits = build_dataset()
    inspect_splits(splits)
    tokenizer = AutoTokenizer.from_pretrained(args.base)
    if tokenizer.eos_token_id is None:
        raise ValueError("this exercise requires an EOS token")
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(args.base).to(device=args.device, dtype=torch.float32)
    model.config.use_cache = False
    if args.mode == "lora":
        from peft import LoraConfig, get_peft_model
        model = get_peft_model(model, LoraConfig(task_type="CAUSAL_LM", r=args.rank,
                    lora_alpha=args.rank * 2, lora_dropout=0.0, target_modules=["q_proj", "v_proj"]))
    records = []
    for row in splits["train"]:
        prompt = tokenizer.encode(row["prompt"], add_special_tokens=False)
        answer = tokenizer.encode(row["response"], add_special_tokens=False)
        records.append(response_labels(prompt, answer, tokenizer.eos_token_id))
    trainable = [p for p in model.parameters() if p.requires_grad]
    history = []
    started = time.perf_counter()
    if args.mode != "baseline":
        optimizer = torch.optim.AdamW(trainable, lr=args.lr)
        model.train()
        for step in range(args.steps):
            samples = [rng.choice(records) for _ in range(args.batch_size)]
            size = max(len(ids) for ids, _ in samples)
            ids = torch.tensor([x + [tokenizer.pad_token_id] * (size - len(x)) for x, _ in samples], device=args.device)
            labels = torch.tensor([y + [-100] * (size - len(y)) for _, y in samples], device=args.device)
            mask = torch.tensor([[1] * len(x) + [0] * (size - len(x)) for x, _ in samples], device=args.device)
            optimizer.zero_grad(set_to_none=True)
            # Labels are unshifted. The causal LM shifts them inside its loss.
            loss = model(input_ids=ids, labels=labels, attention_mask=mask).loss
            if not torch.isfinite(loss):
                raise FloatingPointError("nonfinite SFT loss")
            loss.backward()
            torch.nn.utils.clip_grad_norm_(trainable, 1.0, error_if_nonfinite=True)
            optimizer.step()
            if step == 0 or (step + 1) % 10 == 0:
                history.append({"step": step + 1, "loss": loss.item()})
                print(history[-1], flush=True)
    training_seconds = time.perf_counter() - started
    model.eval()
    metrics, predictions = {}, {}
    for name in (["validation", "test"] if args.test else ["validation"]):
        predictions[name] = []
        valid, correct = 0, 0
        for row in splits[name]:
            inputs = tokenizer(row["prompt"], return_tensors="pt", add_special_tokens=False).to(args.device)
            with torch.inference_mode():
                result = model.generate(**inputs, max_new_tokens=96, do_sample=False, use_cache=True,
                                        pad_token_id=tokenizer.pad_token_id, eos_token_id=tokenizer.eos_token_id)
            output = tokenizer.decode(result[0, inputs.input_ids.shape[1]:], skip_special_tokens=True).strip()
            try:
                parsed = json.loads(output)
                good = (isinstance(parsed, dict) and set(parsed) == {"action", "direction", "steps"}
                        and parsed["action"] == "move" and parsed["direction"] in {"left", "right", "forward", "backward"}
                        and type(parsed["steps"]) is int and 1 <= parsed["steps"] <= 8)
                exact = good and parsed == json.loads(row["response"])
            except (ValueError, TypeError):
                good, exact = False, False
            valid += int(good)
            correct += int(exact)
            predictions[name].append({"instruction": row["instruction"], "expected": row["response"], "output": output, "correct": bool(exact)})
        metrics[name] = {"count": len(splits[name]), "schema_valid": valid, "exact_match": correct}
    args.out.mkdir(parents=True)
    if args.mode != "baseline":
        model.save_pretrained(args.out / "model")
        tokenizer.save_pretrained(args.out / "model")
    report = {"schema": "model-craft-sft-v1", "base": args.base, "mode": args.mode, "seed": args.seed,
              "steps": 0 if args.mode == "baseline" else args.steps, "lr": args.lr, "batch_size": args.batch_size,
              "rank": args.rank if args.mode == "lora" else None,
              "trainable_parameters": 0 if args.mode == "baseline" else sum(x.numel() for x in trainable),
              "total_parameters": sum(x.numel() for x in model.parameters()),
              "train_seconds": training_seconds, "metrics": metrics, "history": history, "predictions": predictions}
    (args.out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
