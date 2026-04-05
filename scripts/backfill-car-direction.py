#!/usr/bin/env python3
"""
Backfill car direction detection for all pixel art side views.

Usage:
  python scripts/backfill-car-direction.py              # dry run (preview only)
  python scripts/backfill-car-direction.py --apply       # apply changes to database
"""

import os
import sys
import time
from pathlib import Path

import requests

# Load env
env_file = Path(__file__).parent.parent / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

API_BASE = os.environ.get("API_BASE", "http://localhost:3002")

dry_run = "--apply" not in sys.argv


def main():
    mode = "DRY RUN (preview only)" if dry_run else "LIVE (updating database)"
    print(f"Car Direction Backfill — {mode}")
    print("=" * 50)

    if dry_run:
        print("  Pass --apply to actually update the database.\n")

    start = time.time()
    try:
        res = requests.post(
            f"{API_BASE}/api/registrations/pixel-art/detect-direction",
            json={"backfill": True, "dry_run": dry_run},
            timeout=600,
        )
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    elapsed = time.time() - start

    if not res.ok:
        print(f"ERROR: {res.status_code} — {res.text}")
        sys.exit(1)

    data = res.json()
    results = data.get("results", [])

    print(f"  Total cars: {data['total']}")
    print(f"  Facing LEFT (need flip):  {data['facing_left']}")
    print(f"  Facing RIGHT (correct):   {data['facing_right']}")
    print(f"  Time: {elapsed:.1f}s")
    print()

    for r in results:
        direction = "← LEFT" if r["facing_left"] else "→ RIGHT"
        status = "(updated)" if r.get("updated") else "(preview)"
        marker = "⚠️ " if r["facing_left"] else "  "
        print(f"  {marker}#{r['car_number']:>3}  {r['name']:<45} {direction}  {status}")

    print(f"\nDone! {data['facing_left']} cars need flipping out of {data['total']}.")

    if dry_run and data["facing_left"] > 0:
        print("\nRun with --apply to update the database.")


if __name__ == "__main__":
    main()
