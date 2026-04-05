#!/usr/bin/env python3
"""
Strip backgrounds from pixel art car assets in Supabase storage.
Downloads side-*.png and rear-*.png files, runs rembg, saves locally or re-uploads.

Usage:
  python3 scripts/strip-backgrounds.py              # preview all (saves to stripped-preview/)
  python3 scripts/strip-backgrounds.py --upload      # process all and upload to Supabase
  python3 scripts/strip-backgrounds.py side-abc.png  # single file, preview mode

Requires:
  pip3 install rembg onnxruntime pillow requests
"""

import os
import sys
import io
import json
from pathlib import Path

try:
    from rembg.bg import remove
    from PIL import Image
    import requests
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip3 install rembg onnxruntime pillow requests")
    sys.exit(1)

# Load env from .env.local if present
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

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    print("Check your .env.local file")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def list_files():
    """List files in the storage bucket via REST API."""
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}"
    res = requests.post(url, headers={**HEADERS, "Content-Type": "application/json"},
                        json={"prefix": "", "limit": 1000})
    res.raise_for_status()
    return [f["name"] for f in res.json() if f.get("name")]


def download_file(filename):
    """Download a file from storage."""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    res = requests.get(url, headers=HEADERS)
    res.raise_for_status()
    return res.content


def upload_file(filename, data):
    """Upload/overwrite a file in storage."""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    res = requests.put(url, headers={**HEADERS, "Content-Type": "image/png",
                                      "x-upsert": "true"}, data=data)
    res.raise_for_status()


def process_file(filename, preview_dir=None):
    """Download, strip background, optionally save locally or re-upload."""
    print(f"  {filename}...", end=" ", flush=True)

    try:
        data = download_file(filename)
    except Exception as e:
        print(f"SKIP (download failed: {e})")
        return False

    print("removing bg...", end=" ", flush=True)
    input_image = Image.open(io.BytesIO(data))
    output_image = remove(input_image)

    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    if preview_dir:
        out_path = os.path.join(preview_dir, filename)
        with open(out_path, "wb") as f:
            f.write(png_bytes)
        print(f"saved")
    else:
        # Upload transparent version with -transparent suffix
        parts = filename.replace(".png", "").split("-", 1)
        if len(parts) != 2:
            print("SKIP (unexpected filename format)")
            return False

        img_type, reg_id = parts[0], parts[1]
        trans_name = f"{img_type}-{reg_id}-transparent.png"

        print("uploading...", end=" ", flush=True)
        upload_file(trans_name, png_bytes)

        # Update the main DB column to point to transparent version
        import time
        col = "pixel_art_url" if img_type == "side" else "pixel_rear_url"
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{trans_name}?v={int(time.time())}"
        update_url = f"{SUPABASE_URL}/rest/v1/registrations?id=eq.{reg_id}"
        requests.patch(
            update_url,
            headers={**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"},
            json={col: public_url},
        )
        print("done")

    return True


def main():
    preview = "--preview" in sys.argv or "--dry-run" in sys.argv
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
        else:
            print("\nFailed.")
        return

    # Batch mode
    print(f"Listing files in {BUCKET}...")
    all_files = list_files()

    side_files = [f for f in all_files if f.startswith("side-")]
    rear_files = [f for f in all_files if f.startswith("rear-")]
    targets = sorted(side_files + rear_files)

    if not targets:
        print("No side-*.png or rear-*.png files found.")
        return

    print(f"Found {len(targets)} files ({len(side_files)} side, {len(rear_files)} rear)\n")

    processed = 0
    for filename in targets:
        if process_file(filename, preview_dir):
            processed += 1

    print(f"\nDone! Processed {processed}/{len(targets)} files.")
    if preview_dir:
        print(f"Review files in: {os.path.abspath(preview_dir)}/")


if __name__ == "__main__":
    main()
