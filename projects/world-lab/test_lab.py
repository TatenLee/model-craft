"""Structural tests for causal prediction, rollout and exact CPU resume."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import torch
from lab import WorldModel, episodes, evaluate


class WorldLabTests(unittest.TestCase):
    def test_future_cannot_change_past_prediction(self):
        torch.set_num_threads(1)
        for arch in ["mlp", "transformer", "gru"]:
            model = WorldModel(arch).eval()
            obs, action = episodes(2, 16, 4)
            first = model(obs[:, :-1], action)[0]
            changed = obs[:, :-1].clone()
            changed[:, 8:] += 100
            actual = model(changed, action)[0]
            torch.testing.assert_close(first[:, :8], actual[:, :8])

    def test_recurrent_chunk_equivalence_and_reset(self):
        model = WorldModel("gru").eval()
        obs, action = episodes(2, 16, 4)
        full, _ = model(obs[:, :-1], action)
        a, state = model(obs[:, :8], action[:, :8])
        b, _ = model(obs[:, 8:-1], action[:, 8:], state)
        torch.testing.assert_close(full, torch.cat([a, b], 1))
        reset, _ = model(obs[:, 8:-1], action[:, 8:], None)
        self.assertFalse(torch.allclose(b, reset))
        detached = state.detach()
        torch.testing.assert_close(detached, state)
        self.assertFalse(detached.requires_grad)

    def test_episode_splits_and_rollout(self):
        a = episodes(3, 16, 4)
        b = episodes(3, 16, 10004)
        self.assertFalse(torch.equal(a[0], b[0]))
        result = evaluate(WorldModel(), a)
        self.assertEqual(len(result["rollout_by_horizon"]), 8)
        self.assertTrue(all(x >= 0 for x in result["rollout_by_horizon"]))

    def test_resume_reproduces_uninterrupted_cpu_training(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = str(Path(__file__).with_name("lab.py"))
            base = [sys.executable, script, "--arch", "gru", "--observation", "partial"]
            for extra in [["--steps", "6", "--out", str(root / "full")],
                          ["--steps", "3", "--out", str(root / "split")],
                          ["--steps", "6", "--out", str(root / "split"), "--resume", str(root / "split/checkpoint.pt")]]:
                subprocess.run(base + extra, check=True, stdout=subprocess.DEVNULL)
            a, b = [torch.load(root / d / "checkpoint.pt", weights_only=True) for d in ["full", "split"]]
            for key in a["model"]:
                torch.testing.assert_close(a["model"][key], b["model"][key], rtol=0, atol=0)


if __name__ == "__main__":
    unittest.main()
