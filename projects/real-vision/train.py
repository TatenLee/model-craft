"""CIFAR-10 training lab. Never downloads data. Run --help before training."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import shutil
import tarfile
import time

import numpy as np
import torch
from torch import nn

CLASSES = ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck']


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def split_indices(n, seed):
    ids = np.random.default_rng(seed).permutation(n)
    cut = int(n * .8)
    return ids[:cut], ids[cut:]


def read_data(path):
    """Read the official binary archive in memory; no extraction or pickle."""
    arrays = []
    with tarfile.open(path, 'r:gz') as archive:
        for name in [f'data_batch_{i}.bin' for i in range(1, 6)] + ['test_batch.bin']:
            member = archive.getmember('cifar-10-batches-bin/' + name)
            if not member.isfile() or member.size != 10000 * 3073:
                raise ValueError('Expected official CIFAR-10 binary records: ' + name)
            raw = np.frombuffer(archive.extractfile(member).read(), dtype=np.uint8).reshape(-1, 3073)
            if np.any(raw[:, 0] > 9):
                raise ValueError('Invalid labels')
            arrays.append((raw[:, 1:].reshape(-1, 3, 32, 32).copy(), raw[:, 0].astype(np.int64)))
    return (np.concatenate([x for x, y in arrays[:5]]), np.concatenate([y for x, y in arrays[:5]])), arrays[5]


class Classifier(nn.Module):
    def __init__(self, arch):
        super().__init__()
        self.net = (nn.Sequential(nn.Flatten(), nn.Linear(3072, 10)) if arch == 'linear' else
                    nn.Sequential(nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                                  nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
                                  nn.Flatten(), nn.Linear(64 * 8 * 8, 128), nn.ReLU(), nn.Linear(128, 10)))

    def forward(self, x):
        return self.net(x)


def tensor(x, device):
    return (torch.as_tensor(x, device=device).float() / 255.0 - .5) / .5


def evaluate(model, x, y, device, batch=128):
    model.eval()
    loss, preds = 0.0, []
    with torch.no_grad():
        for start in range(0, len(y), batch):
            targets = torch.as_tensor(y[start:start + batch], device=device)
            logits = model(tensor(x[start:start + batch], device))
            loss += nn.functional.cross_entropy(logits, targets, reduction='sum').item()
            preds.extend(logits.argmax(-1).cpu().tolist())
    preds = np.asarray(preds)
    confusion = np.zeros((10, 10), dtype=np.int64)
    np.add.at(confusion, (y, preds), 1)
    wrong = np.flatnonzero(preds != y)[:20]
    return {'loss': loss / len(y), 'accuracy': float((preds == y).mean()),
            'count': len(y), 'confusion_true_rows_pred_cols': confusion.tolist(),
            'mistakes': [{'subset_index': int(i), 'target': int(y[i]), 'prediction': int(preds[i])} for i in wrong]}


def write_error_gallery(x, metrics, path):
    """Self-contained, offline HTML with literal pixel SVGs; no plotting dependency."""
    cards = []
    for item in metrics['mistakes']:
        pixels = x[item['subset_index']].transpose(1, 2, 0)
        rects = ''.join(f'<rect x="{col}" y="{row}" width="1" height="1" fill="rgb({int(r)},{int(g)},{int(b)})"/>'
                        for row, line in enumerate(pixels) for col, (r, g, b) in enumerate(line))
        title = f"subset {item['subset_index']} | true: {CLASSES[item['target']]} | predicted: {CLASSES[item['prediction']]}"
        cards.append(f'<figure><svg viewBox="0 0 32 32" role="img" aria-label="{title}">{rects}</svg><figcaption>{title}</figcaption></figure>')
    body = ''.join(cards) or '<p>No errors found in this evaluation subset.</p>'
    html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Classifier errors</title><style>body{font:16px/1.7 sans-serif;margin:32px}main{display:flex;flex-wrap:wrap}figure{width:220px;margin:16px}svg{width:192px;image-rendering:pixelated}figcaption{overflow-wrap:anywhere}</style><h1>First 20 classification errors</h1><p>Original 32×32 pixels enlarged. These examples describe this checkpoint and split only.</p><main>'+body+'</main></html>'
    with path.open('x', encoding='utf-8') as stream: stream.write(html)


def train_arrays(x, y, vx, vy, config, out, resume=None):
    """Also used by offline tests; fixture results are never described as CIFAR scores."""
    device = config['device']
    random.seed(config['seed']); np.random.seed(config['seed']); torch.manual_seed(config['seed'])
    if device == 'cuda': torch.cuda.manual_seed_all(config['seed'])
    model = Classifier(config['arch']).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=config['lr'])
    start, history = 0, []
    if resume:
        saved = torch.load(resume, map_location=device, weights_only=True)
        for key in ['arch', 'lr', 'seed', 'batch', 'train_size', 'val_size', 'shuffle_labels', 'data_sha256', 'device']:
            if saved['config'][key] != config[key]:
                raise ValueError('Resume configuration changed: ' + key)
        model.load_state_dict(saved['model']); opt.load_state_dict(saved['optimizer'])
        start, history = saved['epoch'], saved['history']
        prior_best = Path(resume).parent / 'best.pt'
        if prior_best.exists(): shutil.copy2(prior_best, out / 'best.pt')
        if config['epochs'] <= start: raise ValueError('epochs must exceed the saved epoch')
    baseline = evaluate(model, vx, vy, device, config['batch'])
    majority = int(np.bincount(y, minlength=10).argmax())
    for epoch in range(start, config['epochs']):
        model.train(); loss_sum, correct, began = 0.0, 0, time.perf_counter()
        order = np.random.default_rng(config['seed'] + epoch).permutation(len(y))
        for begin in range(0, len(y), config['batch']):
            ids = order[begin:begin + config['batch']]
            targets = torch.as_tensor(y[ids], device=device)
            opt.zero_grad(set_to_none=True)
            logits = model(tensor(x[ids], device)); loss = nn.functional.cross_entropy(logits, targets)
            if not torch.isfinite(loss): raise ValueError('Non-finite loss; inspect input and learning rate')
            loss.backward(); opt.step()
            loss_sum += loss.item() * len(ids); correct += int((logits.argmax(-1) == targets).sum())
        metrics = evaluate(model, vx, vy, device, config['batch'])
        row = {'epoch': epoch + 1, 'train_loss': loss_sum / len(y), 'train_accuracy': correct / len(y),
               'val_loss': metrics['loss'], 'val_accuracy': metrics['accuracy'], 'seconds': time.perf_counter() - began}
        history.append(row); print(json.dumps(row), flush=True)
        torch.save({'model': model.state_dict(), 'optimizer': opt.state_dict(), 'epoch': epoch + 1,
                    'config': config, 'history': history}, out / 'last.pt')
        if metrics['loss'] <= min(r['val_loss'] for r in history):
            torch.save({'model': model.state_dict(), 'config': config, 'epoch': epoch + 1}, out / 'best.pt')
        # If an old best was not retained, last.pt still records the current model.
        report = {'schema': 'model-craft-real-vision-v1', 'config': config, 'classes': CLASSES,
                  'initial_or_resume_validation': baseline, 'majority_validation_accuracy': float((vy == majority).mean()),
                  'history': history, 'last_validation': metrics, 'torch_version': str(torch.__version__),
                  'code_sha256': digest(__file__), 'resume': str(resume) if resume else None}
        (out / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    return model, report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('mode', choices=['inspect', 'train', 'evaluate'])
    p.add_argument('--data', type=Path, required=True, help='Downloaded official cifar-10-binary.tar.gz')
    p.add_argument('--out', type=Path, default=Path('.openai/local/real-vision/run'))
    p.add_argument('--arch', choices=['linear', 'cnn'], default='cnn')
    p.add_argument('--device', choices=['cpu', 'mps', 'cuda'], default='cpu')
    p.add_argument('--epochs', type=int, default=5)
    p.add_argument('--batch', type=int, default=64)
    p.add_argument('--lr', type=float, default=.001)
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--train-size', type=int, default=5000)
    p.add_argument('--val-size', type=int, default=1000)
    p.add_argument('--shuffle-labels', action='store_true')
    p.add_argument('--resume', type=Path)
    p.add_argument('--checkpoint', type=Path)
    p.add_argument('--error-gallery', type=Path, help='With evaluate: write a new standalone HTML file for wrong predictions')
    p.add_argument('--split', choices=['validation', 'test'], default='validation')
    args = p.parse_args()
    if min(args.epochs, args.batch, args.train_size, args.val_size) < 1 or not np.isfinite(args.lr) or args.lr <= 0:
        p.error('sizes, epochs, batch and lr must be positive')
    if args.train_size > 40000 or args.val_size > 10000: p.error('subset exceeds fixed 80/20 development split')
    md5 = hashlib.md5()
    with args.data.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''): md5.update(chunk)
    if md5.hexdigest() != 'c32a1d4ab5d03f1284b67883e8d87530':
        p.error('Checksum differs from the official CIFAR-10 binary archive; verify download/version')
    (x, y), (tx, ty) = read_data(args.data)
    sha = digest(args.data)
    if args.mode == 'inspect':
        print(json.dumps({'shape': list(x.shape), 'dtype': str(x.dtype), 'range': [int(x.min()), int(x.max())],
                          'train_counts': np.bincount(y, minlength=10).tolist(), 'official_test_count': len(ty),
                          'classes': CLASSES, 'sha256': sha}, indent=2)); return
    if args.mode == 'evaluate':
        if not args.checkpoint: p.error('evaluate requires --checkpoint')
        saved = torch.load(args.checkpoint, map_location=args.device, weights_only=True)
        config = saved['config']
        if sha != config['data_sha256']: p.error('Data checksum differs from training')
        _, vids = split_indices(len(y), config['seed']); vids = vids[:config['val_size']]
        ex, ey = (tx, ty) if args.split == 'test' else (x[vids], y[vids])
        model = Classifier(config['arch']).to(args.device); model.load_state_dict(saved['model'])
        metrics = {'split': args.split, 'checkpoint_sha256': digest(args.checkpoint), **evaluate(model, ex, ey, args.device)}
        if args.error_gallery: write_error_gallery(ex, metrics, args.error_gallery)
        print(json.dumps(metrics, indent=2)); return
    ids, vids = split_indices(len(y), args.seed); ids, vids = ids[:args.train_size], vids[:args.val_size]
    config = {k: getattr(args, k) for k in ['arch', 'device', 'epochs', 'batch', 'lr', 'seed', 'train_size', 'val_size', 'shuffle_labels']}
    config['data_sha256'] = sha
    if args.out.exists() and any(args.out.iterdir()): p.error('Use a new output directory to preserve previous evidence')
    args.out.mkdir(parents=True, exist_ok=True)
    train_y = y[ids].copy()
    if args.shuffle_labels: np.random.default_rng(args.seed + 100).shuffle(train_y)
    np.savez(args.out / 'split_indices.npz', train=ids, validation=vids)
    train_arrays(x[ids], train_y, x[vids], y[vids], config, args.out, args.resume)


if __name__ == '__main__': main()
