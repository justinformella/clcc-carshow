#!/usr/bin/env python3
"""
Strip backgrounds from pixel art car assets in Supabase storage.
Downloads side-*.png and rear-*.png files, runs rembg, re-uploads.

Usage:
  python3 scripts/strip-backgrounds.py

Requires:
  pip3 install rembg onnxruntime pillow supabase

Environment variables:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import io
from pathlib import Path

try:
    from rembg.bg import remove
    from PIL import Image
    from supabase import create_client
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip3 install rembg onnxruntime pillow supabase")
    sys.exit(1)

# Load env from .env.local if present
env_file = Path(__file__).parent.parent / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "pixel-art"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    print("Check your .env.local file")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def process_file(filename: str) -> bool:
    """Download, strip background, re-upload. Returns True if processed."""
    print(f"  Downloading {filename}...", end=" ", flush=True)

    try:
        data = supabase.storage.from_(BUCKET).download(filename)
    except Exception as e:
        print(f"SKIP (download failed: {e})")
        return False

    # Run rembg
    print("removing bg...", end=" ", flush=True)
    input_image = Image.open(io.BytesIO(data))
    output_image = remove(input_image)

    # Save to buffer
    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    # Re-upload
    print("uploading...", end=" ", flush=True)
    supabase.storage.from_(BUCKET).upload(
        filename,
        png_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )

    print("done")
    return True


def main():
    print(f"Listing files in {BUCKET}...")
    files = supabase.storage.from_(BUCKET).list()

    side_files = [f["name"] for f in files if f["name"].startswith("side-")]
    rear_files = [f["name"] for f in files if f["name"].startswith("rear-")]
    targets = sorted(side_files + rear_files)

    if not targets:
        print("No side-*.png or rear-*.png files found.")
        return

    print(f"Found {len(targets)} files to process ({len(side_files)} side, {len(rear_files)} rear)")
    print()

    processed = 0
    for filename in targets:
        if process_file(filename):
            processed += 1

    print(f"\nDone! Processed {processed}/{len(targets)} files.")


if __name__ == "__main__":
    main()
