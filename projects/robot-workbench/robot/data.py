"""Whole-episode train/validation separation, shared by every world-model variant."""
import torch
from .environment import transition_tensor


def trajectories(count=64, length=16, seed=42, observation='full'):
    if observation not in ('full', 'partial') or count < 1 or length < 1:
        raise ValueError('invalid dataset specification')
    generator = torch.Generator().manual_seed(seed)
    state = torch.rand(count, 2, generator=generator)*2-1
    state[:, 1] *= .3
    actions = torch.rand(count, length, 1, generator=generator)*2-1
    states = [state]
    for t in range(length):
        state = transition_tensor(state, actions[:, t, 0])
        states.append(state)
    states = torch.stack(states, 1)
    return (states if observation == 'full' else states[..., :1]), actions
