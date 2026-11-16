/* Sets the colour theme before first paint. An explicit choice (localStorage) beats the system setting. */
(function () {
  var t = null;
  try { t = localStorage.getItem('theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'dark' ? '#0d0e11' : '#f5f2eb');
})();
