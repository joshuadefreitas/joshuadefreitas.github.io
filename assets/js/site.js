/* Site behaviour: theme toggle, plate pause control, reading progress, small demos. Everything here is optional:
   without JavaScript the pages render completely (the figure is drawn once, the theme follows the system). */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme');
  function themeLabel() {
    if (!btn) return;
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    btn.textContent = next === 'dark' ? 'Dark' : 'Light';
    btn.setAttribute('aria-label', 'Switch to the ' + next + ' theme');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', root.dataset.theme === 'dark' ? '#0d0e11' : '#f5f2eb');
  }
  if (btn) {
    themeLabel();
    btn.addEventListener('click', function () {
      var n = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = n;
      try { localStorage.setItem('theme', n); } catch (e) {}
      themeLabel();
      window.dispatchEvent(new Event('themechange'));
    });
  }

  // Hero figure: the Chladni plate, with a pause control (persisted).
  var plate = document.getElementById('plate');
  if (plate && window.Chladni) {
    var chl = Chladni(plate, { seed: plate.dataset.seed || 'journal', pointer: true, t0: 21 });
    var tog = document.querySelector('.plate-toggle');
    var saved = null;
    try { saved = localStorage.getItem('plate'); } catch (e) {}
    function setPaused(p) {
      if (p) chl.pause(); else chl.resume();
      if (tog) { tog.setAttribute('aria-pressed', String(p)); tog.textContent = p ? 'Play' : 'Pause'; }
      try { localStorage.setItem('plate', p ? 'paused' : 'playing'); } catch (e) {}
    }
    if (tog) {
      if (chl.still) { tog.hidden = true; }
      else {
        tog.addEventListener('click', function () { setPaused(!chl.paused); });
        if (saved === 'paused') setPaused(true);
      }
    }
  }

  // Reading progress on long-form pages.
  var bar = document.getElementById('progress');
  if (bar) {
    var upd = function () { var h = root, m = h.scrollHeight - h.clientHeight; bar.style.width = (m > 0 ? h.scrollTop / m * 100 : 0) + '%'; };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  }

  // trace-npm: still image by default; the recording plays only on request.
  document.querySelectorAll('[data-demo]').forEach(function (b) {
    var img = document.getElementById(b.dataset.demo), still = img.getAttribute('src'), live = img.dataset.live, on = false;
    b.addEventListener('click', function () {
      on = !on; img.setAttribute('src', on ? live : still);
      b.textContent = on ? 'Stop the recording' : 'Play the recording'; b.setAttribute('aria-pressed', String(on));
    });
  });


  // Home: load the scene scripts only when the projects strip is near the viewport; drive the strip's controls.
  var lazy = document.querySelector('[data-lazy-gallery]');
  if (lazy) {
    var loaded = false, load = function () { if (loaded) return; loaded = true; ['/assets/js/world-mask.js', '/assets/js/gs-state.js', '/assets/js/systems-art.js'].reduce(function (p, src) { return p.then(function () { return new Promise(function (res) { var sc = document.createElement('script'); sc.src = src; sc.onload = sc.onerror = res; document.body.appendChild(sc); }); }); }, Promise.resolve()); };
    if ('IntersectionObserver' in window) { var lio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { load(); lio.disconnect(); } }, { rootMargin: '600px 0px' }); lio.observe(lazy); } else load();
    var strip = document.getElementById('strip'), wrap = strip && strip.parentNode, prev = document.getElementById('strip-prev'), next = document.getElementById('strip-next'), bar = document.getElementById('strip-bar'), nEl = document.getElementById('strip-n');
    if (strip) {
      var pad = function () { var vw = document.documentElement.clientWidth, w = Math.min(1240, vw), p = Math.max(vw - w, 0) / 2 + Math.min(Math.max(vw * .05, 20), 56); strip.style.setProperty('--strip-pad', p + 'px'); };
      var step = function () { var it = strip.querySelector('.strip-item'); return it ? it.getBoundingClientRect().width + parseFloat(getComputedStyle(strip).columnGap || 20) : 320; };
      var sync = function () {
        var max = strip.scrollWidth - strip.clientWidth, x = strip.scrollLeft, items = strip.querySelectorAll('.strip-item'), first = 0, k, left = strip.getBoundingClientRect().left + parseFloat(getComputedStyle(strip).paddingLeft || 0) - 10;
        for (k = 0; k < items.length; k++) { if (items[k].getBoundingClientRect().left >= left) { first = k; break; } first = items.length - 1; }
        if (nEl) nEl.textContent = String(x > max - 4 ? items.length : first + 1);
        if (prev) prev.disabled = x < 4; if (next) next.disabled = x > max - 4;
        if (bar) { var frac = Math.min(1, strip.clientWidth / strip.scrollWidth); bar.style.width = (frac * 100) + '%'; bar.style.transform = 'translateX(' + ((max > 0 ? x / max : 0) * (1 / frac - 1) * 100) + '%)'; }
        wrap.classList.toggle('end', x > max - 4);
      };
      var reduceM = matchMedia('(prefers-reduced-motion: reduce)').matches, go = function (dir) { strip.scrollBy({ left: dir * step() * (innerWidth > 900 ? 2 : 1), behavior: reduceM ? 'auto' : 'smooth' }); };
      if (prev) prev.addEventListener('click', function () { go(-1); }); if (next) next.addEventListener('click', function () { go(1); });
      strip.addEventListener('scroll', function () { if (!sync.t) sync.t = requestAnimationFrame(function () { sync.t = 0; sync(); }); }, { passive: true });
      strip.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); } });
      addEventListener('resize', function () { pad(); sync(); }); pad(); sync();
    }
  }

  // The essay's interactive map: turn parts of the system off and see what the claim becomes.
  var parts = [].slice.call(document.querySelectorAll('[data-part]')), readout = document.getElementById('system-readout');
  if (parts.length && readout) {
    var meaning = {
      m: 'the model proposes the next action', i: 'instructions decide what kind of action is even asked for', t: 'tools decide what the action can touch',
      mu: 'memory decides which earlier observations the model still sees', e: 'the environment decides what comes back', f: 'feedback can accept, reject or reshape the next step',
      p: 'permissions decide which of the above are real rather than described', o: 'orchestration decides the order, the retries and the stop'
    };
    var render = function () {
      var on = parts.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }), bits = on.map(function (b) { return meaning[b.dataset.part]; });
      var modelOn = on.some(function (b) { return b.dataset.part === 'm'; }), rest = on.filter(function (b) { return b.dataset.part !== 'm'; }).length, claim;
      if (!modelOn && rest === 0) claim = 'Nothing in the map is turned on. There is no observation to attribute.';
      else if (modelOn && rest === 0) claim = 'Only the model is in view. That is a model measurement. It is not yet an agent.';
      else if (!modelOn) claim = 'The model is off and other parts remain. This is no longer a well-posed agent. The scaffolding is not a behavior by itself.';
      else claim = 'The model is held fixed. ' + rest + (rest === 1 ? ' other part is' : ' other parts are') + ' still in the observation, so a score of this run is a score of the system.';
      readout.textContent = claim + (bits.length ? ' In view: ' + bits.join('; ') + '.' : '');
    };
    parts.forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); render(); }); });
    render();
  }
})();
