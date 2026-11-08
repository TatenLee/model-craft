"""Position probe: trainable CNN, frozen random CNN, or locally supplied frozen DINOv3."""
from pathlib import Path
import torch
from common import arguments, setup, save


def images(n, seed, blue=False):
    rng = torch.Generator().manual_seed(seed)
    position = torch.rand(n, 2, generator=rng) * 1.6 - .8
    grid = torch.linspace(-1, 1, 24)
    yy, xx = torch.meshgrid(grid, grid, indexing='ij')
    blob = torch.exp(-((xx-position[:, 0, None, None])**2 + (yy-position[:, 1, None, None])**2) / .04)
    pixels = torch.zeros(n, 3, 24, 24)
    pixels[:, 2 if blue else 0] = blob
    return pixels, position


class CNN(torch.nn.Module):
    def __init__(self, pooled=False):
        super().__init__()
        self.pooled = pooled
        self.layers = torch.nn.Sequential(torch.nn.Conv2d(3, 8, 3, padding=1), torch.nn.ReLU(),
                                         torch.nn.Conv2d(8, 16, 3, padding=1), torch.nn.ReLU())

    def forward(self, x):
        h = self.layers(x)
        return torch.nn.functional.adaptive_avg_pool2d(h, 1 if self.pooled else 4).flatten(1)


class FrozenDino(torch.nn.Module):
    def __init__(self, repo, weights, pooled=False):
        super().__init__()
        if not Path(repo).is_dir() or not Path(weights).is_file():
            raise ValueError('Provide a trusted local official DINOv3 checkout and authorized weights')
        self.model = torch.hub.load(str(Path(repo).resolve()), 'dinov3_vits16', source='local',
                                    weights=str(Path(weights).resolve())).requires_grad_(False).eval()
        self.pooled = pooled

    def forward(self, x):
        self.model.eval()
        x = torch.nn.functional.interpolate(x, (224, 224), mode='bilinear', align_corners=False)
        mean = x.new_tensor([.485, .456, .406])[None, :, None, None]
        std = x.new_tensor([.229, .224, .225])[None, :, None, None]
        with torch.no_grad():
            features = self.model.forward_features((x - mean) / std)['x_norm_patchtokens']
        if self.pooled:
            return features.mean(1)
        side = int(features.shape[1] ** .5)
        if side * side != features.shape[1]:
            raise ValueError('Expected square patch grid for the chosen 224x224 input')
        grid = features.transpose(1, 2).reshape(len(x), -1, side, side)
        return torch.nn.functional.adaptive_avg_pool2d(grid, 4).flatten(1)


def main():
    parser = arguments(__doc__)
    parser.add_argument('--encoder', choices=['cnn', 'random-frozen', 'dinov3'], default='cnn')
    parser.add_argument('--pool', choices=['spatial', 'mean'], default='spatial')
    parser.add_argument('--dino-repo', default='')
    parser.add_argument('--dino-weights', default='')
    args = parser.parse_args()
    setup(args)
    encoder = FrozenDino(args.dino_repo, args.dino_weights, args.pool == 'mean') if args.encoder == 'dinov3' else CNN(args.pool == 'mean')
    if args.encoder != 'cnn':
        encoder.requires_grad_(False).eval()
    data = {'train': images(96, args.seed), 'validation': images(48, args.seed + 10000),
            'color_shift': images(48, args.seed + 10000, blue=True)}
    # Freeze and cache the same features for all training steps in linear-probe modes.
    if args.encoder != 'cnn':
        with torch.no_grad():
            data = {name: (torch.cat([encoder(part) for part in x.split(8)]), y) for name, (x, y) in data.items()}
        feature_size = data['train'][0].shape[-1]
        model = torch.nn.Linear(feature_size, 2)
    else:
        feature_size = encoder(data['train'][0][:1]).shape[-1]
        model = torch.nn.Sequential(encoder, torch.nn.Linear(feature_size, 2))
    optimizer = torch.optim.AdamW(model.parameters(), lr=.003)

    def evaluate():
        model.eval()
        with torch.no_grad():
            return {name: (model(x)-y).square().mean().item() for name, (x, y) in data.items() if name != 'train'}

    before = evaluate()
    history = []
    x, y = data['train']
    for step in range(args.steps):
        model.train()
        loss = (model(x)-y).square().mean()
        optimizer.zero_grad(); loss.backward(); optimizer.step()
        if step == 0 or (step+1) % 25 == 0:
            history.append({'step': step+1, 'train_mse': loss.item()})
    save(args, 'visual-position-probe', {'feature_dim': feature_size, 'before': before,
         'position_mse': evaluate(), 'zero_position_baseline': {n: y.square().mean().item() for n, (_, y) in data.items() if n != 'train'},
         'trainable_parameters': sum(p.numel() for p in model.parameters() if p.requires_grad),
         'history': history, 'scope': 'Synthetic single-object position task. CNN is not DINO; DINO branch needs local dependencies/weights and is not automatically validated.'}, model)


if __name__ == '__main__':
    main()
