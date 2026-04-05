#!/usr/bin/env python3
"""
Regenerate all dashboard pixel art images with wider panoramic prompt.
Calls the regenerate API endpoint for each registration's dashboard.

Usage:
  python3 scripts/regen-dashboards.py           # regenerate all
  python3 scripts/regen-dashboards.py --dry-run  # just list what would be regenerated

Requires: requests, .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("Run: pip3 install requests")
    sys.exit(1)

# Load env
env_file = Path(__file__).parent.parent / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
# Local dev server for the regenerate API
API_BASE = os.environ.get("API_BASE", "http://localhost:3002")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def get_registrations():
    """Get all registrations that have dashboard images."""
    url = f"{SUPABASE_URL}/rest/v1/registrations?pixel_dashboard_url=not.is.null&select=id,car_number,vehicle_year,vehicle_make,vehicle_model&order=car_number.asc"
    res = requests.get(url, headers={**HEADERS, "Content-Type": "application/json"})
    res.raise_for_status()
    return res.json()


def main():
    dry_run = "--dry-run" in sys.argv

    regs = get_registrations()
    print(f"Found {len(regs)} registrations with dashboards\n")

    if dry_run:
        for r in regs:
            print(f"  #{r['car_number']} {r['vehicle_year']} {r['vehicle_make']} {r['vehicle_model']}")
        print(f"\nDry run — pass without --dry-run to regenerate all")
        return

    print(f"Regenerating dashboards via {API_BASE}")
    print("This will take a while (~15-30s per image)...\n")

    success = 0
    failed = 0

    for i, r in enumerate(regs):
        car_desc = f"#{r['car_number']} {r['vehicle_year']} {r['vehicle_make']} {r['vehicle_model']}"
        print(f"  [{i+1}/{len(regs)}] {car_desc}...", end=" ", flush=True)

        try:
            start = time.time()
            res = requests.post(
                f"{API_BASE}/api/registrations/pixel-art/regenerate",
                json={"registration_id": r["id"], "type": "dashboard"},
                timeout=180,
            )

            elapsed = time.time() - start

            if res.ok:
                data = res.json()
                timing = data.get("timing", {})
                gen_sec = timing.get("generateMs", 0) / 1000
                print(f"done ({elapsed:.0f}s total, gen {gen_sec:.1f}s)")
                success += 1
            else:
                print(f"FAILED ({res.status_code}: {res.text[:100]})")
                failed += 1
        except Exception as e:
            print(f"ERROR ({e})")
            failed += 1

    print(f"\nDone! {success} regenerated, {failed} failed.")

    if success > 0:
        print("\nNow re-cropping all dashboards...")
        os.system("python3 scripts/crop-dashboards.py --upload")


if __name__ == "__main__":
    main()
