#!/usr/bin/env python3
"""Model Craft: train an action-conditioned 2D dynamics model.

Original synthetic task, disjoint training/validation episodes, no asset download.
Example: python tiny_world_model.py --steps 300 --output runs/world.pt
Reports measured single-step and free-running rollout MSE against persistence.
This is a mechanism exercise, not evidence of real-robot performance.
"""
from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path


def arguments():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--steps", type=int, default=300)
    p.add_argument("--batch-size", type=int, default=128)
    p.add_argument("--learning-rate", type=float, default=0.001)
    p.add_argument("--device", choices=["cpu", "mps", "cuda"], default="cpu")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--train-episodes", type=int, default=128)
    p.add_argument("--validation-episodes", type=int, default=32)
    p.add_argument("--horizon", type=int, default=20)
    p.add_argument("--log-every", type=int, default=50)
    p.add_argument("--output", type=Path, help="Optional checkpoint path")
    args = p.parse_args()
    if min(args.steps, args.batch_size, args.threads, args.train_episodes, args.validation_episodes,
           args.horizon, args.log_every) < 1 or args.learning_rate <= 0:
        p.error("All numeric settings must be positive")
    return args


def main():
    args = arguments()
    try:
        import torch
        from torch import nn
    except ImportError:
        raise SystemExit("PyTorch is required: python -m pip install -r requirements.txt")
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    if args.device == "cuda" and not torch.cuda.is_available():
        raise SystemExit("CUDA is unavailable; use --device cpu")
    if args.device == "mps" and not torch.backends.mps.is_available():
        raise SystemExit("MPS is unavailable; use --device cpu")
    device = torch.device(args.device)

    def transition(state, action):
        # A smooth controlled system; current action changes next state.
        coupling = torch.stack([state[..., 1].sin(), state[..., 0].sin()], dim=-1)
        return 0.92 * state + 0.30 * action.tanh() + 0.06 * coupling

    def make_episodes(count, seed):
        # A dedicated CPU RNG gives reproducible data independent of model device.
        generator = torch.Generator().manual_seed(seed)
        actions = torch.rand(count, args.horizon, 2, generator=generator) * 2 - 1
        state = torch.rand(count, 2, generator=generator) * 2 - 1
        states = [state]
        for t in range(args.horizon):
            state = transition(state, actions[:, t])
            states.append(state)
        return torch.stack(states, dim=1).to(device), actions.to(device)

    train_states, train_actions = make_episodes(args.train_episodes, args.seed + 1000)
    valid_states, valid_actions = make_episodes(args.validation_episodes, args.seed + 2000)
    xs = train_states[:, :-1].reshape(-1, 2)
    us = train_actions.reshape(-1, 2)
    ys = train_states[:, 1:].reshape(-1, 2)

    class Dynamics(nn.Module):
        def __init__(self):
            super().__init__()
            self.net = nn.Sequential(nn.Linear(4, 64), nn.Tanh(), nn.Linear(64, 64), nn.Tanh(), nn.Linear(64, 2))
            # Initially the model equals the persistence baseline; later it learns deltas.
            nn.init.zeros_(self.net[-1].weight)
            nn.init.zeros_(self.net[-1].bias)

        def forward(self, state, action):
            return state + self.net(torch.cat([state, action], dim=-1))

    model = Dynamics().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.0001)

    @torch.no_grad()
    def evaluate():
        model.eval()
        one_step = model(valid_states[:, :-1], valid_actions)
        single_mse = float((one_step - valid_states[:, 1:]).square().mean())
        predictions = []
        state = valid_states[:, 0]
        wrong_state = state
        wrong_predictions = []
        for t in range(args.horizon):
            state = model(state, valid_actions[:, t])
            predictions.append(state)
            # Roll actions across episodes; this is a condition-use diagnostic.
            wrong_state = model(wrong_state, valid_actions[:, t].roll(1, dims=0))
            wrong_predictions.append(wrong_state)
        predicted = torch.stack(predictions, dim=1)
        wrong = torch.stack(wrong_predictions, dim=1)
        targets = valid_states[:, 1:]
        persistence = valid_states[:, :1].expand_as(targets)
        by_horizon = (predicted - targets).square().mean(dim=(0, 2))
        baseline_by_horizon = (persistence - targets).square().mean(dim=(0, 2))
        return {"single_step_mse": single_mse, "rollout_mean_mse": float(by_horizon.mean()),
                "persistence_mean_mse": float(baseline_by_horizon.mean()),
                "shuffled_action_rollout_mse": float((wrong - targets).square().mean()),
                "mse_by_horizon": by_horizon.cpu().tolist(),
                "persistence_mse_by_horizon": baseline_by_horizon.cpu().tolist()}

    print(json.dumps({"device": str(device), "seed": args.seed, "train_episodes": args.train_episodes,
                      "validation_episodes": args.validation_episodes, "horizon": args.horizon,
                      "parameters": sum(p.numel() for p in model.parameters()), "state_dim": 2, "action_dim": 2}))
    metrics = [{"step": 0, **evaluate()}]
    print(json.dumps(metrics[-1]), flush=True)
    started = time.perf_counter()
    for step in range(1, args.steps + 1):
        model.train()
        # CPU index sampling avoids device-specific generator differences.
        index = torch.randint(len(xs), (args.batch_size,), device="cpu").to(device)
        optimizer.zero_grad(set_to_none=True)
        prediction = model(xs[index], us[index])
        loss = (prediction - ys[index]).square().mean()
        if not torch.isfinite(loss):
            raise FloatingPointError("Non-finite training loss")
        loss.backward()
        grad_norm = nn.utils.clip_grad_norm_(model.parameters(), 1.0, error_if_nonfinite=True)
        optimizer.step()
        if step % args.log_every == 0 or step == args.steps:
            record = {"step": step, "training_batch_mse": float(loss.detach()),
                      "gradient_norm_before_clip": float(grad_norm), "elapsed_seconds": time.perf_counter() - started,
                      **evaluate()}
            metrics.append(record)
            print(json.dumps(record), flush=True)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        torch.save({"model": model.state_dict(), "optimizer": optimizer.state_dict(), "step": args.steps,
                    "config": {"state_dim": 2, "action_dim": 2, "hidden": 64},
                    "training_args": {k: str(v) if isinstance(v, Path) else v for k, v in vars(args).items()},
                    "data_seeds": {"train": args.seed + 1000, "validation": args.seed + 2000},
                    "torch_rng_state": torch.get_rng_state(), "metrics": metrics}, args.output)
        args.output.with_suffix(".metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
        print("Saved:", args.output)


if __name__ == "__main__":
    main()
