#!/usr/bin/env node
/* Static site build: src/pages (recursive) + src/partials/*.html -> built pages at the repo root.
   No dependencies. `node scripts/build.mjs` writes; `--check` verifies the committed output is current.
   The contact address is not stored in the repository: set SITE_EMAIL, or put {"email": "..."} in src/site.local.json
   (git-ignored). Without either, the Email link is built as a visible placeholder and the build says so. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const site = JSON.parse(readFileSync(join(root, 'src/site.json'), 'utf8'));
const localFile = join(root, 'src/site.local.json');
const email = process.env.SITE_EMAIL || (existsSync(localFile) ? JSON.parse(readFileSync(localFile, 'utf8')).email : '') || '';
const tools = JSON.parse(readFileSync(join(root, 'src/tools.json'), 'utf8'));
const iconFile = (id) => { const g = join(root, 'assets/icons/generic', id + '.svg'); return existsSync(g) ? g : join(root, 'assets/icons', id + '.svg'); };
const symbol = (id) => { const svg = readFileSync(iconFile(id), 'utf8'); const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').replace(/<title>[\s\S]*?<\/title>/, ''); return `<symbol id="i-${id}" viewBox="0 0 24 24">${inner}</symbol>`; };
const eh = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderTools() {
  const used = [...new Set(tools.categories.flatMap((c) => c.tools.map((t) => t.icon).filter(Boolean)))].sort();
  let out = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${used.map(symbol).join('')}</svg>\n`;
  tools.categories.forEach((c, i) => {
    out += `<section class="s tcat" id="${c.id}"><div class="wrap grid"><div class="rail"><h2><span>${String(i + 1).padStart(2, '0')}</span>${eh(c.title)}</h2></div><div>\n<p class="lede">${eh(c.lede)}</p>\n`;
    for (const tier of ['daily', 'regular', 'tried']) {
      const list = c.tools.filter((t) => t.tier === tier); if (!list.length) continue;
      out += `<div class="tier"><h3 class="tier-h mono">${tools.tiers[tier]}</h3><ul class="tl">`;
      for (const t of list) {
        const mark = t.icon ? `<svg class="ti" aria-hidden="true" focusable="false"><use href="#i-${t.icon}"/></svg>` : `<span class="ti ti-none" aria-hidden="true">${eh(t.name[0])}</span>`;
        const pro = t.pro ? `<span class="pro" title="${eh(tools.legend)}"><span class="vh"> (${eh(tools.legend.toLowerCase())})</span></span>` : '';
        out += `<li class="tool ${tier}"><span class="tname">${mark}<b>${eh(t.name)}</b>${pro}</span><span class="tnote">${eh(t.note)}</span></li>`;
      }
      out += `</ul></div>\n`;
    }
    out += `</div></div></section>\n`;
  });
  return out;
}
function toolsSummary() {
  return '<div class="rows">' + tools.categories.map((c) => `<a class="row" href="/tools/#${c.id}"><h3>${eh(c.title)}</h3><p>${eh(c.tools.filter((t) => t.tier !== 'tried').map((t) => t.name).slice(0, 5).join(', ') || c.tools.slice(0, 4).map((t) => t.name).join(', '))}</p><span class="mono">See →</span></a>`).join('') + '</div>';
}
const partial = (n) => readFileSync(join(root, 'src/partials', n + '.html'), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, vars) => tpl.replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => vars[k] ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => esc(vars[k] ?? ''));
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });

const pages = [];
for (const file of walk(join(root, 'src/pages')).sort()) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${relative(root, file)}: missing <!--meta {...}--> header`);
  pages.push({ meta: JSON.parse(m[1]), body: raw.slice(m[0].length).replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => partial(n).trim()), file });
}

const mailto = email ? `mailto:${email}` : 'mailto:set-SITE_EMAIL@invalid';
if (!email) console.warn('warning: SITE_EMAIL is not set; the Email link is a placeholder.');
const nav = (active) => site.nav.map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
const elsewhere = [`<a class="ul" href="${mailto}">Email</a>`, ...site.social.map((s) => `<a class="ul" href="${s.href}" target="_blank" rel="me noopener noreferrer">${s.label} ↗</a>`)].join('');

const outputs = new Map();
const withMail = (b) => b.replace(/\{\{\{mailto\}\}\}/g, mailto).replace(/\{\{\{tools\}\}\}/g, () => renderTools()).replace(/\{\{\{toolsSummary\}\}\}/g, () => toolsSummary());
for (const { meta, body, file } of pages) {
  if (!meta.path || !meta.title || !meta.description) throw new Error(`${relative(root, file)}: meta needs path, title, description`);
  const canonical = site.url + (meta.stub || meta.path);
  const jsonld = (meta.jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n');
  const head = fill(partial('head'), {
    title: meta.title, description: meta.description, canonical, ogTitle: meta.ogTitle || meta.title, ogType: meta.ogType || 'website',
    ogImage: site.url + (meta.ogImage || site.ogImage), italic: meta.italic ? '<link rel="preload" href="/assets/fonts/newsreader-italic-var.woff2" as="font" type="font/woff2" crossorigin>' : '', robots: meta.noindex ? '<meta name="robots" content="noindex">\n' : '', jsonld,
  });
  let html;
  if (meta.stub) {
    html = `<!doctype html>\n<html lang="en">\n<head>\n${head}\n<meta http-equiv="refresh" content="0; url=${meta.stub}">\n</head>\n<body>\n<p><a href="${meta.stub}">This essay has moved.</a></p>\n</body>\n</html>\n`;
  } else {
    const mast = fill(partial('masthead'), { nav: nav(meta.nav) });
    const foot = fill(partial('footer'), { elsewhere });
    html = `<!doctype html>\n<html lang="en" data-theme="light">\n<head>\n${head}\n</head>\n<body>\n${meta.progress ? '<div class="progress" id="progress" aria-hidden="true"></div>\n' : ''}${mast}\n<main id="main" tabindex="-1">\n${withMail(body.trim())}\n</main>\n${foot}\n</body>\n</html>\n`;
  }
  outputs.set(meta.path.endsWith('/') ? meta.path + 'index.html' : meta.path, html);
}
const urls = pages.filter(({ meta }) => !meta.noindex && !meta.stub).map(({ meta }) => site.url + meta.path).sort();
outputs.set('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
outputs.set('/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

let stale = 0;
for (const [path, content] of outputs) {
  const dest = join(root, path.replace(/^\//, ''));
  if (check) { if (!existsSync(dest) || readFileSync(dest, 'utf8') !== content) { console.error('out of date:', path); stale++; } }
  else { mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, content); }
}
if (check) { if (stale) process.exit(1); console.log(`build is current (${outputs.size} files)`); }
else console.log(`built ${outputs.size} files`);
