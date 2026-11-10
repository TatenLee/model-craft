"""Two-domain, two-step on-policy distillation mechanism; not the full MOPD recipe.

Analytic frozen teachers stand in for separately RL-trained domain experts. A student
samples its own first action; the domain teacher scores the same resulting context.
We use full-distribution reverse KL at visited states, without differentiating through
the discrete state visitation. This is a teaching surrogate, not a full sequence PG loss.
"""
import torch


def teacher_probs(domain, previous, step):
    target = domain*2 if step == 0 else (previous+domain+1) % 3
    probs = torch.full((3,), .05)
    probs[target] = .9
    return probs


def reverse_kl(student_logits, teacher):
    if student_logits.shape != teacher.shape or not torch.isfinite(student_logits).all() or not torch.isfinite(teacher).all() or not (teacher > 0).all() or not torch.allclose(teacher.sum(-1), torch.ones_like(teacher.sum(-1))):
        raise ValueError('positive normalized teacher probabilities required')
    logp = student_logits.log_softmax(-1)
    return (logp.exp()*(logp-teacher.detach().log())).sum(-1).mean()


def train_distillation(steps=200, seed=42):
    if steps < 1:
        raise ValueError('positive step budget required')
    torch.set_num_threads(1)
    torch.manual_seed(seed)
    # [domain, step (first uses slot 0; second uses previous+1), action]
    logits = torch.nn.Parameter(torch.zeros(2, 4, 3))
    optimizer = torch.optim.Adam([logits], lr=.06)
    def score():
        with torch.no_grad():
            return [sum(float(reverse_kl(logits[d, slot], teacher_probs(d, slot-1, int(slot>0)))) for slot in range(4))/4 for d in range(2)]
    before = score()
    traces = []
    for step in range(steps):
        losses = []
        for domain in range(2):
            previous = 0
            for time in range(2):
                slot = 0 if time == 0 else previous+1
                student = logits[domain, slot]
                sampled = int(torch.multinomial(student.detach().softmax(-1), 1))
                teacher = teacher_probs(domain, previous, time)
                losses.append(reverse_kl(student, teacher))
                if step in (0, steps-1):
                    traces.append({'iteration': step, 'domain': domain, 'time': time,
                                   'student_action': sampled, 'teacher_argmax': int(teacher.argmax()),
                                   'teacher_logp_on_student_action': float(teacher[sampled].log())})
                previous = sampled
        loss = torch.stack(losses).mean()
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()
    return {'before_reverse_kl_by_domain': before, 'after_reverse_kl_by_domain': score(),
            'traces': traces, 'steps': steps,
            'scope': 'Two-step tabular student, analytic frozen teachers, full-distribution KL on student-visited contexts. No domain RL or language-model training.'}
