#!/usr/bin/env node
/* Post-deploy verification of the live site (no dependencies): node scripts/verify-live.mjs https://joshuadefreitas.github.io */
const base = (process.argv[2] || 'https://joshuadefreitas.github.io').replace(/\/$/, '');
const fails = [], notes = [];
const get = async (path, init) => { const r = await fetch(base + path, { redirect: 'manual', ...init }); return { r, text: r.headers.get('content-type')?.match(/text|json|xml|html/) ? await r.text() : (await r.arrayBuffer(), '') }; };
const ok = (c, m) => { if (!c) fails.push(m); };

const sm = await get('/sitemap.xml'); ok(sm.r.status === 200, `sitemap ${sm.r.status}`);
const urls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(urls.length >= 13, `sitemap lists ${urls.length} pages`);
const seen = new Set(), assets = new Set(), links = new Set();
for (const u of urls) {
  const p = new URL(u).pathname; const { r, text } = await get(p);
  ok(r.status === 200, `${p}: ${r.status}`); if (r.status !== 200) continue;
  ok(!/set-SITE_EMAIL@invalid/.test(text), `${p}: placeholder contact address is live`);
  ok(/<title>[^<]{5,}<\/title>/.test(text) && /<h1[ >]/.test(text) && /rel="canonical"/.test(text), `${p}: title, h1 or canonical missing`);
  for (const m of text.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) { try { JSON.parse(m[1]); } catch { fails.push(`${p}: invalid JSON-LD`); } }
  for (const m of text.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) (m[1].startsWith('/assets/') ? assets : links).add(m[1]);
  seen.add(p);
}
const contact = await get('/contact/'); ok(/href="mailto:[^"@\s]+@[^"\s]+"/.test(contact.text), 'contact: no mailto link');
for (const a of ['/assets/fonts/newsreader-var.woff2', '/assets/fonts/newsreader-italic-var.woff2', '/assets/fonts/inter-var.woff2', '/assets/fonts/dm-mono-400.woff2', ...assets]) {
  const r = await fetch(base + a, { method: 'HEAD' }); ok(r.status === 200, `asset ${a}: ${r.status}`);
  if (a.endsWith('.woff2')) ok(/font\/woff2|application\/octet-stream|font/.test(r.headers.get('content-type') || ''), `font ${a}: content-type ${r.headers.get('content-type')}`);
}
for (const l of links) { if (seen.has(l)) continue; const r = await fetch(base + l, { method: 'HEAD', redirect: 'manual' }); ok(r.status === 200 || r.status === 301, `link ${l}: ${r.status}`); }
const legacy = await get('/writing/the-agent-is-not-the-model.html'); ok(/http-equiv="refresh"/.test(legacy.text) && /the-agent-is-not-the-model\//.test(legacy.text), 'legacy essay URL does not redirect');
const nf = await get('/this-page-does-not-exist/'); ok(nf.r.status === 404 && /noindex/.test(nf.text) && /Wrong turn/.test(nf.text), `404 page: status ${nf.r.status}`);
const rb = await get('/robots.txt'); ok(/Sitemap:/.test(rb.text), 'robots.txt lacks Sitemap');
const home = await get('/'); ok(!/sekiyalab|solicitation|consulting|research institute/i.test(home.text), 'forbidden language on home');
console.log(`${urls.length} pages, ${assets.size} assets, ${links.size} internal links checked on ${base}`);
if (fails.length) { console.error('LIVE VERIFICATION FAILED:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('live verification OK');
