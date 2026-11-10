"""Deterministic small CPU training with resumable optimizer and RNG state."""
from pathlib import Path
import json
import torch
from ..data import trajectories
from ..models.dynamics import WorldModel
from ..evaluation import evaluate_world


def load_world(path):
    checkpoint = torch.load(path, map_location='cpu', weights_only=True)
    if checkpoint.get('schema') != 'robot-workbench-world-v1':
        raise ValueError('unsupported checkpoint')
    config = checkpoint['config']
    model = WorldModel(config['arch'], config['observation'], config['width'])
    model.load_state_dict(checkpoint['model'])
    return model.eval(), checkpoint


def train_world(out, arch='linear', observation='full', steps=200, seed=42, width=32, resume=None):
    if steps < 1:
        raise ValueError('positive total steps required')
    torch.set_num_threads(1)
    torch.manual_seed(seed)
    config = {'arch': arch, 'observation': observation, 'width': width, 'seed': seed,
              'episodes': 96, 'length': 16, 'batch': 24, 'learning_rate': .003}
    model = WorldModel(arch, observation, width)
    optimizer = torch.optim.AdamW(model.parameters(), lr=config['learning_rate'])
    first, history = 0, []
    if resume:
        restored, checkpoint = load_world(resume)
        if checkpoint['config'] != config or steps < checkpoint['step']:
            raise ValueError('resume requires identical configuration and a nondecreasing total step budget')
        model.load_state_dict(restored.state_dict())
        optimizer.load_state_dict(checkpoint['optimizer'])
        torch.set_rng_state(checkpoint['rng'])
        first, history = checkpoint['step'], checkpoint['history']
    train = trajectories(config['episodes'], config['length'], seed, observation)
    validation = trajectories(32, config['length'], seed+10000, observation)
    initial = evaluate_world(model, validation)
    for step in range(first, steps):
        model.train()
        indices = torch.randint(config['episodes'], (config['batch'],))
        obs, actions = train[0][indices], train[1][indices]
        prediction, _ = model(obs[:, :-1], actions)
        loss = (prediction-obs[:, 1:]).square().mean()
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.)
        optimizer.step()
        if step == first or (step+1) % 20 == 0 or step+1 == steps:
            history.append({'step': step+1, 'train_loss': float(loss.detach())})
    metrics = evaluate_world(model, validation)
    destination = Path(out)
    destination.mkdir(parents=True, exist_ok=True)
    checkpoint = {'schema': 'robot-workbench-world-v1', 'config': config, 'step': steps,
                  'model': model.state_dict(), 'optimizer': optimizer.state_dict(),
                  'rng': torch.get_rng_state(), 'history': history}
    torch.save(checkpoint, destination/'world.pt')
    report = {'schema': 'robot-workbench-report-v1', 'config': config, 'steps': steps,
              'initial': initial, 'validation': metrics, 'history': history,
              'parameters': sum(p.numel() for p in model.parameters()),
              'split': 'Independent generated episodes; validation seed = training seed + 10000',
              'scope': 'CPU toy dynamics; no real camera weights, robot data, or industrial SSM/KDA kernels.'}
    (destination/'report.json').write_text(json.dumps(report, indent=2), encoding='utf8')
    return report
