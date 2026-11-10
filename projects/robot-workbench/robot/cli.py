"""Run from projects/robot-workbench: python -m robot.cli <command>."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DEFAULT = ROOT/'.openai/local/robot-workbench'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('scalar')
    calibration = sub.add_parser('calibrate')
    calibration.add_argument('--model', choices=['linear', 'mlp'], default='linear')
    calibration.add_argument('--steps', type=int, default=400)
    calibration.add_argument('--seed', type=int, default=42)
    calibration.add_argument('--width', type=int, default=24, help='Hidden units for MLP calibration')
    plan = sub.add_parser('plan')
    plan.add_argument('--instruction', default='先去红色，再去蓝色')
    sub.add_parser('observe')
    train = sub.add_parser('train')
    train.add_argument('--arch', choices=['linear', 'mlp', 'gru', 'transformer'], default='linear')
    train.add_argument('--observation', choices=['full', 'partial'], default='full')
    train.add_argument('--steps', type=int, default=200)
    train.add_argument('--seed', type=int, default=42)
    train.add_argument('--width', type=int, default=32)
    train.add_argument('--out', type=Path, default=DEFAULT/'world')
    train.add_argument('--resume', type=Path)
    agent = sub.add_parser('agent')
    agent.add_argument('--checkpoint', type=Path, default=DEFAULT/'world/world.pt')
    agent.add_argument('--instruction', default='先去红色，再去蓝色')
    agent.add_argument('--budget', type=int, default=60)
    agent.add_argument('--stuck', action='store_true')
    agent.add_argument('--out', type=Path, default=DEFAULT/'agent.json')
    distill = sub.add_parser('distill')
    distill.add_argument('--steps', type=int, default=200)
    distill.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    if args.command == 'scalar':
        from .models.scalar import fit, predict
        result = fit([-1, 0, 1, 2], [-1, 1, 3, 5])
        result['held_out_prediction'] = predict([.5, 1.5], result['w'], result['b'])
    elif args.command == 'calibrate':
        from .models.scalar import fit_calibration
        result = fit_calibration(args.model, args.steps, args.seed, args.width)
    elif args.command == 'plan':
        from .models.brain import RuleBrain
        result = {'goals': RuleBrain().plan(args.instruction), 'scope': 'Rule parser; no action executed.'}
    elif args.command == 'observe':
        from .environment import Tabletop
        from .models.perception import CentroidEncoder
        result = {'visible_positions': CentroidEncoder().encode(Tabletop().observe().camera),
                  'scope': 'Analytic centroid on a synthetic strip camera; not a trained visual tower.'}
    elif args.command == 'train':
        from .training.supervised import train_world
        result = train_world(args.out, args.arch, args.observation, args.steps, args.seed, args.width, args.resume)
    elif args.command == 'agent':
        import torch
        from .training.supervised import load_world
        from .environment import Tabletop
        from .planning import MPC
        from .agent import ToolAgent
        torch.set_num_threads(1)
        model, checkpoint = load_world(args.checkpoint)
        result = ToolAgent(MPC(model), budget=args.budget).run(Tabletop(stuck=args.stuck), args.instruction)
        result['world_checkpoint_step'] = checkpoint['step']
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
    else:
        from .training.distill import train_distillation
        result = train_distillation(args.steps, args.seed)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
