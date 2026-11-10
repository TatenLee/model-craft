"""Separate true-history prediction from self-fed rollout; never update weights here."""
import torch


@torch.inference_mode()
def evaluate_world(model, data, horizon=8):
    model.eval()
    obs, actions = data
    if not 1 <= horizon <= actions.shape[1]-1:
        raise ValueError('invalid rollout horizon')
    pred, _ = model(obs[:, :-1], actions)
    history = obs[:, :2].clone()
    curve, baseline = [], []
    for t in range(1, horizon+1):
        pred_roll, _ = model(history, actions[:, :t+1])
        next_obs = pred_roll[:, -1:]
        curve.append(float((next_obs[:, 0]-obs[:, t+1]).square().mean()))
        baseline.append(float((obs[:, 1]-obs[:, t+1]).square().mean()))
        history = torch.cat([history, next_obs], 1)
    return {'one_step_mse': float((pred-obs[:, 1:]).square().mean()),
            'rollout_by_horizon': curve, 'persistence_by_horizon': baseline,
            'rollout_mse': sum(curve)/len(curve)}
