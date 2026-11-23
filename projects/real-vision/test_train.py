import contextlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

import numpy as np
import torch
from train import split_indices, train_arrays, evaluate, read_data, write_error_gallery


class TrainingTests(unittest.TestCase):
    def setUp(self):
        torch.set_num_threads(1)
        self.tmp = tempfile.TemporaryDirectory(); self.root = Path(self.tmp.name)
        self.y = np.arange(32, dtype=np.int64) % 2
        self.x = np.broadcast_to((self.y * 255).astype(np.uint8)[:, None, None, None], (32, 3, 32, 32)).copy()
        self.cfg = dict(arch='linear', device='cpu', epochs=3, batch=8, lr=.001, seed=42,
                        train_size=32, val_size=32, shuffle_labels=False, data_sha256='0'*64)

    def tearDown(self): self.tmp.cleanup()

    def run_training(self, name, cfg, resume=None):
        out = self.root / name; out.mkdir()
        with contextlib.redirect_stdout(io.StringIO()):
            model, report = train_arrays(self.x, self.y, self.x, self.y, cfg, out, resume)
        return model, report, out

    def test_fixture_learns_and_reload_matches(self):
        model, report, out = self.run_training('base', self.cfg)
        self.assertLess(report['history'][-1]['val_loss'], report['initial_or_resume_validation']['loss'])
        self.assertEqual(report['history'][-1]['val_accuracy'], 1)
        state = torch.load(out / 'last.pt', weights_only=True)
        from train import Classifier
        restored = Classifier('linear'); restored.load_state_dict(state['model'])
        self.assertEqual(evaluate(restored, self.x, self.y, 'cpu'), evaluate(model, self.x, self.y, 'cpu'))
        self.assertEqual(json.loads((out/'report.json').read_text())['schema'], 'model-craft-real-vision-v1')

    def test_cnn_fixture_learns_and_confusion_accounts_for_all_examples(self):
        _, report, _ = self.run_training('cnn', {**self.cfg, 'arch': 'cnn'})
        self.assertLess(report['history'][-1]['val_loss'], report['initial_or_resume_validation']['loss'])
        matrix = np.array(report['last_validation']['confusion_true_rows_pred_cols'])
        np.testing.assert_array_equal(matrix.sum(axis=1), np.bincount(self.y, minlength=10))
        self.assertEqual(matrix.sum(), len(self.y))

    def test_resume_matches_uninterrupted_and_rejects_changed_recipe(self):
        full, _, _ = self.run_training('full', self.cfg)
        _, _, first = self.run_training('first', {**self.cfg, 'epochs': 1})
        resumed, _, out = self.run_training('resume', self.cfg, first/'last.pt')
        for key, value in full.state_dict().items(): torch.testing.assert_close(value, resumed.state_dict()[key], rtol=0, atol=0)
        self.assertTrue((out/'best.pt').exists())
        with self.assertRaisesRegex(ValueError, 'configuration changed'):
            self.run_training('bad', {**self.cfg, 'lr': .01}, first/'last.pt')

    def test_error_gallery_uses_the_reported_subset_and_preserves_previous_files(self):
        path = self.root / 'errors.html'
        metrics = {'mistakes': [{'subset_index': 1, 'target': 1, 'prediction': 0}]}
        write_error_gallery(self.x, metrics, path)
        html = path.read_text()
        self.assertIn('true: automobile | predicted: airplane', html)
        self.assertIn('rgb(255,255,255)', html)
        self.assertEqual(html.count('<rect '), 1024)
        with self.assertRaises(FileExistsError): write_error_gallery(self.x, metrics, path)

    def test_split_is_disjoint_and_reproducible(self):
        train, val = split_indices(50000, 42)
        self.assertEqual(len(train), 40000);self.assertEqual(len(val), 10000)
        self.assertEqual(len(set(train)&set(val)), 0)
        np.testing.assert_array_equal(train, split_indices(50000, 42)[0])

    def test_binary_reader_layout_without_download_or_extraction(self):
        path = self.root/'fixture.tar.gz'
        record = bytes([3])+bytes([10])*1024+bytes([20])*1024+bytes([30])*1024
        raw = record*10000
        with tarfile.open(path, 'w:gz') as archive:
            for name in [f'data_batch_{i}.bin' for i in range(1,6)]+['test_batch.bin']:
                info=tarfile.TarInfo('cifar-10-batches-bin/'+name);info.size=len(raw);archive.addfile(info,io.BytesIO(raw))
        (x,y),(tx,ty)=read_data(path)
        self.assertEqual(x.shape,(50000,3,32,32));self.assertEqual(tx.shape,(10000,3,32,32))
        self.assertEqual(x[0,:,0,0].tolist(),[10,20,30]);self.assertTrue((y==3).all())
        self.assertFalse((self.root/'cifar-10-batches-bin').exists())


if __name__=='__main__': unittest.main()
