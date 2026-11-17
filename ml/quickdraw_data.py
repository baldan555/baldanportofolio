"""
Fetch a sample of the Quick, Draw! dataset (Google, CC BY 4.0) for the Doodle Duel project.
For each category: 5 chunks of 2,000 drawings spread through the full file (HTTP range requests),
so the sample is not just the start of the file. 28x28 uint8 bitmaps -> ml/data/raw/quickdraw/<category>.npy
Run:  ml/.venv/Scripts/python -I ml/quickdraw_data.py
"""
from __future__ import annotations

import ast
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

RAW = Path(__file__).resolve().parent / "data" / "raw" / "quickdraw"
RAW.mkdir(parents=True, exist_ok=True)
BASE = "https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap/"
UA = {"User-Agent": "portfolio-doodle-research/1.0 (personal, non-commercial portfolio project)"}
CATEGORIES = [
    "apple", "banana", "bicycle", "bird", "book", "butterfly", "cake", "car", "cat", "clock",
    "cloud", "coffee cup", "dog", "fish", "flower", "guitar", "hamburger", "house", "ice cream", "key",
    "light bulb", "moon", "mountain", "pizza", "rainbow", "star", "sun", "tree", "umbrella", "airplane",
]
CHUNKS, PER_CHUNK = 5, 2000


def fetch(url: str, start: int, end: int) -> bytes:
    req = urllib.request.Request(url, headers={**UA, "Range": f"bytes={start}-{end}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def category(name: str) -> str:
    out = RAW / f"{name}.npy"
    if out.exists():
        return f"{name}: cached"
    url = BASE + urllib.parse.quote(name) + ".npy"
    head = fetch(url, 0, 255)
    assert head[:6] == b"\x93NUMPY", name
    hlen = int.from_bytes(head[8:10], "little") if head[6] == 1 else int.from_bytes(head[8:12], "little")
    off = (10 if head[6] == 1 else 12) + hlen
    meta = ast.literal_eval(head[off - hlen : off].decode("latin1"))
    assert meta["descr"] == "|u1" and meta["shape"][1] == 784, meta
    n = meta["shape"][0]
    starts = np.linspace(0, n - PER_CHUNK, CHUNKS).astype(int)
    parts = []
    for s in starts:
        b = fetch(url, off + int(s) * 784, off + (int(s) + PER_CHUNK) * 784 - 1)
        parts.append(np.frombuffer(b, dtype=np.uint8).reshape(-1, 784))
    arr = np.concatenate(parts)
    np.save(out, arr)
    return f"{name}: {len(arr)} of {n} drawings"


if __name__ == "__main__":
    with ThreadPoolExecutor(4) as pool:
        for msg in pool.map(category, CATEGORIES):
            print("  ", msg, flush=True)
    total = sum((RAW / f"{c}.npy").stat().st_size for c in CATEGORIES)
    print(f"done: {len(CATEGORIES)} categories, {total / 1e6:.0f} MB")
