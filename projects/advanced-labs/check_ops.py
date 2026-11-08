"""Run learner implementations through numerical, boundary and gradient checks."""
import argparse
import importlib.util
import math
from pathlib import Path
import torch


def check(module, task="all"):
    checks = {"dpo": check_dpo, "flow": check_flow, "quant": check_quant}
    return [name for key, fn in checks.items() if task in ["all", key] for name in fn(module)]


def check_dpo(module):
    passed = []
    chosen = torch.tensor([0., 0.], requires_grad=True)
    rejected = torch.tensor([0., 0.], requires_grad=True)
    loss = module.dpo_loss(chosen, rejected, torch.zeros(2), torch.zeros(2), beta=.5)
    torch.testing.assert_close(loss, torch.tensor(math.log(2)))
    loss.backward()
    assert (chosen.grad < 0).all() and (rejected.grad > 0).all(), 'gradient must increase chosen relative to rejected'
    passed.append('DPO initial log(2), scalar reduction and gradient direction')
    large = module.dpo_loss(torch.tensor([-10000.]), torch.tensor([0.]), torch.zeros(1), torch.zeros(1), beta=1)
    assert torch.isfinite(large) and large.item() > 9999
    passed.append('DPO numerical stability at large negative margin')
    return passed


def check_flow(module):
    passed = []
    a, b = torch.tensor([[1., 2.]]), torch.tensor([[3., -2.]])
    for t in [0., .5, 1.]:
        x, v = module.flow_pair(a, b, torch.tensor([[t]]))
        torch.testing.assert_close(x, a+t*(b-a)); torch.testing.assert_close(v, b-a)
    passed.append('Flow start, midpoint, end and time-independent straight-path velocity')
    return passed


def check_quant(module):
    passed = []
    w = torch.tensor([[0., 0., 0.], [-1., .2, .9]])
    q, scale = module.quantize_rows(w)
    assert q.dtype == torch.int8 and scale.shape == (2, 1) and torch.isfinite(scale).all()
    assert torch.all((w-q.float()*scale).abs() <= scale/2 + 1e-6)
    assert torch.equal(q[0], torch.zeros(3, dtype=torch.int8))
    passed.append('Quantization zero row, dtype, scale shape and half-step error bound')
    return passed


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--submission', type=Path, default=Path(__file__).with_name('student_ops.py'))
    parser.add_argument("--task", choices=["all", "dpo", "flow", "quant"], default="all")
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('submission', args.submission)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for name in check(module, args.task):
        print('PASS', name)
