"""Explicit observe -> plan -> act -> verify loop; all tools stay in the simulator."""
import torch
from .models.brain import RuleBrain
from .models.perception import CentroidEncoder


class ToolAgent:
    def __init__(self, planner, brain=None, vision=None, budget=60):
        if budget < 1:
            raise ValueError('positive action budget required')
        self.planner = planner
        self.brain = brain or RuleBrain()
        self.vision = vision or CentroidEncoder()
        self.budget = budget

    def run(self, environment, instruction):
        goals = self.brain.plan(instruction)
        if not isinstance(goals, list) or not 1 <= len(goals) <= 8 or any(not isinstance(name, str) or not name for name in goals):
            raise ValueError('brain adapter must return 1–8 explicit goal names')
        events, completed, used = [], [], 0
        for name in goals:
            reached = False
            while used < self.budget:
                obs = environment.observe()
                visible = self.vision.encode(obs.camera)
                if name not in visible or name == 'robot':
                    raise ValueError('requested target is not available: '+name)
                goal = visible[name]
                # Proprioception is the control state; the camera locates the requested target.
                state = torch.tensor(obs.proprio, dtype=torch.float32)
                reached = abs(obs.proprio[0]-goal)<.12 and abs(obs.proprio[1])<.12
                events.append({'tool': 'verify', 'tick': obs.tick, 'goal': name, 'position': obs.proprio[0], 'reached': reached})
                if reached:
                    completed.append(name)
                    break
                action = self.planner.choose(state, goal)
                next_obs = environment.step(action)
                used += 1
                events.append({'tool': 'move', 'action': action, 'tick': next_obs.tick, 'goal': name})
            if not reached:
                # Verify the final allowed action too; budget exhaustion is not an automatic failure.
                obs = environment.observe()
                goal = self.vision.encode(obs.camera)[name]
                reached = abs(obs.proprio[0]-goal)<.12 and abs(obs.proprio[1])<.12
                events.append({'tool': 'verify', 'tick': obs.tick, 'goal': name, 'position': obs.proprio[0], 'reached': reached})
                if reached:
                    completed.append(name)
                else:
                    break
        return {'instruction': instruction, 'planned': goals, 'completed': completed,
                'success': completed == goals, 'actions': used, 'budget': self.budget,
                'reason': 'verified' if completed == goals else 'action_budget_exhausted', 'events': events,
                'scope': 'Synthetic 1-D environment, rule language planner, analytic vision, learned world + MPC. Not a pretrained robot foundation model.'}
