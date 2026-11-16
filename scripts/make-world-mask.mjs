#!/usr/bin/env node
/* Rasterises a TopoJSON land outline (world-atlas land-110m, derived from Natural Earth, public domain; npm package ISC)
   into a 1.5-degree land/sea bitmask, written as a small JS module used by the Mundias card.
   usage: node scripts/make-world-mask.mjs land-110m.json > assets/js/world-mask.js */
import { readFileSync } from 'node:fs';
const topo = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; }); });
const ring = (idx) => idx.flatMap((i) => (i < 0 ? [...arcs[~i]].reverse() : arcs[i]));
const polys = topo.objects.land.geometries.flatMap((g) => g.arcs.map((p) => p.map(ring)));
const inside = (pt, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
const STEP = 1.5, W = 360 / STEP, H = 180 / STEP, bits = new Uint8Array(Math.ceil((W * H) / 8));
let land = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const lon = -180 + (i + 0.5) * STEP, lat = 90 - (j + 0.5) * STEP; let on = false;
  for (const rings of polys) { let c = false; for (const r of rings) if (inside([lon, lat], r)) c = !c; if (c) { on = true; break; } }
  if (on) { bits[(j * W + i) >> 3] |= 1 << ((j * W + i) & 7); land++; }
}
const b64 = Buffer.from(bits).toString('base64');
process.stdout.write(`/* Land mask, ${STEP}-degree grid, ${W}x${H}, row-major from 90N/180W, LSB-first. ${land} land cells. Source: Natural Earth via world-atlas (land-110m). */\nwindow.WORLD_MASK = { step: ${STEP}, w: ${W}, h: ${H}, b64: "${b64}" };\n`);
console.error(`${land} land cells of ${W * H}`);
