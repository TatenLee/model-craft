"""Receding-horizon control calls the World contract; it does not train the model."""
import torch


class MPC:
    def __init__(self, model, horizon=6, candidates=96, seed=42):
        if model.observation != 'full' or model.arch not in ('linear', 'mlp'):
            raise ValueError('This planner supports full-state memoryless worlds only; sequence worlds need per-candidate history/state adapters.')
        if horizon < 1 or candidates < 4:
            raise ValueError('horizon >=1, candidates >=4 required')
        self.model = model.eval()
        self.horizon, self.candidates = horizon, candidates
        self.generator = torch.Generator().manual_seed(seed)

    @torch.inference_mode()
    def choose(self, state, goal):
        plans = torch.rand(self.candidates, self.horizon, generator=self.generator)*2-1
        plans[0], plans[1], plans[2] = 0, -1, 1
        # Include a cheap feedback-inspired proposal. The learned world still scores it.
        plans[3] = max(-1., min(1., 1.5*(goal-float(state[0]))-2*float(state[1])))
        future = state.expand(self.candidates, -1).clone()
        cost = torch.zeros(self.candidates)
        for t in range(self.horizon):
            future, _ = self.model(future[:, None], plans[:, t, None, None])
            future = future[:, 0]
            cost += .1*(future[:, 0]-goal).square()+.01*plans[:, t].square()
        cost += 3*(future[:, 0]-goal).square()+future[:, 1].square()
        return float(plans[cost.argmin(), 0])
