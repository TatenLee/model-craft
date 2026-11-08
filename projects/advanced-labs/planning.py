"""Receding-horizon planning with a learned world model; not real robot deployment."""
from pathlib import Path
import sys
import torch
from common import arguments, setup, save

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'world-lab'))
from lab import WorldModel


def transition(state, action):
    velocity = .8 * state[..., 1] + .2 * action
    return torch.stack([state[..., 0] + velocity, velocity], -1)


@torch.inference_mode()
def choose(state, goal, plans, model=None):
    predictions = state.expand(len(plans), -1).clone()
    for t in range(plans.shape[1]):
        action = plans[:, t]
        if model is None:
            predictions = transition(predictions, action)
        else:
            predictions = model(predictions[:, None], action[:, None, None])[0][:, 0]
    cost = (predictions[:, 0] - goal).square() + .01 * plans.square().sum(-1)
    return plans[cost.argmin(), 0]


def main():
    parser = arguments(__doc__, training=False)
    parser.add_argument('--checkpoint', type=Path, required=True)
    parser.add_argument('--horizon', type=int, default=6)
    parser.add_argument('--candidates', type=int, default=64)
    args = parser.parse_args()
    if args.horizon < 1 or args.candidates < 2:
        parser.error('positive horizon and >=2 candidates required')
    setup(args)
    checkpoint = torch.load(args.checkpoint, map_location='cpu', weights_only=True)
    config = checkpoint['config']
    if config['arch'] != 'mlp' or config['observation'] != 'full':
        raise ValueError('This memoryless planner requires a full-observation MLP checkpoint')
    model = WorldModel('mlp', 'full', config['width']).eval()
    model.load_state_dict(checkpoint['model'])
    scenarios = torch.rand(16, 3, generator=torch.Generator().manual_seed(args.seed + 20000))
    metrics = {}
    for method in ['zero', 'random', 'oracle_mpc', 'learned_mpc']:
        squared, successes = [], []
        for i, scene in enumerate(scenarios):
            state = torch.tensor([scene[0]*2-1, 0.0])
            goal = scene[1]*4-2
            rng = torch.Generator().manual_seed(args.seed + i)
            for _ in range(12):
                plans = torch.randint(-1, 2, (args.candidates, args.horizon), generator=rng).float()
                action = torch.tensor(0.) if method == 'zero' else plans[0, 0] if method == 'random' else choose(state, goal, plans, model if method == 'learned_mpc' else None)
                state = transition(state, action)  # Only one action executed before replanning.
            squared.append((state[0]-goal).square().item())
            successes.append(abs(state[0]-goal).item() < .25)
        metrics[method] = {'terminal_position_mse': sum(squared)/len(squared), 'success_within_0_25': sum(successes)/len(successes)}
    save(args, 'world-model-mpc', {'checkpoint_config': config, 'checkpoint_step': checkpoint['step'],
         'metrics': metrics, 'scope': '16 fixed synthetic scenarios, 12 control steps, random-shooting MPC. No physical robot or learned policy training.'})


if __name__ == '__main__':
    main()
