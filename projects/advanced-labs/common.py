"""Small CPU-first experiments. Reports are observations, never benchmark claims."""
import argparse
import importlib.util
import sys
import hashlib
import json
from pathlib import Path
import platform

import torch


def arguments(description, training=True):
    parser = argparse.ArgumentParser(description=description)
    if training:
        parser.add_argument('--steps', type=int, default=150)
    else:
        parser.set_defaults(steps=0)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--out', type=Path, required=True)
    return parser


def setup(args):
    if args.steps < 0 or args.seed < 0:
        raise ValueError('steps and seed must be nonnegative')
    if args.out.exists():
        raise ValueError('Use a new output directory to preserve earlier experiments')
    torch.set_num_threads(1)
    torch.manual_seed(args.seed)


def save(args, name, result, model=None):
    args.out.mkdir(parents=True)
    files = sorted(Path(__file__).parent.glob('*.py'))
    sources = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    result = {'schema': 'model-craft-advanced-v1', 'experiment': name,
              'config': {k: str(v) if isinstance(v, Path) else v for k, v in vars(args).items()},
              'environment': {'python': platform.python_version(), 'torch': str(torch.__version__), 'device': 'cpu'},
              'sources': sources,
              'learner_ops_sha256': hashlib.sha256(args.ops.read_bytes()).hexdigest() if getattr(args, 'ops', None) else None, **result}
    (args.out / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
    if model is not None:
        torch.save(model.state_dict(), args.out / 'weights.pt')
    print(json.dumps({k: v for k, v in result.items() if k not in ['sources', 'samples', 'environment', 'config']}, indent=2))


def dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, beta=0.1):
    """Sequence log probabilities, with a fixed reference distribution."""
    margin = beta * ((policy_chosen - policy_rejected) - (ref_chosen - ref_rejected))
    return -torch.nn.functional.logsigmoid(margin).mean()


def flow_pair(noise, target, time):
    return (1 - time) * noise + time * target, target - noise


def quantize_rows(weight):
    """Symmetric per-output-row int8 STORAGE, not a fast int8 matmul kernel."""
    scale = weight.abs().amax(dim=1, keepdim=True).clamp_min(1e-12) / 127
    quantized = (weight / scale).round().clamp(-127, 127).to(torch.int8)
    return quantized, scale


def load_ops(path):
    if path is None:
        return sys.modules[__name__]
    spec = importlib.util.spec_from_file_location('learner_ops', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
