"""A rule baseline. This is NOT a language model or an SFT-trained brain."""
import re


class RuleBrain:
    def plan(self, instruction):
        # Closed vocabulary makes the baseline auditable; unknown commands fail explicitly.
        tokens = re.findall(r'red|blue|红色|蓝色', instruction.lower())
        if not tokens or len(tokens) > 8:
            raise ValueError('use 1–8 explicit red/blue goals')
        if any(word in instruction.lower() for word in ('不要', 'not', '除了')):
            raise ValueError('negation requires a stronger language adapter')
        return [{'红色': 'red', '蓝色': 'blue'}.get(t, t) for t in tokens]
