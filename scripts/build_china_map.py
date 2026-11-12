"""Simplify DataV GeoAtlas China provinces into public/geo/china.json.

Source: https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json (Alibaba
DataV GeoAtlas). Usage: python3 scripts/build_china_map.py <100000_full.json>

Keeps every province, Taiwan, Hong Kong, Macau, the South China Sea islands and
the nine-dash line; Douglas-Peucker simplifies rings to ~0.04 degrees and
coordinates are rounded to 0.01 degrees.
"""
import json
import math
import sys

TOL = 0.04


def perp(p, a, b):
    if a == b:
        return math.dist(p, a)
    (x, y), (x1, y1), (x2, y2) = p, a, b
    return abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / math.dist(a, b)


def dp(points, tol):
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i, j = stack.pop()
        best, idx = 0.0, -1
        for k in range(i + 1, j):
            d = perp(points[k], points[i], points[j])
            if d > best:
                best, idx = d, k
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(i, idx), (idx, j)]
    return [p for p, k in zip(points, keep) if k]


def size(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return math.hypot(max(xs) - min(xs), max(ys) - min(ys))


def main(src, dst):
    data = json.load(open(src, encoding="utf-8"))
    out = []
    for f in data["features"]:
        props, geom = f["properties"], f["geometry"]
        code = str(props["adcode"])
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        dash = code.endswith("_JD")
        kept = []
        for poly in polys:
            rings = []
            for r, ring in enumerate(poly):
                # Islands and dashes are tiny; keep them with light simplification.
                small = size(ring) < 0.6
                if not dash and size(ring) < 0.04:
                    continue
                pts = dp([tuple(p) for p in ring], 0.005 if (small or dash) else TOL)
                pts = [[round(x, 2), round(y, 2)] for x, y in pts]
                dedup = [p for i, p in enumerate(pts) if i == 0 or p != pts[i - 1]]
                if len(dedup) >= 4 or (dash and len(dedup) >= 3):
                    rings.append(dedup)
                elif r == 0:
                    break
            if rings:
                kept.append(rings)
        if kept:
            out.append({"a": code, "n": props.get("name", ""), "c": props.get("center"), "p": kept})
    json.dump({"source": "Alibaba DataV GeoAtlas (areas_v3, 100000_full)", "provinces": out}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    pts = sum(len(r) for f in out for poly in f["p"] for r in poly)
    print(f"{len(out)} features, {pts} points -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "public/geo/china.json")
