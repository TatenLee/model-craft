"""Conditional flow matching from Gaussian noise to a two-mode 2D distribution."""
from pathlib import Path
import torch
from common import arguments, setup, save, flow_pair, load_ops


def target_samples(n, rng):
    centers = torch.tensor([[-2.0, 0.0], [2.0, 0.0]])
    return centers[torch.randint(2, (n,), generator=rng)] + 0.25 * torch.randn(n, 2, generator=rng)


def main():
    parser = arguments(__doc__)
    parser.add_argument('--sample-steps', type=int, default=30)
    parser.add_argument("--ops", type=Path, help="Trusted local learner implementation; defaults to reference")
    args = parser.parse_args()
    if args.sample_steps < 1:
        parser.error('sample-steps must be positive')
    setup(args)
    ops = load_ops(args.ops)
    model = torch.nn.Sequential(torch.nn.Linear(3, 64), torch.nn.SiLU(), torch.nn.Linear(64, 64),
                                torch.nn.SiLU(), torch.nn.Linear(64, 2))
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.003)
    train_rng = torch.Generator().manual_seed(args.seed)
    valid_rng = torch.Generator().manual_seed(args.seed + 10000)
    vx0 = torch.randn(256, 2, generator=valid_rng)
    vx1 = target_samples(256, valid_rng)
    vt = torch.rand(256, 1, generator=valid_rng)
    vx, vu = ops.flow_pair(vx0, vx1, vt)

    def validation():
        with torch.no_grad():
            return (model(torch.cat([vx, vt], -1)) - vu).square().mean().item()

    before = validation()
    history = []
    for step in range(args.steps):
        x0 = torch.randn(64, 2, generator=train_rng)
        x1 = target_samples(64, train_rng)
        t = torch.rand(64, 1, generator=train_rng)
        xt, velocity = ops.flow_pair(x0, x1, t)
        loss = (model(torch.cat([xt, t], -1)) - velocity).square().mean()
        optimizer.zero_grad(); loss.backward(); optimizer.step()
        if step == 0 or (step + 1) % 25 == 0:
            history.append({'step': step + 1, 'velocity_mse': loss.item()})
    rng = torch.Generator().manual_seed(args.seed + 20000)
    samples = torch.randn(256, 2, generator=rng)
    with torch.no_grad():
        for k in range(args.sample_steps):
            t = torch.full((len(samples), 1), k / args.sample_steps)
            samples += model(torch.cat([samples, t], -1)) / args.sample_steps
    centers = torch.tensor([[-2.0, 0.0], [2.0, 0.0]])
    distance = torch.cdist(samples, centers).amin(-1)
    # A scatter artifact lets learners see mode collapse that a single mean can hide.
    save(args, 'flow-matching-2d', {'before_velocity_mse': before, 'validation_velocity_mse': validation(),
         'left_mode_fraction': (samples[:, 0] < 0).float().mean().item(),
         'fraction_within_0_75_of_a_mode': (distance < .75).float().mean().item(),
         'history': history, 'samples': samples.tolist(),
         'scope': 'Straight interpolation with independent coupling; not image generation, diffusion policy or paper-scale replication.'}, model)
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_agg import FigureCanvasAgg
    figure = Figure(figsize=(6, 4), layout="constrained")
    FigureCanvasAgg(figure)
    axis = figure.subplots()
    axis.scatter(samples[:, 0].numpy(), samples[:, 1].numpy(), s=10, alpha=.6, label="Generated")
    axis.scatter([-2, 2], [0, 0], marker="x", s=80, color="black", label="Target centers")
    axis.set(xlabel="x", ylabel="y", title="Flow matching: fixed-seed samples")
    axis.legend(); axis.set_aspect("equal", adjustable="datalim")
    figure.savefig(args.out / 'samples.svg')


if __name__ == '__main__':
    main()
