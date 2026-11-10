"""Meaningful contracts and experiments; run with python -m unittest robot.tests."""
import math
from pathlib import Path
import tempfile
import unittest
import torch
from .data import trajectories
from .environment import Tabletop, transition_tensor
from .models.scalar import fit, fit_calibration, predict
from .models.dynamics import WorldModel
from .models.perception import CentroidEncoder
from .models.brain import RuleBrain
from .training.supervised import train_world, load_world
from .training.distill import reverse_kl, teacher_probs, train_distillation
from .planning import MPC
from .agent import ToolAgent

torch.set_num_threads(1)


class RobotTests(unittest.TestCase):
    def test_scalar_learns_shared_rule_on_unseen_inputs(self):
        result = fit([-1, 0, 1, 2], [-1, 1, 3, 5])
        self.assertLess(abs(result['w']-2), .01)
        self.assertLess(abs(result['b']-1), .01)
        for actual, expected in zip(predict([.5, 1.5], result['w'], result['b']), [2, 4]):
            self.assertAlmostEqual(actual, expected, places=2)

    def test_nonlinear_calibration_is_same_task_with_a_different_model(self):
        linear, mlp = fit_calibration('linear'), fit_calibration('mlp')
        self.assertGreater(linear['validation_mse'], .1)
        self.assertLess(mlp['validation_mse'], linear['validation_mse']*.1)
        self.assertEqual(fit_calibration('mlp', steps=1, width=12)['parameters'], 37)
        with self.assertRaises(ValueError):
            fit_calibration('mlp', width=0)

    def test_simulator_matches_training_transition(self):
        env = Tabletop(.3, -.1)
        for action in [-1., .4, 0., 1.]:
            expected = transition_tensor(torch.tensor(env.observe().proprio), torch.tensor(action))
            actual = env.step(action)
            torch.testing.assert_close(torch.tensor(actual.proprio), expected)
        for action in [2, float('nan')]:
            with self.assertRaises(ValueError):
                env.step(action)

    def test_dataset_alignment_and_independent_episode_generation(self):
        obs, actions = trajectories(3, 8)
        self.assertEqual(obs.shape, (3, 9, 2))
        for t in range(8):
            torch.testing.assert_close(obs[:, t+1], transition_tensor(obs[:, t], actions[:, t, 0]))
        self.assertFalse(torch.equal(obs, trajectories(3, 8, seed=10042)[0]))
        self.assertTrue(torch.equal(obs[..., :1], trajectories(3, 8, observation='partial')[0]))

    def test_all_world_variants_share_shapes_and_receive_gradients(self):
        for arch in ('linear', 'mlp', 'gru', 'transformer'):
            for observation in ('full', 'partial'):
                model = WorldModel(arch, observation)
                obs, action = trajectories(2, 8, observation=observation)
                prediction, _ = model(obs[:, :-1], action)
                self.assertEqual(prediction.shape, obs[:, 1:].shape)
                (prediction-obs[:, 1:]).square().mean().backward()
                self.assertTrue(all(p.grad is not None and torch.isfinite(p.grad).all() for p in model.parameters()))
        with self.assertRaises(ValueError):
            WorldModel(width=7)
        with self.assertRaises(ValueError):
            WorldModel('mlp')(torch.zeros(1, 2, 2), torch.zeros(1, 2, 1), torch.ones(1, 1, 32))

    def test_transformer_cannot_read_future(self):
        model = WorldModel('transformer', 'partial').eval()
        obs, action = trajectories(2, 8, observation='partial')
        base, _ = model(obs[:, :-1], action)
        changed = obs[:, :-1].clone()
        changed[:, 4:] += 100
        actions = action.clone()
        actions[:, 4:] *= -10
        altered, _ = model(changed, actions)
        torch.testing.assert_close(base[:, :4], altered[:, :4])

    def test_gru_chunking_preserves_state_but_reset_changes_it(self):
        model = WorldModel('gru', 'partial').eval()
        obs, action = trajectories(2, 8, observation='partial')
        whole, _ = model(obs[:, :-1], action)
        first, hidden = model(obs[:, :4], action[:, :4])
        rest, _ = model(obs[:, 4:-1], action[:, 4:], hidden)
        reset, _ = model(obs[:, 4:-1], action[:, 4:])
        torch.testing.assert_close(whole, torch.cat([first, rest], 1))
        self.assertFalse(torch.allclose(rest, reset))

    def test_camera_and_brain_have_explicit_baseline_boundaries(self):
        estimate = CentroidEncoder().encode(Tabletop(.2).observe().camera)
        for name, target in [('robot', .2), ('red', -.7), ('blue', .7)]:
            self.assertLess(abs(estimate[name]-target), .02)
        self.assertEqual(RuleBrain().plan('先去蓝色，再去红色'), ['blue', 'red'])
        for text in ['不要去红色', 'green', 'not red']:
            with self.assertRaises(ValueError):
                RuleBrain().plan(text)

    def test_resume_matches_uninterrupted_training_and_rejects_mismatches(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            train_world(root/'whole', arch='mlp', steps=20)
            train_world(root/'split', arch='mlp', steps=10)
            train_world(root/'split', arch='mlp', steps=20, resume=root/'split/world.pt')
            whole, _ = load_world(root/'whole/world.pt')
            split, _ = load_world(root/'split/world.pt')
            for a, b in zip(whole.parameters(), split.parameters()):
                self.assertTrue(torch.equal(a, b))
            with self.assertRaises(ValueError):
                train_world(root/'bad', arch='linear', steps=30, resume=root/'split/world.pt')

    def test_trained_world_closes_task_loop_and_fault_is_not_success(self):
        with tempfile.TemporaryDirectory() as directory:
            report = train_world(directory, arch='mlp', steps=400)
            self.assertLess(report['validation']['one_step_mse'], report['initial']['one_step_mse']*.1)
            model, _ = load_world(Path(directory)/'world.pt')
            result = ToolAgent(MPC(model)).run(Tabletop(), '先去红色，再去蓝色')
            self.assertTrue(result['success'])
            self.assertEqual(result['completed'], ['red', 'blue'])
            self.assertLessEqual(result['actions'], result['budget'])
            failed = ToolAgent(MPC(model), budget=5).run(Tabletop(stuck=True), '去红色')
            self.assertFalse(failed['success'])
            self.assertEqual(failed['reason'], 'action_budget_exhausted')
            self.assertEqual(failed['actions'], 5)
        with self.assertRaises(ValueError):
            MPC(WorldModel('gru', 'partial'))

    def test_last_budgeted_action_is_verified(self):
        class OneStepEnv(Tabletop):
            def step(self, action):
                self.x, self.v = -.7, 0.
                self.tick += 1
                return self.observe()
        class Planner:
            def choose(self, state, goal):
                return -1.
        result = ToolAgent(Planner(), budget=1).run(OneStepEnv(), 'red')
        self.assertTrue(result['success'])
        self.assertEqual(result['actions'], 1)
        class InvalidBrain:
            def plan(self, instruction):
                return []
        with self.assertRaises(ValueError):
            ToolAgent(Planner(), brain=InvalidBrain()).run(OneStepEnv(), 'red')

    def test_distillation_kl_direction_freezes_teacher_and_uses_student_contexts(self):
        teacher = torch.tensor([.9, .05, .05], requires_grad=True)
        student = torch.zeros(3, requires_grad=True)
        loss = reverse_kl(student, teacher)
        loss.backward()
        self.assertIsNone(teacher.grad)
        self.assertLess(float(student.grad[0]), 0)
        self.assertAlmostEqual(float(reverse_kl(teacher.detach().log(), teacher)), 0., places=6)
        with self.assertRaises(ValueError):
            reverse_kl(torch.tensor([float('nan'), 0., 0.]), teacher)
        self.assertFalse(torch.equal(teacher_probs(0, 0, 1), teacher_probs(0, 1, 1)))
        report = train_distillation(200)
        self.assertTrue(all(after < before*.1 for before, after in zip(report['before_reverse_kl_by_domain'], report['after_reverse_kl_by_domain'])))
        self.assertTrue(any(t['student_action'] != t['teacher_argmax'] for t in report['traces']))


if __name__ == '__main__':
    unittest.main()
