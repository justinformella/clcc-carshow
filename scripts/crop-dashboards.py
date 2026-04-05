#!/usr/bin/env python3
"""
Crop dashboard pixel art images to remove windshield and sky.
Downloads dash-*.png files from Supabase, crops top 45%, uploads as dash-*-cropped.png,
and updates pixel_dash_cropped_url in the database.

Usage:
  python3 scripts/crop-dashboards.py              # preview (saves to stripped-preview/)
  python3 scripts/crop-dashboards.py --upload      # crop and upload to Supabase
  python3 scripts/crop-dashboards.py dash-abc.png  # single file

Requires:
  pip3 install pillow requests
"""

import os
import sys
import io
import time
from pathlib import Path

try:
    from PIL import Image
    import requests
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip3 install pillow requests")
    sys.exit(1)

# Load env from .env.local
env_file = Path(__file__).parent.parent / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "pixel-art"
CROP_RATIO = 0.40  # Remove top 40% of image

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def list_files():
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    res = requests.post(url, headers={**HEADERS, "Content-Type": "application/json"},
                        json={"prefix": "", "limit": 1000})
    res.raise_for_status()
    return [f["name"] for f in res.json() if f.get("name")]


def download_file(filename):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    res = requests.get(url, headers=HEADERS)
    res.raise_for_status()
    return res.content


def upload_file(filename, data):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    res = requests.put(url, headers={**HEADERS, "Content-Type": "image/png",
                                      "x-upsert": "true"}, data=data)
    res.raise_for_status()


def process_file(filename, preview_dir=None):
    print(f"  {filename}...", end=" ", flush=True)

    try:
        data = download_file(filename)
    except Exception as e:
        print(f"SKIP (download failed: {e})")
        return False

    print("cropping...", end=" ", flush=True)
    img = Image.open(io.BytesIO(data))
    w, h = img.size
    crop_y = int(h * CROP_RATIO)
    cropped = img.crop((0, crop_y, w, h))

    buf = io.BytesIO()
    cropped.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    if preview_dir:
        cropped_name = filename.replace(".png", "-cropped.png")
        out_path = os.path.join(preview_dir, cropped_name)
        with open(out_path, "wb") as f:
            f.write(png_bytes)
        print("saved")
    else:
        # Extract registration ID from filename: dash-{uuid}.png
        reg_id = filename.replace("dash-", "").replace(".png", "")
        cropped_name = f"dash-{reg_id}-cropped.png"

        print("uploading...", end=" ", flush=True)
        upload_file(cropped_name, png_bytes)

        # Update DB
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{cropped_name}?v={int(time.time())}"
        update_url = f"{SUPABASE_URL}/rest/v1/registrations?id=eq.{reg_id}"
        requests.patch(
            update_url,
            headers={**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"},
            json={"pixel_dash_cropped_url": public_url},
        )
        print("done")

    return True


def main():
    upload = "--upload" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    preview_dir = None
    if not upload:
        preview_dir = os.path.join(os.path.dirname(__file__), "..", "stripped-preview")
        os.makedirs(preview_dir, exist_ok=True)
        print(f"Preview mode — saving to {os.path.abspath(preview_dir)}/")
        print("  (pass --upload to upload to Supabase instead)\n")

    # Single file mode
    if args:
        filename = args[0]
        print(f"Processing single file: {filename}")
        if process_file(filename, preview_dir):
            print("\nDone!")
        return

    # Batch mode — only process original dash files (not already-cropped ones)
    print(f"Listing files in {BUCKET}...")
    all_files = list_files()
    targets = sorted([f for f in all_files if f.startswith("dash-") and "-cropped" not in f])

    if not targets:
        print("No dash-*.png files found.")
        return

    print(f"Found {len(targets)} dashboard images to crop\n")

    processed = 0
    for filename in targets:
        if process_file(filename, preview_dir):
            processed += 1

    print(f"\nDone! Processed {processed}/{len(targets)} files.")


if __name__ == "__main__":
    main()
