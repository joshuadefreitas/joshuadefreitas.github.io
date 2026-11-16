/* Systems gallery: seven procedural scenes, one per project. Each has its own mechanism (agents, forecast fans, a PDE,
   a globe, additive ribbons, a court, a network). Everything is computed in the browser; nothing is a video.
   Static-first: every scene draws a finished still at load. It animates only when visible, never under reduced motion,
   and the runtime lowers its frame rate, then stops, if frames get expensive. The visuals are illustrative, not project data. */
(function () {
  'use strict';
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function b64(s) { var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  var TAU = Math.PI * 2;

  /* ---------- 1. Sekiya: agents deciding together (a simulated public-goods game) ---------- */
  function sekiya(ctx, W, H, R) {
    var N = W < 520 ? 110 : 210, ag = [], links = [], i;
    function sprite(rgb) { var c = document.createElement('canvas'); c.width = c.height = 32; var x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(.25, 'rgba(' + rgb + ',.55)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return c; }
    var spC = sprite('90,205,255'), spD = sprite('200,150,255');
    for (i = 0; i < N; i++) ag.push({ x: R() * W, y: R() * H, vx: (R() - .5), vy: (R() - .5), c: R() < .55 ? 1 : 0 });
    var cell = 56, t = 0;
    function step() {
      var grid = {}; links.length = 0; ag.forEach(function (a, k) { var key = ((a.x / cell) | 0) + ',' + ((a.y / cell) | 0); (grid[key] = grid[key] || []).push(k); });
      ag.forEach(function (a, k) {
        var gx = (a.x / cell) | 0, gy = (a.y / cell) | 0, fx = 0, fy = 0, coop = 0, n = 0;
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var l = grid[(gx + dx) + ',' + (gy + dy)]; if (!l) continue; for (var m = 0; m < l.length; m++) { if (l[m] === k) continue; var b = ag[l[m]], ex = b.x - a.x, ey = b.y - a.y, d2 = ex * ex + ey * ey; if (d2 > cell * cell || d2 < .01) continue; var d = Math.sqrt(d2); n++; coop += b.c;
          var pull = (a.c && b.c) ? .03 : (b.c ? .01 : -.02); if (d < 12) pull -= .05; fx += ex / d * pull; fy += ey / d * pull; if (a.c && b.c && l[m] > k && d < 40) links.push([a, b, d]); } }
        a.vx = a.vx * .95 + fx + Math.cos(t * .011 + k) * .05 + .01; a.vy = a.vy * .95 + fy + Math.sin(t * .013 + k * 1.7) * .05; if (Math.abs(a.vx) < .15 && Math.abs(a.vy) > .5) a.vx += (R() - .5) * .4; if (Math.abs(a.vy) < .15 && Math.abs(a.vx) > .5) a.vy += (R() - .5) * .4;
        var sp = Math.hypot(a.vx, a.vy); if (sp > 1.6) { a.vx *= 1.6 / sp; a.vy *= 1.6 / sp; }
        a.x = (a.x + a.vx + W) % W; a.y = (a.y + a.vy + H) % H;
        if (n > 2 && R() < .01) a.c = (coop / n > .45) ? (R() < .9 ? 1 : 0) : (R() < .75 ? 0 : 1);
      }); t++;
    }
    function paint(fade) {
      ctx.fillStyle = 'rgba(3,7,17,' + fade + ')'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = .8;
      links.forEach(function (l) { ctx.strokeStyle = 'rgba(90,205,255,' + (.2 * (1 - l[2] / 40)) + ')'; ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke(); });
      ag.forEach(function (a) { var s = a.c ? 5.5 : 4; ctx.globalAlpha = .9; ctx.drawImage(a.c ? spC : spD, a.x - s, a.y - s, s * 2, s * 2); ctx.globalAlpha = 1; });
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#030711'; ctx.fillRect(0, 0, W, H);
    for (i = 0; i < 110; i++) { step(); paint(.3); }
    return { frame: function () { step(); paint(.3); }, fps: 30 };
  }

  /* ---------- 2. Lathilda: forecast fans over a synthetic series ---------- */
  function lathilda(ctx, W, H, R) {
    var n = 420, s = [], v = 0, regime = 0, i;
    for (i = 0; i < n; i++) { if (R() < .012) regime = (R() - .5) * .5; v += regime * .15 + (R() - .5) * .9 - v * .01; s.push(v); }
    var mn = Math.min.apply(null, s), mx = Math.max.apply(null, s), span = 150, now = 190, speed = .09;
    var padL = 20, padR = 58, padT = H * .14, padB = H * .26;
    function X(k, off) { return padL + (k - off) / span * (W - padL - padR); }
    function Y(val) { return padT + (1 - (val - mn) / (mx - mn)) * (H - padT - padB); }
    function fan(from, off, alpha) {
      var h, last = s[from], phi = .985, sd = .62, pts = [];
      for (h = 0; h <= 60; h++) { var m = last * Math.pow(phi, h), w = sd * Math.sqrt(h + 1); pts.push([from + h, m, w]); }
      [[1.96, .08], [1.28, .12], [.67, .18]].forEach(function (q) {
        ctx.beginPath(); pts.forEach(function (p, k) { var x = X(p[0], off), y = Y(p[1] + q[0] * p[2] * .6); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        for (var k = pts.length - 1; k >= 0; k--) ctx.lineTo(X(pts[k][0], off), Y(pts[k][1] - q[0] * pts[k][2] * .6));
        ctx.closePath(); ctx.fillStyle = 'rgba(111,137,255,' + (q[1] * alpha) + ')'; ctx.fill();
      });
      ctx.beginPath(); pts.forEach(function (p, k) { var x = X(p[0], off), y = Y(p[1]); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = 'rgba(160,180,255,' + (.8 * alpha) + ')'; ctx.lineWidth = 1; ctx.stroke();
    }
    function draw() {
      var off = now - span * .62, g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#071029'); g.addColorStop(1, '#030715'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,150,255,.09)'; ctx.beginPath(); for (var k = 0; k <= 8; k++) { var y = padT + k * (H - padT - padB) / 8; ctx.moveTo(padL, y); ctx.lineTo(W - padR + 10, y); }
      for (k = Math.ceil(off / 20) * 20; k < off + span; k += 20) { var x = X(k, off); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); } ctx.stroke();
      ctx.font = '10px "DM Mono",monospace'; ctx.fillStyle = 'rgba(160,180,255,.55)'; ctx.textAlign = 'left';
      for (k = 0; k <= 4; k++) ctx.fillText((mx - (mx - mn) * k / 4).toFixed(1), W - padR + 14, padT + k * (H - padT - padB) / 4 + 3);
      fan(Math.max(0, Math.floor(now) - 36), off, .35); fan(Math.max(0, Math.floor(now) - 18), off, .5); fan(Math.floor(now), off, 1);
      ctx.beginPath(); for (var j = Math.max(0, Math.floor(off)); j <= Math.floor(now); j++) { var px = X(j, off), py = Y(s[j]); j === Math.max(0, Math.floor(off)) ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.strokeStyle = 'rgba(236,240,255,.95)'; ctx.lineWidth = 1.4; ctx.stroke();
      var nx = X(now, off); ctx.strokeStyle = 'rgba(111,137,255,.7)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(nx, padT - 8); ctx.lineTo(nx, H - padB + 8); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(nx, Y(s[Math.floor(now)]), 3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,180,255,.6)'; ctx.fillText('FORECAST ORIGIN', Math.min(nx + 8, W - 130), padT - 12);
      ctx.fillText('SYNTHETIC SERIES', padL, H - padB + 26);
    }
    draw();
    return { frame: function (dt) { now += speed * (dt / 33); if (now > n - 60) now = 190; draw(); }, fps: 30 };
  }

  /* ---------- 3. Palinoir: a reaction-diffusion field, computed live from a precomputed state ---------- */
  function palinoir(ctx, W, H) {
    var S = window.GS_STATE; if (!S) { ctx.fillStyle = '#050a1c'; ctx.fillRect(0, 0, W, H); return { frame: function () {}, fps: 1 }; }
    var gw = S.w, gh = S.h, U = new Float32Array(gw * gh), V = new Float32Array(gw * gh), U2 = new Float32Array(gw * gh), V2 = new Float32Array(gw * gh);
    var bu = b64(S.u), bv = b64(S.v), i; for (i = 0; i < gw * gh; i++) { U[i] = bu[i] / 255; V[i] = bv[i] / 255 * .5; }
    var off = document.createElement('canvas'); off.width = gw; off.height = gh; var octx = off.getContext('2d'), img = octx.createImageData(gw, gh), pal = [];
    var stops = [[5, 10, 28], [20, 40, 150], [60, 100, 255], [120, 215, 255], [255, 255, 255]];
    for (i = 0; i < 256; i++) { var t = Math.min(1, i / 255 * 1.6) * 4, k = Math.min(3, t | 0), f = t - k, a = stops[k], b = stops[k + 1]; pal.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); }
    function step() {
      for (var y = 0; y < gh; y++) { var yn = ((y + gh - 1) % gh) * gw, ys = ((y + 1) % gh) * gw, yc = y * gw;
        for (var x = 0; x < gw; x++) { var xw = (x + gw - 1) % gw, xe = (x + 1) % gw, j = yc + x, u = U[j], v = V[j], r = u * v * v;
          U2[j] = u + .16 * (U[yn + x] + U[ys + x] + U[yc + xw] + U[yc + xe] - 4 * u) - r + S.f * (1 - u); V2[j] = v + .08 * (V[yn + x] + V[ys + x] + V[yc + xw] + V[yc + xe] - 4 * v) + r - (S.f + S.k) * v; } }
      var t1 = U; U = U2; U2 = t1; t1 = V; V = V2; V2 = t1;
    }
    function draw() {
      for (var j = 0; j < gw * gh; j++) { var c = pal[Math.max(0, Math.min(255, (V[j] * 2 * 255) | 0))], o = j * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255; }
      octx.putImageData(img, 0, 0); var sc = Math.max(W / gw, H / gh), dw = gw * sc, dh = gh * sc; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, (W - dw) / 2, (H - dh) / 2, dw, dh);
      var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .2, W / 2, H / 2, Math.max(W, H) * .75); g.addColorStop(0, 'rgba(3,6,18,0)'); g.addColorStop(1, 'rgba(3,6,18,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    draw();
    return { frame: function () { step(); step(); step(); draw(); }, fps: 24 };
  }

  /* ---------- 4. Mundias: a dot-matrix globe with changing events ---------- */
  function mundias(ctx, W, H, R) {
    var M = window.WORLD_MASK, dots = [], i, lon0 = -30, tilt = .38;
    if (M) { var bits = b64(M.b64); for (var j = 0; j < M.h; j++) for (i = 0; i < M.w; i++) { var idx = j * M.w + i; if (bits[idx >> 3] >> (idx & 7) & 1) var la = (90 - (j + .5) * M.step) * Math.PI / 180, lo = (-180 + (i + .5) * M.step) * Math.PI / 180; dots.push([Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]); } }
    var DOT = []; for (var z = 0; z < 8; z++) DOT.push('rgba(165,195,255,' + (.35 + .65 * z / 7) + ')');
    var cities = [[40.4, -3.7], [51.5, -.1], [40.7, -74], [35.7, 139.7], [-23.5, -46.6], [28.6, 77.2], [-33.9, 18.4], [1.3, 103.8], [30, 31.2], [-33.9, 151.2], [55.7, 37.6], [19.4, -99.1]].map(function (c) { return [c[0] * Math.PI / 180, c[1] * Math.PI / 180]; });
    var events = [], arcs = [], t = 0; for (i = 0; i < 7; i++) events.push({ c: cities[(R() * cities.length) | 0], age: R() * 160, life: 140 + R() * 60 });
    for (i = 0; i < 3; i++) arcs.push({ a: cities[(R() * 12) | 0], b: cities[(R() * 12) | 0], p: R() });
    var cx = W * .5, cy = H * .5, rad = Math.min(W * .46, H * .44), ct = Math.cos(tilt), st = Math.sin(tilt);
    function proj(lat, lon) { var l = lon + lon0 * Math.PI / 180, x = Math.cos(lat) * Math.sin(l), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(l), y2 = y * ct - z * st, z2 = y * st + z * ct; return [cx + x * rad, cy - y2 * rad, z2]; }
    function gc(a, b, f) { var d = Math.acos(Math.max(-1, Math.min(1, Math.sin(a[0]) * Math.sin(b[0]) + Math.cos(a[0]) * Math.cos(b[0]) * Math.cos(b[1] - a[1])))) || .0001, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d), x = A * Math.cos(a[0]) * Math.cos(a[1]) + B * Math.cos(b[0]) * Math.cos(b[1]), y = A * Math.cos(a[0]) * Math.sin(a[1]) + B * Math.cos(b[0]) * Math.sin(b[1]), z = A * Math.sin(a[0]) + B * Math.sin(b[0]); return [Math.atan2(z, Math.hypot(x, y)), Math.atan2(y, x), Math.sin(Math.PI * f) * .12]; }
    function draw() {
      var g = ctx.createRadialGradient(cx, cy, rad * .2, cx, cy, Math.max(W, H) * .8); g.addColorStop(0, '#08142e'); g.addColorStop(1, '#02050d'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var halo = ctx.createRadialGradient(cx, cy, rad * .9, cx, cy, rad * 1.18); halo.addColorStop(0, 'rgba(70,120,255,.22)'); halo.addColorStop(1, 'rgba(70,120,255,0)'); ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.fillStyle = 'rgba(8,20,52,.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(110,150,255,.35)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.lineWidth = .6; ctx.strokeStyle = 'rgba(110,150,255,.14)';
      for (var la = -60; la <= 60; la += 30) { ctx.beginPath(); var open = false; for (var lo = -180; lo <= 180; lo += 8) { var p = proj(la * Math.PI / 180, lo * Math.PI / 180); if (p[2] > 0) { open ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); open = true; } else open = false; } ctx.stroke(); }
      for (var lo2 = -180; lo2 < 180; lo2 += 30) { ctx.beginPath(); open = false; for (var la2 = -90; la2 <= 90; la2 += 8) { p = proj(la2 * Math.PI / 180, lo2 * Math.PI / 180); if (p[2] > 0) { open ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); open = true; } else open = false; } ctx.stroke(); }
      var d = Math.max(1.5, rad / 110);
      var L = lon0 * Math.PI / 180, sL = Math.sin(L), cL = Math.cos(L);
      for (i = 0; i < dots.length; i++) { var q0 = dots[i], x1 = q0[0] * cL + q0[2] * sL, z1 = -q0[0] * sL + q0[2] * cL, y2 = q0[1] * ct - z1 * st, z2 = q0[1] * st + z1 * ct; if (z2 <= 0) continue; ctx.fillStyle = DOT[(z2 * 7) | 0]; ctx.fillRect(cx + x1 * rad - d / 2, cy - y2 * rad - d / 2, d, d); }
      ctx.globalCompositeOperation = 'lighter';
      arcs.forEach(function (a) { var head = a.p, k; ctx.beginPath(); var started = false; for (k = 0; k <= 30; k++) { var f = Math.max(0, head - .45) + (Math.min(1, head) - Math.max(0, head - .45)) * k / 30, q = gc(a.a, a.b, f), pp = proj(q[0], q[1]); if (pp[2] <= 0) { started = false; continue; } var lift = 1 + q[2]; var px = cx + (pp[0] - cx) * lift, py = cy + (pp[1] - cy) * lift; started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; } ctx.strokeStyle = 'rgba(255,200,110,.75)'; ctx.lineWidth = 1.2; ctx.stroke(); });
      events.forEach(function (e) { var f = e.age / e.life; if (f > 1) return; var q = proj(e.c[0], e.c[1]); if (q[2] <= 0) return; var rr = 3 + f * rad * .12; ctx.strokeStyle = 'rgba(255,205,120,' + (.9 * (1 - f)) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,225,160,' + (1 - f) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.2, 0, TAU); ctx.fill(); });
      ctx.globalCompositeOperation = 'source-over';
    }
    function tick(dt) { var k = dt / 33; lon0 -= .14 * k; t += k; events.forEach(function (e) { e.age += k; if (e.age > e.life + 30) { e.c = cities[(R() * cities.length) | 0]; e.age = 0; e.life = 140 + R() * 60; } }); arcs.forEach(function (a) { a.p += .006 * k; if (a.p > 1.5) { a.a = cities[(R() * 12) | 0]; a.b = cities[(R() * 12) | 0]; a.p = -.1; } }); }
    for (i = 0; i < 40; i++) tick(33); arcs.forEach(function (a, k) { a.p = .35 + k * .22; });
    draw();
    return { frame: function (dt) { tick(dt); draw(); }, fps: 30 };
  }

  /* ---------- 5. Veceryl: additive ribbons of signal (attention and culture) ---------- */
  function veceryl(ctx, W, H, R) {
    var K = 8, rb = [], i, grain = document.createElement('canvas'); grain.width = grain.height = 128; var gx = grain.getContext('2d'), gi = gx.createImageData(128, 128);
    for (i = 0; i < 128 * 128; i++) { var v = R() * 255 | 0; gi.data[i * 4] = gi.data[i * 4 + 1] = gi.data[i * 4 + 2] = v; gi.data[i * 4 + 3] = 22; } gx.putImageData(gi, 0, 0);
    var hues = [[255, 107, 138], [255, 150, 120], [255, 190, 110], [200, 110, 255], [255, 120, 190], [140, 120, 255], [255, 170, 140], [255, 100, 160]];
    for (i = 0; i < K; i++) rb.push({ y: H * (.22 + .6 * R()), amp: H * (.06 + .12 * R()), w: .6 + R() * 1.4, ph: R() * TAU, sp: .004 + R() * .006, th: H * (.05 + .1 * R()), c: hues[i % hues.length], ph2: R() * TAU });
    var t = 40;
    function pts(r, off) { var out = [], n = 36; for (var k = 0; k <= n; k++) { var x = k / n * W, u = k / n; out.push([x, r.y + off + Math.sin(u * TAU * r.w + r.ph + t * r.sp) * r.amp + Math.sin(u * TAU * r.w * 2.3 + r.ph2 - t * r.sp * 1.3) * r.amp * .35]); } return out; }
    function smooth(p) { ctx.moveTo(p[0][0], p[0][1]); for (var k = 1; k < p.length - 1; k++) { var mx = (p[k][0] + p[k + 1][0]) / 2, my = (p[k][1] + p[k + 1][1]) / 2; ctx.quadraticCurveTo(p[k][0], p[k][1], mx, my); } ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]); }
    function draw() {
      var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#12061a'); g.addColorStop(.6, '#0a0614'); g.addColorStop(1, '#190b1c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      rb.forEach(function (r) { var top = pts(r, -r.th), bot = pts(r, r.th), gr = ctx.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(' + r.c.join(',') + ',0)'); gr.addColorStop(.3, 'rgba(' + r.c.join(',') + ',.16)'); gr.addColorStop(.75, 'rgba(' + r.c.join(',') + ',.1)'); gr.addColorStop(1, 'rgba(' + r.c.join(',') + ',0)');
        ctx.beginPath(); smooth(top); for (var k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); smooth(top); ctx.strokeStyle = 'rgba(' + r.c.join(',') + ',.28)'; ctx.lineWidth = 1; ctx.stroke(); });
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .55; ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    draw();
    return { frame: function (dt) { t += dt / 33; draw(); }, fps: 24 };
  }

  /* ---------- 6. Fadeaway: a basketball world, with what the defenders believe ---------- */
  function fadeaway(ctx, W, H, R) {
    var t = 0, off = [[.5, .46], [.2, .64], [.8, .64], [.3, .82], [.7, .82]], def = [], ph = [], i;
    for (i = 0; i < 5; i++) ph.push([R() * TAU, R() * TAU, .02 + R() * .025]);
    var hoop = [.5, .1], seq = [0, 1, 3, 2, 4, 0, 2, 1, 3, 4];
    function pos(k, tt) { var b = off[k], p = ph[k]; return [(b[0] + Math.sin(tt * .021 + p[0]) * p[2] * 1.6) * W, (b[1] + Math.cos(tt * .017 + p[1]) * p[2]) * H]; }
    function court() {
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.2; var u = W, kx = .32, ky = .42;
      ctx.strokeRect(W * .04, H * .04, W * .92, H * .92); ctx.strokeRect(W * (.5 - kx / 2), H * .04, W * kx, H * ky);
      ctx.beginPath(); ctx.arc(W * .5, H * (.04 + ky), W * .16, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(W * .5, H * .1, W * .024, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W * .12, H * .04); ctx.lineTo(W * .12, H * .1); ctx.ellipse(W * .5, H * .1, W * .38, H * .34, 0, Math.PI, 0, true); ctx.lineTo(W * .88, H * .04); ctx.stroke();
    }
    function draw() {
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1126'); g.addColorStop(1, '#050816'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); court();
      var pa = Math.floor(t / 58) % seq.length, f = (t % 58) / 58, from = pos(seq[pa], t), to = pos(seq[(pa + 1) % seq.length], t), shot = (pa % 5 === 4), ball;
      var ease = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2; var tgt = shot ? [hoop[0] * W, hoop[1] * H] : to; ball = [from[0] + (tgt[0] - from[0]) * ease, from[1] + (tgt[1] - from[1]) * ease - Math.sin(ease * Math.PI) * H * (shot ? .12 : .05)];
      for (i = 0; i < 5; i++) { var o = pos(i, t), lag = pos(i, t - 40), e = Math.hypot(o[0] - lag[0], o[1] - lag[1]);
        var dpos = [(o[0] * .86 + W * .07 * (1 - i * .1)), o[1] - H * .06]; ctx.strokeStyle = 'rgba(190,205,255,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(dpos[0], dpos[1], 8, 0, TAU); ctx.stroke();
        var bel = [(lag[0] * .86 + W * .07 * (1 - i * .1)), lag[1] - H * .06]; var gr = ctx.createRadialGradient(bel[0], bel[1], 0, bel[0], bel[1], 30 + e * 2); gr.addColorStop(0, 'rgba(111,137,255,.28)'); gr.addColorStop(1, 'rgba(111,137,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bel[0], bel[1], 30 + e * 2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#6f89ff'; ctx.beginPath(); ctx.arc(o[0], o[1], 6.5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(ball[0] + 2, ball[1] + H * .03, 4, 2, 0, 0, TAU); ctx.fill();
      var bg = ctx.createRadialGradient(ball[0], ball[1], 0, ball[0], ball[1], 18); bg.addColorStop(0, 'rgba(255,150,60,.55)'); bg.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(ball[0], ball[1], 18, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(ball[0], ball[1], 4.6, 0, TAU); ctx.fill();
    }
    t = 30; draw();
    return { frame: function (dt) { t += dt / 33 * 1.0; draw(); }, fps: 30 };
  }

  /* ---------- 7. Ghalvera: a network whose telemetry is checked by independent verification ---------- */
  function ghalvera(ctx, W, H, R) {
    var nodes = [], links = [], i, j, cx = W / 2, cy = H / 2, tiers = [[0, 1], [.28, 7], [.5, 14], [.74, 20]];
    tiers.forEach(function (t, ti) { for (i = 0; i < t[1]; i++) { var a = (i / t[1]) * TAU + ti * .7 + R() * .25, r = t[0] * Math.min(W, H) * .5 * (ti ? 1 + (R() - .5) * .18 : 0); nodes.push({ x: cx + Math.cos(a) * r * (W / Math.min(W, H)) * .85, y: cy + Math.sin(a) * r, tier: ti, bad: ti > 1 && R() < .13, ver: -99 }); } });
    nodes.forEach(function (a, k) { var cand = nodes.map(function (b, m) { return [m, Math.hypot(a.x - b.x, a.y - b.y), b.tier]; }).filter(function (c) { return c[0] !== k && Math.abs(c[2] - a.tier) <= 1; }).sort(function (p, q) { return p[1] - q[1]; }).slice(0, a.tier === 0 ? 7 : 2); cand.forEach(function (c) { if (!links.some(function (l) { return (l[0] === k && l[1] === c[0]) || (l[0] === c[0] && l[1] === k); })) links.push([k, c[0]]); }); });
    var pk = [], t = 0, sweep = 0; for (i = 0; i < 46; i++) pk.push({ l: (R() * links.length) | 0, p: R(), s: .008 + R() * .014 });
    function draw() {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .75); g.addColorStop(0, '#04201e'); g.addColorStop(1, '#020a0c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(90,230,200,.07)'; ctx.lineWidth = 1; tiers.forEach(function (tt) { if (!tt[0]) return; ctx.beginPath(); ctx.ellipse(cx, cy, tt[0] * Math.min(W, H) * .5 * (W / Math.min(W, H)) * .85, tt[0] * Math.min(W, H) * .5, 0, 0, TAU); ctx.stroke(); });
      ctx.strokeStyle = 'rgba(90,230,200,.2)'; ctx.beginPath(); links.forEach(function (l) { ctx.moveTo(nodes[l[0]].x, nodes[l[0]].y); ctx.lineTo(nodes[l[1]].x, nodes[l[1]].y); }); ctx.stroke();
      var sx = Math.cos(sweep), sy = Math.sin(sweep), sr = Math.max(W, H); var sg = ctx.createConicGradient ? ctx.createConicGradient(sweep - 1.2, cx, cy) : null; if (sg) { sg.addColorStop(0, 'rgba(90,230,200,0)'); sg.addColorStop(.19, 'rgba(90,230,200,.12)'); sg.addColorStop(.2, 'rgba(90,230,200,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H); }
      ctx.strokeStyle = 'rgba(140,255,225,.35)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * sr, cy + sy * sr); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      pk.forEach(function (p) { var l = links[p.l], a = nodes[l[0]], b = nodes[l[1]], bad = a.bad || b.bad, x = a.x + (b.x - a.x) * p.p, y = a.y + (b.y - a.y) * p.p; ctx.fillStyle = bad ? 'rgba(255,170,70,.85)' : 'rgba(150,255,230,.85)'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill(); });
      ctx.globalCompositeOperation = 'source-over';
      nodes.forEach(function (n) { var ang = Math.atan2(n.y - cy, n.x - cx); var d = ((sweep - ang) % TAU + TAU) % TAU; if (d < .08) n.ver = t; var age = t - n.ver, flick = n.bad ? (.5 + .5 * Math.sin(t * .35 + n.x)) : 1;
        ctx.fillStyle = n.bad ? 'rgba(255,170,70,' + (.45 + .5 * flick) + ')' : 'rgba(170,255,235,.95)'; ctx.beginPath(); ctx.arc(n.x, n.y, n.tier === 0 ? 5 : 3, 0, TAU); ctx.fill();
        if (age >= 0 && age < 90) { ctx.strokeStyle = (n.bad ? 'rgba(255,170,70,' : 'rgba(120,255,220,') + (.8 * (1 - age / 90)) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(n.x, n.y, 6 + age * .12, 0, TAU); ctx.stroke(); } });
    }
    sweep = 1.5; t = 60; nodes.forEach(function (n) { n.ver = -99; }); for (i = 0; i < 100; i++) { sweep += .018; t++; nodes.forEach(function (n) { var ang = Math.atan2(n.y - cy, n.x - cx), d = ((sweep - ang) % TAU + TAU) % TAU; if (d < .08) n.ver = t; }); } draw();
    return { frame: function (dt) { var k = dt / 33; t += k; sweep += .018 * k; pk.forEach(function (p) { p.p += p.s * k; if (p.p > 1) { p.p = 0; p.l = (R() * links.length) | 0; } }); draw(); }, fps: 30 };
  }

  var ARTISTS = { sekiya: sekiya, lathilda: lathilda, palinoir: palinoir, mundias: mundias, veceryl: veceryl, fadeaway: fadeaway, ghalvera: ghalvera };

  /* ---------- runtime: static first; build lazily; animate only when visible; judge cost per card, not for the page ---------- */
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, paused = false, stopped = false, scale = 1, cards = [], fpsCap = 30, io = null;
  var saved = null; try { saved = localStorage.getItem('gallery'); } catch (e) {}
  if (saved === 'paused') paused = true;
  function build(o) {
    var c = o.c, r = c.getBoundingClientRect(), W = Math.max(40, Math.round(r.width)), H = Math.max(40, Math.round(r.height)), dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5) * scale;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var t0 = performance.now(); o.art = ARTISTS[c.dataset.art](ctx, W, H, rng(hash(c.dataset.art))); o.built = true; o.buildMs = performance.now() - t0; o.ema = 0; o.dead = false; o.last = 0; c.dataset.state = 'still';
  }
  var queue = [], building = false;
  function pump() { if (building || !queue.length) return; building = true; setTimeout(function () { var o = queue.shift(); if (o && !o.built) build(o); building = false; report(); pump(); }, 30); }
  function setup() {
    cards = [].slice.call(document.querySelectorAll('canvas[data-art]')).map(function (c) { c.dataset.state = 'blank'; return { c: c, built: false, visible: false, queued: false }; });
    io = new IntersectionObserver(function (es) { es.forEach(function (e) { var o = cards.filter(function (x) { return x.c === e.target; })[0]; if (!o) return; o.visible = e.isIntersecting; if (e.isIntersecting && !o.built && !o.queued) { o.queued = true; queue.push(o); pump(); } }); report(); }, { rootMargin: '300px' });
    cards.forEach(function (o) { io.observe(o.c); });
    if (!reduce) {
      requestAnimationFrame(loop);
    }
    addEventListener('resize', function () { clearTimeout(setup.rt); setup.rt = setTimeout(function () { cards.forEach(function (o) { if (o.built) { o.built = false; o.queued = false; } if (o.visible) { o.queued = true; queue.push(o); } }); pump(); }, 300); });
    report();
  }
  function halt(why) { stopped = true; document.documentElement.dataset.gallery = 'stopped:' + why; report(); }
  function report() { document.documentElement.dataset.galleryFps = String(reduce || paused || stopped ? 0 : fpsCap); cards.forEach(function (o) { if (!o.built) return; o.c.dataset.state = (reduce || paused || stopped || o.dead) ? 'still' : (o.visible ? 'live' : 'idle'); }); }
  var lastRaf = 0, gapEma = 0, gapN = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (paused || stopped || document.hidden) { lastRaf = 0; return; }
    if (lastRaf) { var gap = now - lastRaf; if (gap < 500) { gapEma = gapEma ? gapEma * .9 + gap * .1 : gap; if (++gapN > 45 && gapEma > 55) { halt('frames'); return; } } } lastRaf = now;
    var total = 0, any = false;
    cards.forEach(function (o) {
      if (!o.built || !o.visible || o.dead) return;
      var gap = 1000 / Math.min(fpsCap, o.art.fps || 30); if (now - o.last < gap) return;
      var dt = o.last ? now - o.last : 33; o.last = now; var t0 = performance.now(); o.art.frame(Math.min(dt, 100)); var ms = performance.now() - t0; total += ms; any = true;
      o.ema = o.ema ? o.ema * .8 + ms * .2 : ms; o.c.dataset.ms = o.ema.toFixed(1);
      if (o.ema > 16) { o.dead = true; o.c.dataset.state = 'still'; }   // this scene is too heavy for this device: freeze it on its finished still
    });
    if (any) { var live = cards.filter(function (o) { return o.built && o.visible && !o.dead; }); if (!live.length) { halt('cost'); return; } var sum = live.reduce(function (s, o) { return s + (o.ema || 0); }, 0); if (sum > 40) { halt('cost'); return; } if (sum > 22 && fpsCap > 15) { fpsCap = 15; report(); } }
  }
  function wireToggle() {
    var b = document.getElementById('gallery-toggle'); if (!b) return;
    if (reduce) { b.hidden = true; return; }
    function label() { b.setAttribute('aria-pressed', String(paused)); b.textContent = paused ? 'Play the pictures' : 'Pause the pictures'; }
    label(); b.addEventListener('click', function () { window.SystemsGallery.setPaused(!paused); label(); });
  }
  window.SystemsGallery = { setPaused: function (p) { paused = !!p; try { localStorage.setItem('gallery', p ? 'paused' : 'playing'); } catch (e) {} report(); }, get paused() { return paused; }, get reduced() { return reduce; } };
  function start() { setup(); wireToggle(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
