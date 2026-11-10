"""One public interface; four implementations with different information access."""
import math
import torch
from torch import nn


class WorldModel(nn.Module):
    def __init__(self, arch='linear', observation='full', width=32):
        super().__init__()
        if arch not in ('linear', 'mlp', 'gru', 'transformer') or observation not in ('full', 'partial'):
            raise ValueError('unsupported model')
        if width < 4 or width % 4:
            raise ValueError('width must be positive and divisible by 4')
        self.arch, self.observation, self.width = arch, observation, width
        self.obs_dim = 2 if observation == 'full' else 1
        if arch == 'linear':
            self.head = nn.Linear(self.obs_dim+1, self.obs_dim)
        else:
            self.input = nn.Linear(self.obs_dim+1, width)
            if arch == 'mlp':
                self.mixer = nn.Sequential(nn.Tanh(), nn.Linear(width, width), nn.Tanh())
            elif arch == 'gru':
                self.mixer = nn.GRU(width, width, batch_first=True)
            else:
                block = nn.TransformerEncoderLayer(width, 4, width*2, dropout=0, batch_first=True)
                self.mixer = nn.TransformerEncoder(block, 2, enable_nested_tensor=False)
            self.head = nn.Linear(width, self.obs_dim)

    def forward(self, observations, actions, state=None):
        if state is not None and self.arch != 'gru':
            raise ValueError('only the GRU implementation accepts a recurrent state')
        if observations.ndim != 3 or actions.shape != (*observations.shape[:2], 1) or observations.shape[-1] != self.obs_dim:
            raise ValueError('expected obs [B,T,O] and actions [B,T,1]')
        if not observations.shape[1]:
            raise ValueError('empty history')
        joined = torch.cat([observations, actions], -1)
        memory = None
        if self.arch == 'linear':
            delta = self.head(joined)
        else:
            h = self.input(joined)
            if self.arch == 'gru':
                h, memory = self.mixer(h, state)
            elif self.arch == 'transformer':
                length = h.shape[1]
                position = torch.arange(length, device=h.device)[:, None]
                rate = torch.exp(torch.arange(0, self.width, 2, device=h.device)*(-math.log(10000)/self.width))
                pe = torch.zeros(length, self.width, device=h.device)
                pe[:, 0::2], pe[:, 1::2] = torch.sin(position*rate), torch.cos(position*rate)
                causal = torch.ones(length, length, dtype=torch.bool, device=h.device).triu(1)
                h = self.mixer(h+pe, mask=causal)
            else:
                h = self.mixer(h)
            delta = self.head(h)
        return observations+delta, memory
