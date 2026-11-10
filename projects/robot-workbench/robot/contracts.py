"""Shared interfaces. Model internals may change; callers keep these contracts."""
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Observation:
    tick: int
    proprio: tuple[float, float]  # position, velocity; both in simulator units
    camera: list[list[float]]    # [31 pixels, robot/red/blue channels]


@dataclass(frozen=True)
class Goal:
    name: str
    position: float


class World(Protocol):
    def __call__(self, observations, actions, state=None):
        """[B,T,O], [B,T,1], optional memory -> predictions [B,T,O], memory."""


class Brain(Protocol):
    def plan(self, instruction: str) -> list[str]:
        """Return ordered goal names. Execution and verification are elsewhere."""
