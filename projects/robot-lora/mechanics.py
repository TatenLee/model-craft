"""Inspect response-only SFT and an actual trainable LoRA layer without downloads."""
import torch
from torch import nn


def response_labels(prompt_ids, answer_ids, eos_id):
    if not prompt_ids or not answer_ids:
        raise ValueError("nonempty prompt and answer required")
    ids = list(prompt_ids) + list(answer_ids) + [eos_id]
    labels = [-100] * len(prompt_ids) + list(answer_ids) + [eos_id]
    # Hugging Face causal LMs shift labels internally. Do not shift twice.
    return ids, labels


class LoRALinear(nn.Module):
    def __init__(self, base, rank=2, alpha=2):
        super().__init__()
        if rank < 1:
            raise ValueError("positive rank required")
        self.base = base.requires_grad_(False)
        self.a = nn.Parameter(torch.randn(rank, base.in_features) * 0.01)
        self.b = nn.Parameter(torch.zeros(base.out_features, rank))
        self.scale = alpha / rank

    def forward(self, x):
        return self.base(x) + (x @ self.a.T @ self.b.T) * self.scale


def main():
    torch.manual_seed(42)
    ids, labels = response_labels([1, 2, 3], [4, 5], 6)
    print("input_ids:", ids, "labels:", labels)
    print("actual supervised prediction pairs:", list(zip(ids[:-1], labels[1:])))
    model = LoRALinear(nn.Linear(4, 3), rank=2)
    x, target = torch.randn(8, 4), torch.randn(8, 3)
    before = model.base.weight.detach().clone()
    torch.testing.assert_close(model(x), model.base(x))
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=0.05)
    losses = []
    for step in range(40):
        optimizer.zero_grad()
        loss = (model(x) - target).square().mean()
        loss.backward()
        if step == 0:
            print("first backward |grad A|, |grad B|:", model.a.grad.norm().item(), model.b.grad.norm().item())
        optimizer.step()
        losses.append(loss.item())
    assert torch.equal(before, model.base.weight)
    assert losses[-1] < losses[0]
    print("loss first/last:", losses[0], losses[-1])
    print("base frozen:", model.base.weight.grad is None)
    print("trainable/total:", sum(p.numel() for p in model.parameters() if p.requires_grad), "/", sum(p.numel() for p in model.parameters()))
    print("This verifies a LoRA linear layer; no pretrained language model has been fine-tuned.")


if __name__ == "__main__":
    main()
