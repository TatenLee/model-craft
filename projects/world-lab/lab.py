"""An original, small action-conditioned world model. No company code or data."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import time

import torch
from torch import nn


def episodes(count, length, seed, observation="partial", drag=0.8):
    """Split by whole trajectories; no adjacent-frame random splitting."""
    rng = torch.Generator().manual_seed(seed)
    x = torch.rand(count, 1, generator=rng) * 2 - 1
    v = torch.rand(count, 1, generator=rng) * 0.6 - 0.3
    states = [torch.cat([x, v], -1)]
    actions = torch.randint(-1, 2, (count, length, 1), generator=rng).float()
    for t in range(length):
        v = drag * v + 0.2 * actions[:, t]
        x = x + v
        states.append(torch.cat([x, v], -1))
    states = torch.stack(states, 1)
    observed = states if observation == "full" else states[..., :1]
    return observed, actions


class WorldModel(nn.Module):
    def __init__(self, arch="mlp", observation="partial", width=32):
        super().__init__()
        self.arch = arch
        self.obs_dim = 2 if observation == "full" else 1
        self.project = nn.Linear(self.obs_dim + 1, width)
        if arch == "mlp":
            self.core = nn.Sequential(nn.Tanh(), nn.Linear(width, width), nn.Tanh())
        elif arch == "gru":
            self.core = nn.GRU(width, width, batch_first=True)
        elif arch == "transformer":
            layer = nn.TransformerEncoderLayer(width, 4, width * 2, dropout=0.0,
                                               batch_first=True, activation="gelu")
            # EncoderLayer is a PyTorch block name. The causal mask below makes
            # this a decoder-only sequence predictor, without cross attention.
            self.core = nn.TransformerEncoder(layer, 2, enable_nested_tensor=False)
        else:
            raise ValueError(arch)
        self.head = nn.Linear(width, self.obs_dim)

    def forward(self, obs, actions, state=None):
        h = self.project(torch.cat([obs, actions], -1))
        next_state = None
        if self.arch == "transformer":
            t, width = h.shape[1:]
            positions = torch.arange(t, device=h.device).float()[:, None]
            rates = torch.exp(torch.arange(0, width, 2, device=h.device).float()
                              * (-math.log(10000) / width))
            pe = torch.zeros(t, width, device=h.device)
            pe[:, 0::2], pe[:, 1::2] = torch.sin(positions * rates), torch.cos(positions * rates)
            mask = torch.ones(t, t, device=h.device, dtype=torch.bool).triu(1)
            h = self.core(h + pe, mask=mask)
        elif self.arch == "gru":
            h, next_state = self.core(h, state)
        else:
            h = self.core(h)
        return obs + self.head(h), next_state


@torch.inference_mode()
def evaluate(model, data, device="cpu", warmup=4, horizon=8):
    model.eval()
    obs, actions = (t.to(device) for t in data)
    pred, _ = model(obs[:, :-1], actions)
    one_step = (pred - obs[:, 1:]).square().mean().item()
    history = obs[:, :warmup].clone()
    errors, persistence = [], []
    for k in range(horizon):
        t = warmup - 1 + k
        next_obs, _ = model(history, actions[:, :t + 1])
        prediction = next_obs[:, -1:]
        errors.append((prediction - obs[:, t + 1:t + 2]).square().mean().item())
        persistence.append((obs[:, warmup - 1] - obs[:, t + 1]).square().mean().item())
        history = torch.cat([history, prediction], 1)
    return {"one_step_mse": one_step, "rollout_mse": sum(errors) / horizon,
            "rollout_by_horizon": errors, "persistence_rollout_mse": sum(persistence) / horizon}


def synchronize(device):
    if device == "cuda":
        torch.cuda.synchronize()
    elif device == "mps":
        torch.mps.synchronize()


@torch.inference_mode()
def benchmark(model, data, device):
    """Warm, batch=1 full-prefix latency; this is NOT cached decoding TTFT."""
    model.eval()
    obs, actions = (t[:1].to(device) for t in data)
    for _ in range(5):
        model(obs[:, :-1], actions)
    synchronize(device)
    samples = []
    for _ in range(20):
        start = time.perf_counter()
        model(obs[:, :-1], actions)
        synchronize(device)
        samples.append((time.perf_counter() - start) * 1000)
    samples.sort()
    return {"batch": 1, "context": actions.shape[1], "mode": "full_prefix_no_cache",
            "p50_ms": samples[9], "p95_ms": samples[18]}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--arch", choices=["mlp", "transformer", "gru"], default="mlp")
    p.add_argument("--observation", choices=["full", "partial"], default="full")
    p.add_argument("--steps", type=int, default=100, help="Total desired optimizer steps, including resumed steps")
    p.add_argument("--width", type=int, default=32)
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--lr", type=float, default=0.003)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--device", choices=["cpu", "mps", "cuda"], default="cpu")
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--resume", type=Path)
    p.add_argument("--test", action="store_true", help="Evaluate held-out test/OOD only after configuration selection")
    args = p.parse_args()
    if args.steps < 0 or args.batch_size < 1 or args.width < 4 or args.width % 4 or args.lr <= 0:
        p.error("steps >= 0, batch >= 1, width a positive multiple of 4, lr > 0 required")
    checkpoint_path = args.out / "checkpoint.pt"
    if checkpoint_path.exists() and args.resume is None:
        p.error("output already contains a checkpoint; use a new output or --resume")
    torch.set_num_threads(1)
    torch.manual_seed(args.seed)
    config = {k: getattr(args, k) for k in ["arch", "observation", "width", "batch_size", "lr", "seed"]}
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    model = WorldModel(args.arch, args.observation, args.width).to(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
    sampler = torch.Generator().manual_seed(args.seed + 7)
    train = episodes(128, 16, args.seed, args.observation)
    validation = episodes(32, 16, args.seed + 10000, args.observation)
    start_step = 0
    if args.resume:
        # Only load checkpoints created by this lab and trusted by the learner.
        ckpt = torch.load(args.resume, map_location="cpu", weights_only=True)
        if ckpt["config"] != config or ckpt["source_sha256"] != source_hash:
            raise ValueError("resume requires identical config and source; use a separate experiment for changes")
        model.load_state_dict(ckpt["model"])
        optimizer.load_state_dict(ckpt["optimizer"])
        sampler.set_state(ckpt["sampler_rng"])
        torch.set_rng_state(ckpt["torch_rng"])
        start_step = ckpt["step"]
        if start_step > args.steps:
            raise ValueError("--steps cannot precede checkpoint step")
    before = evaluate(model, validation, args.device)
    synchronize(args.device)
    started = time.perf_counter()
    history = []
    for step in range(start_step, args.steps):
        model.train()
        idx = torch.randint(len(train[0]), (args.batch_size,), generator=sampler)
        obs, actions = (t[idx].to(args.device) for t in train)
        optimizer.zero_grad(set_to_none=True)
        pred, _ = model(obs[:, :-1], actions)
        loss = (pred - obs[:, 1:]).square().mean()
        if not torch.isfinite(loss):
            raise FloatingPointError("nonfinite loss")
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0, error_if_nonfinite=True)
        optimizer.step()
        if step == start_step or (step + 1) % 20 == 0:
            history.append({"step": step + 1, "train_mse": loss.item()})
    synchronize(args.device)
    seconds = time.perf_counter() - started
    after = evaluate(model, validation, args.device)
    args.out.mkdir(parents=True, exist_ok=True)
    torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(),
                "config": config, "step": args.steps, "torch_rng": torch.get_rng_state(),
                "sampler_rng": sampler.get_state(), "source_sha256": source_hash}, checkpoint_path)
    report = {"schema": "model-craft-world-v1", "config": config, "device": args.device,
              "torch_version": str(torch.__version__), "source_sha256": source_hash,
              "step": args.steps, "start_step": start_step,
              "split": {"unit": "episode", "train_seed": args.seed, "validation_seed": args.seed + 10000},
              "parameters": sum(p.numel() for p in model.parameters()),
              "train_seconds_this_invocation": seconds, "before": before, "validation": after,
              "history": history, "latency": benchmark(model, validation, args.device)}
    if args.test:
        report["test"] = evaluate(model, episodes(32, 16, args.seed + 20000, args.observation), args.device)
        report["ood_drag_0_95"] = evaluate(model, episodes(32, 16, args.seed + 30000, args.observation, 0.95), args.device)
    (args.out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
