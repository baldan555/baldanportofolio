"""
Turns open boundary data into small, ready-to-draw SVG paths for the chart library's real map charts.

Inputs (downloaded once into ml/data/raw/geo/, not shipped with the site):
  - Indonesia provinces: geoBoundaries gbHumanitarian IDN ADM1, simplified (source: OCHA ROAP via HDX, CC BY 3.0 IGO)
  - World countries: Natural Earth 1:110m admin-0 countries (public domain)

Output: src/data/geo-shapes.json with projected, simplified paths (coordinates rounded to 0.1 px), province label
points, city positions and store dots sampled inside provinces for the dot / heat / hexbin maps.

    ml/.venv/Scripts/python.exe -I ml/geo_prepare.py
"""

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "geo"
OUT = ROOT.parent / "src" / "data" / "geo-shapes.json"

# names in the boundary file → the province codes used by the chart library's (made-up) store data.
# The file has the 34 provinces of 2019; the four Papua provinces created in 2022 are folded into their parents.
CODES = {
    "Aceh": ["ACE"],
    "Bali": ["BAL"],
    "Banten": ["BAN"],
    "Bengkulu": ["BEN"],
    "Daerah Istimewa Yogyakarta": ["YOG"],
    "Dki Jakarta": ["JKT"],
    "Gorontalo": ["GOR"],
    "Jambi": ["JAM"],
    "Jawa Barat": ["JBR"],
    "Jawa Tengah": ["JTG"],
    "Jawa Timur": ["JTM"],
    "Kalimantan Barat": ["KBR"],
    "Kalimantan Selatan": ["KSL"],
    "Kalimantan Tengah": ["KTG"],
    "Kalimantan Timur": ["KTM"],
    "Kalimantan Utara": ["KUT"],
    "Kepulauan Bangka Belitung": ["BBL"],
    "Kepulauan Riau": ["KRI"],
    "Lampung": ["LAM"],
    "Maluku": ["MAL"],
    "Maluku Utara": ["MUT"],
    "Nusa Tenggara Barat": ["NTB"],
    "Nusa Tenggara Timur": ["NTT"],
    "Papua": ["PAP", "PTG", "PPG", "PSL"],
    "Papua Barat": ["PBR", "PBD"],
    "Riau": ["RIA"],
    "Sulawesi Barat": ["SBR"],
    "Sulawesi Selatan": ["SSL"],
    "Sulawesi Tengah": ["STG"],
    "Sulawesi Tenggara": ["SGR"],
    "Sulawesi Utara": ["SLU"],
    "Sumatera Barat": ["SUB"],
    "Sumatera Selatan": ["SUS"],
    "Sumatera Utara": ["SUT"],
}
DISPLAY = {"Dki Jakarta": "DKI Jakarta", "Daerah Istimewa Yogyakarta": "DI Yogyakarta", "Kepulauan Bangka Belitung": "Bangka Belitung"}

# approximate city centres (degrees), public knowledge
CITIES = {
    "Jakarta": (106.85, -6.2),
    "Surabaya": (112.75, -7.25),
    "Bandung": (107.61, -6.92),
    "Medan": (98.67, 3.59),
    "Makassar": (119.43, -5.14),
    "Yogyakarta": (110.36, -7.8),
    "Denpasar": (115.22, -8.65),
    "Semarang": (110.42, -6.97),
}


def dp(points, tol):
    """Douglas–Peucker simplification of a polyline (list of (x, y))."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-12
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(points, keep) if k]


def dp_ring(ring, tol):
    """Simplify a closed ring: split it at the point farthest from the start, simplify both halves."""
    pts = ring[:-1] if ring[0] == ring[-1] else ring
    if len(pts) < 4:
        return pts
    far = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
    a = dp(pts[: far + 1], tol)
    b = dp(pts[far:] + [pts[0]], tol)
    return a[:-1] + b[:-1]


def area(ring):
    return 0.5 * sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))


def rings_of(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [poly[0] for poly in polys]  # outer rings only: holes are invisible at this size


def to_path(rings):
    return " ".join("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in r) + " Z" for r in rings)


def inside(pt, ring):
    x, y = pt
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1:
            c = not c
    return c


def build_indonesia():
    W, H, PAD = 360, 150, 6
    lon0, lon1, lat0, lat1 = 94.8, 141.2, -11.2, 6.2
    k = math.cos(math.radians((lat0 + lat1) / 2))
    sx = (W - 2 * PAD) / ((lon1 - lon0) * k)
    sy = sx
    h = (lat1 - lat0) * sy + 2 * PAD
    proj = lambda lon, lat: (PAD + (lon - lon0) * k * sx, PAD + (lat1 - lat) * sy)
    data = json.loads((RAW / "idn_adm1_simplified.geojson").read_text(encoding="utf-8"))
    provinces = []
    for f in data["features"]:
        name = f["properties"]["shapeName"]
        rings = []
        for ring in rings_of(f["geometry"]):
            pts = dp_ring([proj(lon, lat) for lon, lat in ring], 0.25)
            if len(pts) >= 3 and abs(area(pts)) > 0.6:
                rings.append(pts)
        rings.sort(key=lambda r: -abs(area(r)))
        big = rings[0]
        a = area(big)
        cx = sum((x1 + x2) * (x1 * y2 - x2 * y1) for (x1, y1), (x2, y2) in zip(big, big[1:] + big[:1])) / (6 * a)
        cy = sum((y1 + y2) * (x1 * y2 - x2 * y1) for (x1, y1), (x2, y2) in zip(big, big[1:] + big[:1])) / (6 * a)
        provinces.append({"name": DISPLAY.get(name, name), "codes": CODES[name], "d": to_path(rings), "cx": round(cx, 1), "cy": round(cy, 1), "rings": rings})
    cities = [{"name": n, "x": round(proj(*ll)[0], 1), "y": round(proj(*ll)[1], 1)} for n, ll in CITIES.items()]
    return {"w": W, "h": round(h), "provinces": provinces, "cities": cities, "proj": {"lon0": lon0, "lat1": lat1, "k": round(k, 6), "s": round(sx, 6), "pad": PAD}}


def sample_dots(provinces, counts):
    """Store dots placed at random (seeded) inside each province's land, one per store."""
    rnd = random.Random(20261111)
    dots = []
    for p in provinces:
        n = sum(counts.get(c, 0) for c in p["codes"])
        rings = p["rings"][:3]
        xs = [x for r in rings for x, _ in r]
        ys = [y for r in rings for _, y in r]
        placed, tries = 0, 0
        while placed < n and tries < 5000:
            tries += 1
            pt = (rnd.uniform(min(xs), max(xs)), rnd.uniform(min(ys), max(ys)))
            if any(inside(pt, r) for r in rings):
                dots.append({"code": p["codes"][0], "x": round(pt[0], 1), "y": round(pt[1], 1)})
                placed += 1
    return dots


def natural_earth(lon, lat):
    """Natural Earth projection (Šavrič et al. 2015), in radians-based units."""
    l, f = math.radians(lon), math.radians(lat)
    f2 = f * f
    f4 = f2 * f2
    x = l * (0.870700 - 0.131979 * f2 - 0.013791 * f4 + 0.003971 * f4 * f4 * f2 - 0.001529 * f4 * f4 * f4)
    y = f * (1.007226 + 0.015085 * f2 - 0.044475 * f4 * f2 + 0.028874 * f4 * f4 - 0.005916 * f4 * f4 * f2)
    return x, y


def build_world():
    W, PAD = 360, 4
    data = json.loads((RAW / "ne_110m_countries.geojson").read_text(encoding="utf-8"))
    xmax, _ = natural_earth(180, 0)
    _, ymax = natural_earth(0, 84)
    _, ymin = natural_earth(0, -58)
    s = (W - 2 * PAD) / (2 * xmax)
    H = round((ymax - ymin) * s + 2 * PAD)
    proj = lambda lon, lat: (PAD + (natural_earth(lon, lat)[0] + xmax) * s, PAD + (ymax - natural_earth(lon, lat)[1]) * s)
    countries = []
    for f in data["features"]:
        p = f["properties"]
        if p["ADM0_A3"] == "ATA":
            continue
        rings = []
        for ring in rings_of(f["geometry"]):
            pts = dp_ring([proj(lon, max(-58, lat)) for lon, lat in ring], 0.2)
            if len(pts) >= 3 and abs(area(pts)) > 0.3:
                rings.append(pts)
        if not rings:
            continue
        lx, ly = proj(p["LABEL_X"], p["LABEL_Y"])
        countries.append({"name": p["NAME"], "iso": p["ADM0_A3"], "d": to_path(rings), "cx": round(lx, 1), "cy": round(ly, 1)})
    graticule = []
    for lon in range(-180, 181, 30):
        graticule.append("M" + " L".join(f"{proj(lon, lat)[0]:.1f},{proj(lon, lat)[1]:.1f}" for lat in range(-58, 85, 4)))
    for lat in range(-30, 85, 30):
        graticule.append("M" + " L".join(f"{proj(lon, lat)[0]:.1f},{proj(lon, lat)[1]:.1f}" for lon in range(-180, 181, 6)))
    outline = "M" + " L".join(f"{proj(-180, lat)[0]:.1f},{proj(-180, lat)[1]:.1f}" for lat in range(-58, 85, 2)) + " L" + " L".join(f"{proj(180, lat)[0]:.1f},{proj(180, lat)[1]:.1f}" for lat in range(84, -59, -2)) + " Z"
    jkt = proj(*CITIES["Jakarta"])
    return {"w": W, "h": H, "countries": countries, "graticule": graticule, "outline": outline, "jakarta": [round(jkt[0], 1), round(jkt[1], 1)]}


def main():
    idn = build_indonesia()
    # store counts per province from the chart library's made-up data (kept in sync by reading the TS file)
    import re

    ts = (ROOT.parent / "src" / "data" / "chart-demo.ts").read_text(encoding="utf-8")
    codes = re.findall(r'\["([A-Z]{3})", "[^"]+", \d+, \d+\]', ts)
    counts = {c: 0 for c in codes}
    stores_file = ROOT / "data" / "geo-store-counts.json"  # written from the TS data by a one-line node script
    if stores_file.exists():
        counts.update(json.loads(stores_file.read_text(encoding="utf-8")))
    idn["dots"] = sample_dots(idn["provinces"], counts)
    for p in idn["provinces"]:
        del p["rings"]
    out = {
        "credit": {
            "provinces": "Province boundaries: OCHA ROAP via HDX, from geoBoundaries (CC BY 3.0 IGO), simplified. 34 provinces as of 2019.",
            "world": "Country boundaries: Natural Earth 1:110m (public domain), simplified.",
        },
        "idn": idn,
        "world": build_world(),
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print("wrote", OUT, round(OUT.stat().st_size / 1024), "KB;", len(idn["provinces"]), "provinces,", len(out["world"]["countries"]), "countries,", len(idn["dots"]), "dots")


if __name__ == "__main__":
    main()
