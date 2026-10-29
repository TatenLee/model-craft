#!/usr/bin/env python3
"""Run the same exercise assertions used in the Model Craft browser.

Usage: python check_exercises.py exercise_starters.py --exercise causal-mask
Only run Python source you trust: this intentionally executes the learner file.
"""
import argparse
import json
import runpy
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--exercise", help="Optional exercise id; omitted means all exercises")
    args = parser.parse_args()
    exercises = json.loads(Path(__file__).with_name("exercises.json").read_text(encoding="utf-8"))
    if args.exercise:
        exercises = [e for e in exercises if e["id"] == args.exercise]
        if not exercises:
            parser.error("Unknown exercise id")
    namespace = runpy.run_path(str(args.source))
    total = passed = 0
    for exercise in exercises:
        print("\n" + exercise["title"])
        for test in exercise["tests"]:
            total += 1
            try:
                exec(test["code"], dict(namespace))
            except Exception as error:
                print("  FAIL", test["name"], type(error).__name__, str(error))
            else:
                passed += 1
                print("  PASS", test["name"])
    print(f"\n{passed}/{total} tests passed")
    raise SystemExit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
