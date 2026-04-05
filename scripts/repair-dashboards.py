#!/usr/bin/env python3
"""
Repair specific damaged dashboard images by regenerating them via the API.
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

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
API_BASE = os.environ.get("API_BASE", "http://localhost:3002")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

# Car numbers that were damaged by the bad prompt
DAMAGED = [17, 18, 19, 20, 21, 22, 25, 26, 27, 28, 29]


def main():
    # Fetch registration IDs for damaged car numbers
    car_list = ",".join(f"eq.{n}" for n in DAMAGED)
    url = f"{SUPABASE_URL}/rest/v1/registrations?car_number=in.({','.join(str(n) for n in DAMAGED)})&select=id,car_number,vehicle_year,vehicle_make,vehicle_model&order=car_number.asc"
    res = requests.get(url, headers={**HEADERS, "Content-Type": "application/json"})
    res.raise_for_status()
    regs = res.json()

    print(f"Found {len(regs)} damaged dashboards to repair:\n")
    for r in regs:
        print(f"  #{r['car_number']} {r['vehicle_year']} {r['vehicle_make']} {r['vehicle_model']}")
    print()

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
                print(f"done ({elapsed:.0f}s, gen {gen_sec:.1f}s)")
                success += 1
            else:
                print(f"FAILED ({res.status_code})")
                failed += 1
        except Exception as e:
            print(f"ERROR ({e})")
            failed += 1

    print(f"\nDone! {success} repaired, {failed} failed.")


if __name__ == "__main__":
    main()
