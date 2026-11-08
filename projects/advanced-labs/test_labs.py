import unittest
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import torch
import common
from check_ops import check
from cache import Attention, compare
from planning import choose, transition
from vision import images


class LabTests(unittest.TestCase):
    def test_reference_ops_and_wrong_gradient(self):
        self.assertEqual(len(check(common)), 4)
        class Bad:
            dpo_loss = staticmethod(lambda *args, **kw: torch.tensor(.693147))
        with self.assertRaises(RuntimeError):
            check(Bad)

    def test_cached_attention_chunks_and_future_independence(self):
        torch.manual_seed(42)
        model = Attention().eval()
        x = torch.randn(2, 19, 32)
        error, _ = compare(model, x)
        self.assertLess(error, 1e-6)
        full, _ = model(x)
        first, state = model(x[:, :7])
        second, _ = model(x[:, 7:], state)
        torch.testing.assert_close(torch.cat([first, second], 1), full)
        changed = x.clone(); changed[:, 9:] += 99
        torch.testing.assert_close(model(changed)[0][:, :9], full[:, :9])

    def test_control_and_vision_data_contracts(self):
        plans = torch.tensor([[-1.], [0.], [1.]])
        self.assertEqual(choose(torch.zeros(2), .2, plans).item(), 1)
        torch.testing.assert_close(transition(torch.zeros(2), torch.tensor(1.)), torch.tensor([.2, .2]))
        red, y = images(4, 42); blue, target = images(4, 42, True)
        torch.testing.assert_close(y, target)
        torch.testing.assert_close(red[:, 0], blue[:, 2])
        self.assertFalse(torch.equal(y, images(4, 10042)[1]))

    def test_cli_outputs_and_learner_function_is_used(self):
        root = Path(__file__).parent
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            for name, flags in [('preference', ['--steps', '2', '--ops', str(root / 'common.py')]),
                                ('flow', ['--steps', '2', '--ops', str(root / 'common.py')]),
                                ('vision', ['--steps', '2']), ('cache', ['--length', '8', '--ops', str(root / 'common.py')])]:
                out = temp / name
                subprocess.run([sys.executable, str(root / (name+'.py')), *flags, '--out', str(out)],
                               check=True, capture_output=True, timeout=120)
                report = json.loads((out / 'report.json').read_text())
                self.assertEqual(report['schema'], 'model-craft-advanced-v1')
                self.assertTrue(report['sources'])
            self.assertTrue((temp / 'flow/samples.svg').is_file())
            stub = temp / 'stub.py'
            stub.write_text('def dpo_loss(*args, **kwargs):\n    raise RuntimeError("learner_function_called")\n')
            run = subprocess.run([sys.executable, str(root / 'preference.py'), '--steps', '1',
                                  '--ops', str(stub), '--out', str(temp / 'student-run')], capture_output=True, text=True)
            self.assertNotEqual(run.returncode, 0)
            self.assertIn('learner_function_called', run.stderr)


if __name__ == '__main__':
    unittest.main()
