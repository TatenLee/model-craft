import copy
import json
import math
import unittest
from lifecycle import EVAL, experiment, nll, add_distribution


class LifecycleTests(unittest.TestCase):
    def test_branches_budget_and_roundtrip(self):
        models, report = experiment(0.5)
        self.assertEqual([s["parent"] for s in report["stages"]], [None, "base", "base", "mixed"])
        for name, expected in [("base",400),("mixed",600),("domain_only",600),("task_demo",800)]:
            self.assertAlmostEqual(sum(map(sum,models[name]["counts"])),expected)
            restored=json.loads(json.dumps(models[name]))
            for strings in EVAL.values():
                self.assertEqual(nll(models[name], strings), nll(restored, strings))
                self.assertTrue(math.isfinite(nll(restored, strings)))
        snapshot=copy.deepcopy(models["base"])
        add_distribution(models["mixed"], ["cat"], 10)
        self.assertEqual(models["base"],snapshot)

    def test_proportion_changes_effect_without_changing_base(self):
        lo,_=experiment(0.2)
        hi,_=experiment(0.8)
        self.assertEqual(lo["base"],hi["base"])
        self.assertEqual(lo["domain_only"],hi["domain_only"])
        self.assertNotEqual(lo["mixed"],hi["mixed"])
        self.assertEqual(experiment(0.8),experiment(0.8))
        for x in [-0.1,1.1,float("nan"),float("inf")]:
            with self.assertRaises(ValueError): experiment(x)


if __name__ == "__main__":
    unittest.main()
