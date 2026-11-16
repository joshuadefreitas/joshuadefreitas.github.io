#!/usr/bin/env python3
"""Render a repository-model/1 dependency set as an arc plate (inline-able SVG, CSS-themed). Deterministic."""
import json, sys, math
from collections import OrderedDict
model = json.load(open(sys.argv[1])); out = sys.argv[2]
W, H, PAD, BASE = 1200, 400, 8, 372
edges = [e for e in model["edges"] if not str(e["to"]).startswith("external:") and not str(e["from"]).startswith("external:")]
ids = sorted({e["from"] for e in edges} | {e["to"] for e in edges})
def group(i):
    p = i.split("/")
    if p[0] == "src" and len(p) > 1: return "/".join(p[:2])
    return p[0] if len(p) > 1 else "(root)"
idx = {i: n for n, i in enumerate(ids)}
step = (W - 2 * PAD) / max(1, len(ids) - 1)
X = lambda i: PAD + idx[i] * step
paths_i, paths_x = [], []
for e in edges:
    a, b = X(e["from"]), X(e["to"])
    if a == b: continue
    lo, hi = sorted((a, b)); r = (hi - lo) / 2
    h = min(BASE - 30, (r ** 0.92) * 1.05)   # arc height: near-semicircles, clipped to the plate
    d = f"M{lo:.1f} {BASE}C{lo:.1f} {BASE - h * 1.33:.1f} {hi:.1f} {BASE - h * 1.33:.1f} {hi:.1f} {BASE}"
    (paths_x if group(e["from"]) != group(e["to"]) else paths_i).append(d)
# baseline ticks and group spans
ticks = "".join(f"M{X(i):.1f} {BASE}v6" for i in ids)
groups = OrderedDict()
for i in ids: groups.setdefault(group(i), []).append(idx[i])
labels = []
for g, ix in groups.items():
    if len(ix) < 14: continue
    x0, x1 = PAD + ix[0] * step, PAD + ix[-1] * step
    labels.append(f'<path class="g" d="M{x0:.1f} {BASE+12}H{x1:.1f}"/><text x="{x0:.1f}" y="{BASE+26}">{g}</text>')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H+30}" role="img" '
       f'aria-label="Arc diagram of {len(edges)} dependencies between {len(ids)} files in pytest">'
       f'<path class="i" d="{"".join(paths_i)}"/><path class="x" d="{"".join(paths_x)}"/>'
       f'<path class="t" d="{ticks}"/>' + "".join(labels) + "</svg>")
open(out, "w").write(svg)
print(len(edges), "edges", len(ids), "files", len(paths_x), "cross-package", len(paths_i), "within", len(svg)//1024, "KB")
