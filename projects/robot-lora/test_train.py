"""Offline interface smoke test on a randomly initialized tiny Qwen2, not a benchmark."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import torch
from tokenizers import Tokenizer, models, pre_tokenizers, trainers
from transformers import PreTrainedTokenizerFast, Qwen2Config, Qwen2ForCausalLM
from data import build_dataset
from mechanics import LoRALinear, response_labels


class SFTTests(unittest.TestCase):
    def test_frozen_lora_and_initial_output(self):
        torch.manual_seed(42)
        layer = LoRALinear(torch.nn.Linear(4, 3))
        x = torch.randn(2, 4)
        torch.testing.assert_close(layer(x), layer.base(x))
        layer(x).sum().backward()
        self.assertIsNone(layer.base.weight.grad)
        self.assertEqual(layer.a.grad.norm().item(), 0)
        self.assertGreater(layer.b.grad.norm().item(), 0)
        self.assertEqual(response_labels([1, 2], [3], 4), ([1, 2, 3, 4], [-100, -100, 3, 4]))

    def test_baseline_full_and_lora_cli_offline(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            backend = Tokenizer(models.BPE(unk_token="<unk>"))
            backend.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
            corpus = [r["prompt"] + r["response"] for rows in build_dataset().values() for r in rows]
            backend.train_from_iterator(corpus, trainer=trainers.BpeTrainer(vocab_size=384,
                special_tokens=["<unk>", "<eos>", "<pad>"], initial_alphabet=pre_tokenizers.ByteLevel.alphabet()))
            tokenizer = PreTrainedTokenizerFast(tokenizer_object=backend, unk_token="<unk>", eos_token="<eos>", pad_token="<pad>")
            base = root / "tiny-base"
            tokenizer.save_pretrained(base)
            config = Qwen2Config(vocab_size=len(tokenizer), hidden_size=16, intermediate_size=32,
                                num_hidden_layers=1, num_attention_heads=2, num_key_value_heads=1,
                                max_position_embeddings=512, eos_token_id=tokenizer.eos_token_id,
                                pad_token_id=tokenizer.pad_token_id)
            Qwen2ForCausalLM(config).save_pretrained(base)
            reports = {}
            for mode in ["baseline", "full", "lora"]:
                out = root / mode
                command = [sys.executable, str(Path(__file__).with_name("train.py")),
                           "--base", str(base), "--mode", mode, "--steps", "1", "--rank", "2", "--out", str(out)]
                subprocess.run(command, check=True, capture_output=True, timeout=120,
                               env={**os.environ, "HF_HUB_OFFLINE": "1", "TOKENIZERS_PARALLELISM": "false"})
                reports[mode] = json.loads((out / "report.json").read_text())
                self.assertEqual(reports[mode]["metrics"]["validation"]["count"], 12)
                self.assertNotIn("test", reports[mode]["metrics"])
            self.assertEqual(reports["baseline"]["steps"], 0)
            self.assertEqual(len(reports["full"]["history"]), 1)
            self.assertGreater(reports["lora"]["trainable_parameters"], 0)
            self.assertLess(reports["lora"]["trainable_parameters"], reports["full"]["trainable_parameters"])
            self.assertTrue((root / "lora/model/adapter_config.json").is_file())


if __name__ == "__main__":
    unittest.main()
