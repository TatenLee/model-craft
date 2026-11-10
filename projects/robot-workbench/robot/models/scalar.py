"""Stage 01/02: the sensor calibration model y = w*x + b."""


def predict(xs, w, b):
    return [w*x+b for x in xs]


def fit(xs, ys, steps=200, lr=.05):
    if not xs or len(xs) != len(ys) or steps < 1 or lr <= 0:
        raise ValueError('nonempty aligned data and positive budget required')
    w = b = 0.
    losses = []
    for _ in range(steps):
        errors = [p-y for p, y in zip(predict(xs, w, b), ys)]
        losses.append(sum(x*x for x in errors)/len(xs))
        dw = 2*sum(error*x for error, x in zip(errors, xs))/len(xs)
        db = 2*sum(errors)/len(xs)
        w, b = w-lr*dw, b-lr*db
    return {'w': w, 'b': b, 'loss_before': losses[0], 'loss_last_before_update': losses[-1]}


def fit_calibration(model='linear', steps=400, seed=42, width=24):
    """Same sensor contract, nonlinear calibration data. No dynamics or action yet."""
    import torch
    from torch import nn
    if model not in ('linear', 'mlp') or steps < 1 or not isinstance(width, int) or width < 1:
        raise ValueError('linear/mlp, positive steps and positive integer width required')
    torch.set_num_threads(1)
    torch.manual_seed(seed)
    network = nn.Linear(1, 1) if model == 'linear' else nn.Sequential(nn.Linear(1, width), nn.Tanh(), nn.Linear(width, 1))
    x = torch.linspace(-2, 2, 64)[:, None]
    # Same domain, held-out input locations; do not claim OOD generalization.
    validation_x = torch.linspace(-1.97, 1.97, 63)[:, None]
    target = lambda inputs: 2*inputs+1+.5*inputs.square()
    optimizer = torch.optim.Adam(network.parameters(), lr=.02)
    for _ in range(steps):
        loss = (network(x)-target(x)).square().mean()
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        return {'model': model, 'steps': steps, 'seed': seed, 'width': width if model == 'mlp' else None,
                'parameters': sum(p.numel() for p in network.parameters()),
                'train_mse': float((network(x)-target(x)).square().mean()),
                'validation_mse': float((network(validation_x)-target(validation_x)).square().mean()),
                'scope': 'Nonlinear sensor calibration at held-out locations; not a world model or OOD test.'}
