"""Build a LOCAL reading index, never an assertion about an active training run."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
import subprocess

PROFILES = {
    "data": ["collat", "dataset", "lane", "schema"],
    "vision": ["visionencoder", "dinov3", "vision_encoder", "codec"],
    "backbone": ["backbone", "kda", "transformer", "attention"],
    "loss": ["loss_objective", "loss_sum", "cross_entropy", "latent_objective"],
    "state": ["detach_state", "reset_state", "merge_state", "state_nbytes"],
    "training": ["trainer", "normalize_and_step", "optimizer", "checkpoint"],
    "inference": ["generationengine", "generate", "sample_token", "rollout"],
}


def inspect(repo):
    hits = {key: [] for key in PROFILES}
    for path in sorted(repo.rglob("*.py")):
        rel = path.relative_to(repo)
        if path.is_symlink() or any(p.startswith(".") or p in {"node_modules", "tests", "test", "__pycache__", "common"} for p in rel.parts):
            continue
        if path.stat().st_size > 2_000_000:
            continue
        try:
            raw = path.read_bytes()
            tree = ast.parse(raw)
        except (OSError, SyntaxError, UnicodeError):
            continue
        for node in ast.walk(tree):
            if not isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for category, terms in PROFILES.items():
                if any(term in node.name.lower() for term in terms) and len(hits[category]) < 12:
                    hits[category].append({"file": rel.as_posix(), "line": node.lineno,
                                           "symbol": node.name, "sha256": hashlib.sha256(raw).hexdigest()})
    try:
        revision = subprocess.check_output(["git", "-C", str(repo), "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
        dirty = bool(subprocess.check_output(["git", "-C", str(repo), "status", "--porcelain"], text=True))
    except subprocess.CalledProcessError:
        revision, dirty = "unknown", None
    return {"schema": "model-craft-source-v1", "revision": revision, "dirty": dirty,
            "scope": "symbol index only; no active config, tensor, data or runtime verification", "groups": hits}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--repo", type=Path, required=True)
    p.add_argument("--out", type=Path, default=Path(".openai/local/omnifm-map.json"))
    args = p.parse_args()
    repo = args.repo.expanduser().resolve()
    if not repo.is_dir():
        p.error("repository directory does not exist")
    # Private source locations stay in the ignored local workspace.
    if not args.out.resolve().is_relative_to(Path(".openai/local").resolve()):
        p.error("write source maps under .openai/local/; do not publish internal source locations")
    result = inspect(repo)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote local symbol index: {args.out}; active training config remains unverified.")
    print({key: len(value) for key, value in result["groups"].items()})


if __name__ == "__main__":
    main()
