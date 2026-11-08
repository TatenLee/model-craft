"""Verify offset-aware cached causal attention, then report latency and int8 storage error."""
import math
import time
from pathlib import Path
import torch
from common import arguments, setup, save, quantize_rows, load_ops


class Attention(torch.nn.Module):
    def __init__(self, width=32, heads=4):
        super().__init__()
        self.heads = heads
        self.qkv = torch.nn.Linear(width, 3 * width)
        self.out = torch.nn.Linear(width, width)

    def forward(self, x, cache=None):
        batch, length, width = x.shape
        q, k, v = self.qkv(x).reshape(batch, length, 3, self.heads, width // self.heads).permute(2, 0, 3, 1, 4)
        offset = 0 if cache is None else cache[0].shape[2]
        if cache is not None:
            k, v = torch.cat([cache[0], k], 2), torch.cat([cache[1], v], 2)
        # The query's absolute position includes the cached prefix. For a single
        # decode token all preceding keys are visible. A fresh top-left mask is wrong.
        allowed = torch.arange(k.shape[2])[None, :] <= (offset + torch.arange(length))[:, None]
        scores = q @ k.transpose(-2, -1) / math.sqrt(width // self.heads)
        probs = scores.masked_fill(~allowed, -torch.inf).softmax(-1)
        y = (probs @ v).transpose(1, 2).reshape(batch, length, width)
        return self.out(y), (k, v)


@torch.inference_mode()
def compare(module, x):
    full, _ = module(x)
    prefix = min(8, x.shape[1] - 1)
    first, cache = module(x[:, :prefix])
    pieces = [first]
    for i in range(prefix, x.shape[1]):
        part, cache = module(x[:, i:i+1], cache)
        pieces.append(part)
    return (full - torch.cat(pieces, 1)).abs().max().item(), cache


def main():
    parser = arguments(__doc__, training=False)
    parser.add_argument('--length', type=int, default=64)
    parser.add_argument("--ops", type=Path, help="Trusted local learner implementation; defaults to reference")
    args = parser.parse_args()
    if args.length < 2 or args.length > 1024:
        parser.error('length must be in [2,1024] for this CPU exercise')
    setup(args)
    ops = load_ops(args.ops)
    module = Attention().eval()
    x = torch.randn(1, args.length, 32)
    error, cache = compare(module, x)
    if error > 1e-5:
        raise AssertionError('Cached and full attention disagree')

    @torch.inference_mode()
    def run(cached):
        state = None
        for i in range(args.length):
            _, state = module(x[:, i:i+1] if cached else x[:, :i+1], state if cached else None)

    timings = {}
    for cached in [False, True]:
        run(cached)
        times = []
        for _ in range(5):
            start = time.perf_counter(); run(cached); times.append((time.perf_counter()-start)*1000)
        timings['cached_ms' if cached else 'recompute_prefix_ms'] = sorted(times)[2]
    weight = module.qkv.weight.detach()
    quantized, scale = ops.quantize_rows(weight)
    restored = quantized.float() * scale
    save(args, 'cache-and-quantization', {'cache_max_abs_error': error,
         'cache_bytes': sum(t.numel()*t.element_size() for t in cache),
         'weight_fp32_bytes': weight.numel()*weight.element_size(),
         'int8_plus_scale_bytes': quantized.numel()+scale.numel()*scale.element_size(),
         'weight_max_abs_error': (restored-weight).abs().max().item(), 'timing': timings,
         'scope': 'CPU single attention layer on fixed embeddings, no positional encoding or trained LM. Quantization measures storage/error, NOT int8 kernel speed.'})


if __name__ == '__main__':
    main()
