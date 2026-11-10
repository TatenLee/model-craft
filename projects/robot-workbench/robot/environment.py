"""A 1-D tabletop carriage. A simulator, not a physical-robot controller."""
import math
from .contracts import Observation


def transition_tensor(state, action):
    import torch
    velocity = .8 * state[..., 1] + .2 * action + .03 * torch.sin(state[..., 0])
    return torch.stack([state[..., 0] + velocity, velocity], -1)


class Tabletop:
    def __init__(self, position=-.3, velocity=0., stuck=False):
        if not all(math.isfinite(x) for x in (position, velocity)):
            raise ValueError('finite state required')
        self.x, self.v, self.tick, self.stuck = position, velocity, 0, stuck
        self.targets = {'red': -.7, 'blue': .7}

    def observe(self):
        positions = [self.x, self.targets['red'], self.targets['blue']]
        camera = [[math.exp(-(((-2 + 4*i/30)-p)/.12)**2) for p in positions] for i in range(31)]
        return Observation(self.tick, (self.x, self.v), camera)

    def step(self, action):
        if not isinstance(action, (int, float)) or not math.isfinite(action) or not -1 <= action <= 1:
            raise ValueError('action must be a finite scalar in [-1,1]')
        self.v = 0. if self.stuck else .8*self.v + .2*action + .03*math.sin(self.x)
        self.x += self.v
        self.tick += 1
        return self.observe()
