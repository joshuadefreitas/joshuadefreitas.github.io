// Chladni figures: nodal lines of a vibrating plate, closed form (no simulation, no warm-up).
// Deterministic from a seed string. Animation is a slow mix between standing modes; a governor
// degrades frame rate, then stops, if frames get expensive. Still under reduced motion.
(function () {
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };

  window.Chladni = function (canvas, o) {
    o = o || {};
    var R = rng(hash(o.seed || 'journal')), K = o.modes || 4, modes = [];
    for (var k = 0; k < K; k++) { var n = 2 + (R() * 6 | 0), m = n + 1 + (R() * 4 | 0); modes.push({ n: n, m: m, f: .08 + R() * .12, p: R() * 6.28, ax: (R() - .5) * 2.4, ay: (R() - .5) * 2.4 }); }
    var ctx = canvas.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, o.maxDpr || 2), W = 0, H = 0, gx = 0, gy = 0, cx = [], cy = [], f = null;
    var t = o.t0 == null ? 21 : o.t0, px = 0, py = 0, tx = 0, ty = 0, ema = 0, fps = 30, stopped = false, scale = 1, paused = false;
    function size() {
      var r = canvas.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var cell = (o.cell || 5.2) / scale; gx = Math.max(24, Math.round(W / cell)); gy = Math.max(16, Math.round(H / cell)); f = new Float32Array((gx + 1) * (gy + 1));
      cx = modes.map(function (m) { var a = new Float32Array(gx + 1), b = new Float32Array(gx + 1); for (var i = 0; i <= gx; i++) { a[i] = Math.cos(m.n * Math.PI * i / gx); b[i] = Math.cos(m.m * Math.PI * i / gx); } return [a, b]; });
      cy = modes.map(function (m) { var a = new Float32Array(gy + 1), b = new Float32Array(gy + 1); for (var j = 0; j <= gy; j++) { a[j] = Math.cos(m.n * Math.PI * j / gy); b[j] = Math.cos(m.m * Math.PI * j / gy); } return [a, b]; });
    }
    function field() {
      var w = modes.map(function (m) { return .5 + .5 * Math.sin(t * m.f + m.p + px * m.ax + py * m.ay); }), s = 0;
      for (var j = 0; j <= gy; j++) for (var i = 0; i <= gx; i++) {
        s = 0; for (var k = 0; k < modes.length; k++) s += w[k] * (cx[k][0][i] * cy[k][1][j] - cx[k][1][i] * cy[k][0][j]);
        f[j * (gx + 1) + i] = s / modes.length * 1.6;
      }
    }
    function lines(th, path) {
      var sx = W / gx, sy = H / gy, g = gx + 1;
      for (var j = 0; j < gy; j++) for (var i = 0; i < gx; i++) {
        var a = f[j * g + i], b = f[j * g + i + 1], c = f[(j + 1) * g + i + 1], d = f[(j + 1) * g + i];
        var m = (a > th ? 8 : 0) | (b > th ? 4 : 0) | (c > th ? 2 : 0) | (d > th ? 1 : 0); if (m === 0 || m === 15) continue;
        var Tx = (i + (th - a) / (b - a)) * sx, Ty = j * sy, Bx = (i + (th - d) / (c - d)) * sx, By = (j + 1) * sy, Lx = i * sx, Ly = (j + (th - a) / (d - a)) * sy, Rx = (i + 1) * sx, Ry = (j + (th - b) / (c - b)) * sy;
        switch (m) {
          case 1: case 14: path.moveTo(Lx, Ly); path.lineTo(Bx, By); break; case 2: case 13: path.moveTo(Bx, By); path.lineTo(Rx, Ry); break;
          case 3: case 12: path.moveTo(Lx, Ly); path.lineTo(Rx, Ry); break; case 4: case 11: path.moveTo(Tx, Ty); path.lineTo(Rx, Ry); break;
          case 5: path.moveTo(Tx, Ty); path.lineTo(Lx, Ly); path.moveTo(Bx, By); path.lineTo(Rx, Ry); break;
          case 10: path.moveTo(Tx, Ty); path.lineTo(Rx, Ry); path.moveTo(Lx, Ly); path.lineTo(Bx, By); break;
          case 6: case 9: path.moveTo(Tx, Ty); path.lineTo(Bx, By); break; case 7: case 8: path.moveTo(Tx, Ty); path.lineTo(Lx, Ly); break;
        }
      }
    }
    function draw() {
      var t0 = performance.now(); field(); ctx.clearRect(0, 0, W, H); ctx.lineJoin = ctx.lineCap = 'round';
      var soft = new Path2D(), hard = new Path2D(); lines(.2, soft); lines(-.2, soft); lines(0, hard);
      ctx.strokeStyle = css('--cobalt-soft'); ctx.lineWidth = o.soft || .6; ctx.stroke(soft);
      ctx.strokeStyle = css('--cobalt'); ctx.lineWidth = o.hard || 1.15; ctx.stroke(hard);
      return performance.now() - t0;
    }
    // Pick a quality tier from what a frame actually costs on this device (cold frame, then warm), not from a guess.
    size(); draw(); var ms0 = draw(), budget = o.budget || 14, tooSlow = false;
    if (ms0 > 10 && dpr > 1) { dpr = 1; size(); draw(); ms0 = draw(); } // raster cost scales with pixels: drop to 1x first
    scale = Math.min(1, Math.sqrt(budget / Math.max(ms0, 1)));
    if (scale < .999) { size(); ms0 = draw(); }
    fps = ms0 < 5 ? 30 : ms0 < 9 ? 20 : 12;
    if (scale < .42) tooSlow = true;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, visible = true, last = 0, raf = 0, still = o.still || reduce || tooSlow;
    if (tooSlow && !o.still) { scale = 1; size(); draw(); canvas.dataset.governor = 'static'; }
    function report() { canvas.dataset.fps = String(paused || still ? 0 : fps); canvas.dataset.scale = String(scale); if (stopped && !canvas.dataset.governor) canvas.dataset.governor = 'stopped'; }
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (stopped || paused || !visible || document.hidden || ts - last < 1000 / fps) return;
      var dt = (ts - last) / 1000; last = ts; t += Math.min(dt, .1) * (o.speed || 1); px += (tx - px) * .06; py += (ty - py) * .06;
      var ms = draw(); ema = ema ? ema * .75 + ms * .25 : ms;
      if (ema > budget * 1.6) { stopped = true; scale = 1; size(); draw(); canvas.dataset.governor = 'stopped'; }
      else if (ema > budget && fps > 12) { fps = 12; }
      report();
    }
    // Frame time seen by the browser (not just our own draw time): three long tasks in four seconds means this device cannot keep up.
    if (!still && window.PerformanceObserver && (PerformanceObserver.supportedEntryTypes || []).indexOf('longtask') >= 0) {
      setTimeout(function () {
        var longs = 0, t0 = performance.now();
        try { new PerformanceObserver(function (l) {
          var n = performance.now(); if (n - t0 > 4000) { t0 = n; longs = 0; }
          longs += l.getEntries().length;
          if (longs >= 3 && !stopped) { stopped = true; scale = 1; size(); draw(); canvas.dataset.governor = 'stopped'; report(); }
        }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
      }, 1200);
    }
    if (!still) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
      if (o.pointer) canvas.addEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 3; ty = ((e.clientY - r.top) / r.height - .5) * 3; canvas.dataset.pointer = tx.toFixed(2) + ',' + ty.toFixed(2); });
      raf = requestAnimationFrame(loop);
    }
    addEventListener('resize', function () { size(); draw(); }); addEventListener('themechange', draw);
    report();
    return {
      redraw: draw, ms: function () { return ema; },
      pause: function () { paused = true; report(); }, resume: function () { paused = false; last = 0; report(); },
      get paused() { return paused; }, get still() { return still; }
    };
  };
})();
