#!/usr/bin/env python3
"""Model Craft: a small causal language model on an original synthetic corpus.

Python 3.9+ and PyTorch 2.4+. No model download, network access or private data.
Example: python tiny_lm.py --steps 120 --output runs/tiny_lm.pt
The generated text is a learning diagnostic, not a useful language assistant.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import string
import time
from pathlib import Path


def arguments():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--steps", type=int, default=120)
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--learning-rate", type=float, default=0.003)
    p.add_argument("--device", choices=["cpu", "mps", "cuda"], default="cpu")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--log-every", type=int, default=20)
    p.add_argument("--output", type=Path, help="Optional checkpoint path; no files without this option")
    args = p.parse_args()
    if min(args.steps, args.batch_size, args.threads, args.log_every) < 1 or args.learning_rate <= 0:
        p.error("steps, batch size, threads, log interval and learning rate must be positive")
    return args


def corpus(seed):
    # Every complete sentence belongs to exactly one split.
    subjects = ["the robot", "a student", "the teacher", "a visitor", "the scientist"]
    verbs = ["moves", "finds", "observes", "carries"]
    objects = ["a red box", "a blue cube", "a green ball", "a small cup", "a yellow toy"]
    places = ["near the door", "on the table", "in the room", "beside the chair"]
    texts = [f"{s} {v} {o} {p}.\n" for s in subjects for v in verbs for o in objects for p in places]
    random.Random(seed).shuffle(texts)
    cut = int(0.8 * len(texts))
    return texts[:cut], texts[cut:]


def main():
    args = arguments()
    try:
        import torch
        from torch import nn
        from torch.nn import functional as F
    except ImportError:
        raise SystemExit("PyTorch is required: python -m pip install -r requirements.txt")

    torch.set_num_threads(args.threads)
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    if args.device == "cuda" and not torch.cuda.is_available():
        raise SystemExit("CUDA is unavailable; use --device cpu")
    if args.device == "mps" and not torch.backends.mps.is_available():
        raise SystemExit("MPS is unavailable; use --device cpu")
    device = torch.device(args.device)
    sampler = random.Random(args.seed + 101)
    pad, bos, eos, unk = 0, 1, 2, 3
    vocab = ["<PAD>", "<BOS>", "<EOS>", "<UNK>"] + list(string.ascii_lowercase + " .\n")
    token_id = {token: i for i, token in enumerate(vocab)}
    train_texts, valid_texts = corpus(args.seed)
    encode = lambda text: [bos] + [token_id.get(c, unk) for c in text] + [eos]
    train_data = [encode(s) for s in train_texts]
    valid_data = [encode(s) for s in valid_texts]
    assert not set(train_texts).intersection(valid_texts)
    config = {"vocab_size": len(vocab), "d_model": 64, "heads": 4, "layers": 2, "context": 128}

    class TinyLM(nn.Module):
        def __init__(self):
            super().__init__()
            self.token = nn.Embedding(config["vocab_size"], config["d_model"], padding_idx=pad)
            self.position = nn.Embedding(config["context"], config["d_model"])
            layer = nn.TransformerEncoderLayer(
                d_model=config["d_model"], nhead=config["heads"], dim_feedforward=128,
                dropout=0.1, activation="gelu", batch_first=True, norm_first=True,
            )
            self.blocks = nn.TransformerEncoder(layer, config["layers"], enable_nested_tensor=False)
            self.norm = nn.LayerNorm(config["d_model"])
            self.head = nn.Linear(config["d_model"], config["vocab_size"])

        def forward(self, tokens):
            length = tokens.shape[1]
            if length > config["context"]:
                raise ValueError("Sequence exceeds context")
            positions = torch.arange(length, device=tokens.device)
            hidden = self.token(tokens) + self.position(positions)[None, :, :]
            # Bool True blocks future attention; PAD is also excluded as a key.
            blocked = torch.triu(torch.ones(length, length, dtype=torch.bool, device=tokens.device), diagonal=1)
            hidden = self.blocks(hidden, mask=blocked, src_key_padding_mask=tokens.eq(pad))
            return self.head(self.norm(hidden))

    def batch(rows):
        length = max(map(len, rows))
        tensor = torch.full((len(rows), length), pad, dtype=torch.long, device=device)
        for i, row in enumerate(rows):
            tensor[i, :len(row)] = torch.tensor(row, dtype=torch.long, device=device)
        return tensor[:, :-1], tensor[:, 1:]

    model = TinyLM().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.01)
    warmup_steps = min(20, max(1, args.steps // 10))

    @torch.no_grad()
    def evaluate():
        model.eval()
        loss_sum, count, correct = 0.0, 0, 0
        for start in range(0, len(valid_data), args.batch_size):
            x, y = batch(valid_data[start:start + args.batch_size])
            logits = model(x)
            loss_sum += float(F.cross_entropy(logits.reshape(-1, len(vocab)), y.reshape(-1), ignore_index=pad, reduction="sum"))
            valid = y.ne(pad)
            count += int(valid.sum())
            correct += int(((logits.argmax(-1) == y) & valid).sum())
        loss = loss_sum / count
        return {"validation_loss": loss, "validation_perplexity": math.exp(loss), "token_accuracy": correct / count}

    print(json.dumps({"device": str(device), "parameters": sum(p.numel() for p in model.parameters()),
                      "train_sentences": len(train_data), "validation_sentences": len(valid_data),
                      "seed": args.seed, "task": "synthetic grammar next-character prediction"}))
    metrics = [{"step": 0, **evaluate()}]
    print(json.dumps(metrics[-1]))
    started = time.perf_counter()
    for step in range(1, args.steps + 1):
        model.train()
        x, y = batch([train_data[sampler.randrange(len(train_data))] for _ in range(args.batch_size)])
        progress = max(0.0, (step - warmup_steps) / max(1, args.steps - warmup_steps))
        factor = step / warmup_steps if step <= warmup_steps else 0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * progress))
        for group in optimizer.param_groups:
            group["lr"] = args.learning_rate * factor
        optimizer.zero_grad(set_to_none=True)
        logits = model(x)
        loss = F.cross_entropy(logits.reshape(-1, len(vocab)), y.reshape(-1), ignore_index=pad)
        if not torch.isfinite(loss):
            raise FloatingPointError("Non-finite loss")
        loss.backward()
        grad_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0, error_if_nonfinite=True)
        optimizer.step()
        if step % args.log_every == 0 or step == args.steps:
            record = {"step": step, "training_batch_loss": float(loss.detach()), "lr": optimizer.param_groups[0]["lr"],
                      "gradient_norm_before_clip": float(grad_norm), "elapsed_seconds": time.perf_counter() - started,
                      **evaluate()}
            metrics.append(record)
            print(json.dumps(record), flush=True)

    model.eval()
    prompt = "the robot "
    tokens = torch.tensor([[bos] + [token_id[c] for c in prompt]], device=device)
    generated = prompt
    with torch.no_grad():
        for _ in range(80):
            logits = model(tokens[:, -config["context"]:])[:, -1, :]
            logits[:, [pad, bos, unk]] = -float("inf")
            next_id = int(torch.multinomial(torch.softmax(logits / 0.8, -1), 1).item())
            if next_id == eos:
                break
            generated += vocab[next_id]
            tokens = torch.cat([tokens, torch.tensor([[next_id]], device=device)], dim=1)
    print("Generated sample:", repr(generated))
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(), "config": config,
                    "step": args.steps, "vocab": vocab, "seed": args.seed, "torch_rng_state": torch.get_rng_state(),
                    "sampler_state": sampler.getstate(), "schedule": {"kind": "warmup_cosine", "warmup_steps": warmup_steps,
                    "total_steps": args.steps, "base_lr": args.learning_rate}, "metrics": metrics,
                    "training_args": {k: str(v) if isinstance(v, Path) else v for k, v in vars(args).items()}}, args.output)
        args.output.with_suffix(".metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
        print("Saved:", args.output)


if __name__ == "__main__":
    main()
