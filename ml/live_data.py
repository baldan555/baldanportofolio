"""
Fetch and cache the history behind the Live Forecast Lab (no API keys needed):
  - Jakarta PM2.5, hourly            Open-Meteo Air Quality API (CAMS), CC BY 4.0, non-commercial use
  - USD -> IDR, daily (ECB)           Frankfurter API
  - Indonesian Wikipedia pageviews    Wikimedia REST API (top articles + per-article daily views)
Raw JSON goes to ml/data/raw/live/ (gitignored). Run:  ml/.venv/Scripts/python -I ml/live_data.py  [--force | --fill-wiki]
"""
from __future__ import annotations

import datetime as dt
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parent / "data" / "raw" / "live"
RAW.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "portfolio-forecast-research/1.0 (personal, non-commercial portfolio project)"}
JAKARTA = (-6.2, 106.85)


def get(url: str, tries: int = 4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404 or k == tries - 1:
                raise
            time.sleep((15 if e.code == 429 else 3) * (k + 1))  # rate limited: back off properly
        except Exception:  # noqa: BLE001
            if k == tries - 1:
                raise
            time.sleep(3 * (k + 1))


def pm25() -> None:
    """Hourly PM2.5 for Jakarta, from the first year the API serves until today."""
    today = dt.date.today()
    times, vals = [], []
    for year in range(2022, today.year + 1):
        start = dt.date(year, 1, 1)
        end = min(dt.date(year, 12, 31), today)
        q = urllib.parse.urlencode({"latitude": JAKARTA[0], "longitude": JAKARTA[1], "hourly": "pm2_5", "start_date": start, "end_date": end, "timezone": "Asia/Jakarta"})
        d = get(f"https://air-quality-api.open-meteo.com/v1/air-quality?{q}")
        h = d.get("hourly", {})
        times += h.get("time", [])
        vals += h.get("pm2_5", [])
        print(f"   pm2.5 {year}: {sum(v is not None for v in h.get('pm2_5', []))} non-null of {len(h.get('time', []))}")
    json.dump({"time": times, "pm2_5": vals, "fetched": str(today)}, open(RAW / "pm25_jakarta.json", "w"))


def usd_idr() -> None:
    """Daily ECB reference rate USD -> IDR since 1999 (business days)."""
    today = dt.date.today()
    rates = {}
    for year in range(1999, today.year + 1):
        d = get(f"https://api.frankfurter.dev/v1/{year}-01-01..{min(dt.date(year, 12, 31), today)}?base=USD&symbols=IDR")
        rates.update({k: v["IDR"] for k, v in d.get("rates", {}).items()})
    print(f"   usd/idr: {len(rates)} days, {min(rates)} to {max(rates)}")
    json.dump({"rates": dict(sorted(rates.items())), "fetched": str(today)}, open(RAW / "usd_idr.json", "w"))


SKIP_PREFIX = ("Halaman_Utama", "Istimewa:", "Spesial:", "Special:", "Berkas:", "Wikipedia:", "Kategori:", "Portal:", "Templat:", "Bantuan:", "Pengguna:", "Main_Page", "-")


def is_article(name: str) -> bool:
    return not name.startswith(SKIP_PREFIX) and ":" not in name


# Adult titles (and bot-driven searches for them) reach the daily top list; a portfolio must never show them.
# Same list in src/lib/live-forecast.ts for the live trending chips.
NSFW_PARTS = ("porn", "xnxx", "xhamster", "xvideo", "hentai", "bokep", "onlyfans", "ngentot", "video_viral", "film_dewasa", "brazzers", "chaturbate")
NSFW_WORDS = {"xxx", "sex", "seks", "jav", "bugil", "telanjang", "ngewe", "memek", "kontol", "payudara", "vagina", "penis", "masturbasi", "erotis", "redtube", "youporn"}


def is_safe(name: str) -> bool:
    low = name.lower()
    return not any(p in low for p in NSFW_PARTS) and not NSFW_WORDS & set(re.split(r"[_\W]+", low))


def wiki_fill(max_articles: int = 450, workers: int = 2) -> None:
    """Drop unsafe titles from the cache and fetch the series that failed (rate limits) the first time."""
    from concurrent.futures import ThreadPoolExecutor

    p = RAW / "wiki_id.json"
    d = json.load(open(p))
    top = {a: c for a, c in d["top_days"].items() if is_safe(a)}
    series = {a: v for a, v in d["series"].items() if is_safe(a)}
    names = sorted(top, key=lambda a: -top[a])[:max_articles]
    missing = [a for a in names if a not in series]
    print(f"   wiki: removed {len(d['series']) - len(series)} unsafe series, fetching {len(missing)} missing", flush=True)
    today = dt.date.fromisoformat(d["fetched"])
    start = today - dt.timedelta(days=2 * 365 + 30)
    end = today - dt.timedelta(days=1)
    urls = [f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/id.wikipedia/all-access/user/{urllib.parse.quote(a, safe='')}/daily/{start:%Y%m%d}/{end:%Y%m%d}" for a in missing]
    with ThreadPoolExecutor(workers) as pool:
        for a, got in zip(missing, pool.map(_maybe, urls)):
            if got:
                series[a] = {it["timestamp"][:8]: it["views"] for it in got.get("items", [])}
    print(f"   wiki: {len(series)} series now, {len([a for a in names if a not in series])} still missing", flush=True)
    json.dump({"series": series, "top_days": top, "fetched": d["fetched"]}, open(p, "w"))


def _maybe(url: str):
    try:
        return get(url)
    except Exception:  # noqa: BLE001
        return None


def wiki(days: int = 365, per_day: int = 40, max_articles: int = 450, workers: int = 6) -> None:
    """Articles that reached the daily top list in the past year, and their daily views over ~2 years.
    A few requests run in parallel (one at a time took about an hour); still far below Wikimedia's rate limits."""
    from concurrent.futures import ThreadPoolExecutor

    today = dt.date.today()
    top_urls = [f"https://wikimedia.org/api/rest_v1/metrics/pageviews/top/id.wikipedia/all-access/{today - dt.timedelta(days=k):%Y/%m/%d}" for k in range(2, days + 2)]
    seen: dict[str, int] = {}
    with ThreadPoolExecutor(workers) as pool:
        for d in pool.map(_maybe, top_urls):
            if not d:
                continue
            for a in [a["article"] for a in d["items"][0]["articles"] if is_article(a["article"]) and is_safe(a["article"])][:per_day]:
                seen[a] = seen.get(a, 0) + 1
    names = sorted(seen, key=lambda a: -seen[a])[:max_articles]
    print(f"   wiki: {len(seen)} distinct trending articles, keeping {len(names)}", flush=True)
    start = today - dt.timedelta(days=2 * 365 + 30)
    end = today - dt.timedelta(days=1)
    urls = [f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/id.wikipedia/all-access/user/{urllib.parse.quote(a, safe='')}/daily/{start:%Y%m%d}/{end:%Y%m%d}" for a in names]
    series = {}
    with ThreadPoolExecutor(workers) as pool:
        for i, (a, d) in enumerate(zip(names, pool.map(_maybe, urls))):
            if d:
                series[a] = {it["timestamp"][:8]: it["views"] for it in d.get("items", [])}
            if i % 100 == 0:
                print(f"   wiki series {i}/{len(names)}", flush=True)
    print(f"   wiki: {len(series)} series saved", flush=True)
    json.dump({"series": series, "top_days": seen, "fetched": str(today)}, open(RAW / "wiki_id.json", "w"))


if __name__ == "__main__":
    import sys

    force = "--force" in sys.argv  # re-download even if a cache exists
    if "--fill-wiki" in sys.argv:  # clean the Wikipedia cache and fetch the series that failed
        wiki_fill()
        raise SystemExit
    for name, fn, cache in [("pm2.5", pm25, "pm25_jakarta.json"), ("usd/idr", usd_idr, "usd_idr.json"), ("wikipedia", wiki, "wiki_id.json")]:
        if force or not (RAW / cache).exists():
            print(name)
            fn()
        else:
            print(name, "cached")
