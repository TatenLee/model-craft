"""Publish only allowlisted teaching assets; never include local experiment outputs."""
from pathlib import Path
import argparse
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = ["projects/README.md", "projects/requirements.txt", "projects/world-lab/lab.py",
         "projects/world-lab/test_lab.py", "projects/robot-lora/data.py",
         "projects/robot-lora/inspect_data.py", "projects/robot-lora/mechanics.py",
         "projects/robot-lora/train.py", "projects/robot-lora/test_train.py", "projects/robot-lora/requirements.txt",
         "projects/robot-lora/README.md", "projects/source-map/inspect_repo.py"]
FILES += ["dist/downloads/tiny_lm.py", "projects/advanced-labs/README.md",
          "projects/advanced-labs/common.py", "projects/advanced-labs/preference.py",
          "projects/advanced-labs/flow.py", "projects/advanced-labs/vision.py",
          "projects/advanced-labs/cache.py", "projects/advanced-labs/planning.py",
          "projects/advanced-labs/student_ops.py", "projects/advanced-labs/check_ops.py",
          "projects/advanced-labs/test_labs.py"]
FILES += [
    "projects/robot-workbench/README.md",
    "projects/robot-workbench/robot/__init__.py",
    "projects/robot-workbench/robot/contracts.py",
    "projects/robot-workbench/robot/environment.py",
    "projects/robot-workbench/robot/data.py",
    "projects/robot-workbench/robot/models/__init__.py",
    "projects/robot-workbench/robot/models/scalar.py",
    "projects/robot-workbench/robot/models/dynamics.py",
    "projects/robot-workbench/robot/models/perception.py",
    "projects/robot-workbench/robot/models/brain.py",
    "projects/robot-workbench/robot/training/__init__.py",
    "projects/robot-workbench/robot/training/supervised.py",
    "projects/robot-workbench/robot/training/distill.py",
    "projects/robot-workbench/robot/planning.py",
    "projects/robot-workbench/robot/agent.py",
    "projects/robot-workbench/robot/evaluation.py",
    "projects/robot-workbench/robot/cli.py",
    "projects/robot-workbench/robot/tests.py",
]
DEST = ROOT / "dist/downloads/model-craft-projects.zip"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    entries = {name: (ROOT / name).read_bytes() for name in FILES}
    entries[".gitignore"] = b".openai/local/\n.venv/\n__pycache__/\n*.pyc\n"
    if args.check:
        with zipfile.ZipFile(DEST) as archive:
            assert set(archive.namelist()) == set(entries), "download bundle file list differs"
            for name, data in entries.items():
                assert archive.read(name) == data, f"stale download asset: {name}"
        print(f"Project bundle matches {len(entries)} allowlisted files.")
    else:
        with zipfile.ZipFile(DEST, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, data in entries.items():
                info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, data)
        print(DEST.relative_to(ROOT))


if __name__ == "__main__":
    main()
