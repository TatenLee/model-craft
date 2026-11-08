"""DPO core objective on a contextual discrete-action policy, not an LLM benchmark."""
from pathlib import Path
import torch
from common import arguments, setup, save, dpo_loss, load_ops


def make_data(n, seed):
    rng = torch.Generator().manual_seed(seed)
    context = torch.rand(n, 1, generator=rng) * 2 - 1
    # Human-like synthetic preference: move toward the target, never a real reward model.
    chosen = (context[:, 0] > 0).long()
    return context, chosen, 1 - chosen


def main():
    parser = arguments(__doc__)
    parser.add_argument('--beta', type=float, default=0.5)
    parser.add_argument('--label-noise', type=float, default=0)
    parser.add_argument("--ops", type=Path, help="Trusted local learner implementation; defaults to reference")
    args = parser.parse_args()
    if args.beta <= 0 or not 0 <= args.label_noise <= 1:
        parser.error('beta > 0; label-noise in [0,1]')
    setup(args)
    ops = load_ops(args.ops)
    model = torch.nn.Sequential(torch.nn.Linear(1, 16), torch.nn.Tanh(), torch.nn.Linear(16, 2))
    reference = torch.nn.Sequential(torch.nn.Linear(1, 16), torch.nn.Tanh(), torch.nn.Linear(16, 2))
    reference.load_state_dict(model.state_dict())
    reference.requires_grad_(False).eval()
    x, chosen, rejected = make_data(128, args.seed)
    swap = torch.rand(len(x), generator=torch.Generator().manual_seed(args.seed + 7)) < args.label_noise
    chosen, rejected = torch.where(swap, rejected, chosen), torch.where(swap, chosen, rejected)
    with torch.no_grad():
        ref = reference(x).log_softmax(-1)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.01)
    vx, vc, _ = make_data(256, args.seed + 10000)

    def evaluate():
        with torch.no_grad():
            logp, logr = model(vx).log_softmax(-1), reference(vx).log_softmax(-1)
            return {'preference_accuracy': (logp.argmax(-1) == vc).float().mean().item(),
                    'kl_to_reference': (logp.exp() * (logp - logr)).sum(-1).mean().item()}

    before = evaluate()
    history = []
    idx = torch.arange(len(x))
    for step in range(args.steps):
        logp = model(x).log_softmax(-1)
        loss = ops.dpo_loss(logp[idx, chosen], logp[idx, rejected], ref[idx, chosen], ref[idx, rejected], args.beta)
        optimizer.zero_grad(); loss.backward(); optimizer.step()
        if step == 0 or (step + 1) % 25 == 0:
            history.append({'step': step + 1, 'loss': loss.item()})
    save(args, 'discrete-dpo', {'before': before, 'validation': evaluate(), 'history': history,
         'scope': 'Two-action synthetic preference task. No learned reward model, language generation or online RL.'}, model)


if __name__ == '__main__':
    main()
