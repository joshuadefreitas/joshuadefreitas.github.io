// Static release contracts for the built site. No browser or npm packages needed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseHTML, textContent } from "./lib/html.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const origin = "https://joshuadefreitas.github.io";
const pages = ["/", "/software/", "/software/workbench/", "/software/trace-npm/", "/software/agent-runs/", "/software/numerical-parity/", "/software/point-in-time/", "/systems/", "/tools/", "/writing/", "/writing/the-agent-is-not-the-model/", "/about/", "/contact/"];
const pageFile = (url) => url === "/" ? path.join(root, "index.html") : path.join(root, url.slice(1), "index.html");
const pagePath = (url) => url === "/" ? "/index.html" : `${url}index.html`;
const existingPages = () => pages.filter((url) => existsSync(pageFile(url)));
const read = (file) => readFileSync(file, "utf8");
const attrs = (source) => parseHTML(source).tags.filter((tag) => !tag.closing);
const named = (tags, name) => tags.filter((tag) => tag.name === name);
const has = (tag, key, value) => tag.attrs.has(key) && (value === undefined || tag.attrs.get(key) === value);
const normalize = (value) => value.split(/\s+/).filter(Boolean);

function page(url) { return { url, file: pageFile(url), source: read(pageFile(url)), tags: attrs(read(pageFile(url))) }; }
function targetFor(url, value) {
  const clean = value.split(/[?#]/)[0];
  if (!clean || clean.startsWith("data:") || clean.startsWith("mailto:") || /^https?:/i.test(clean) || clean.startsWith("//")) return null;
  const base = url.endsWith("/") ? url : path.posix.dirname(url) + "/";
  return clean.startsWith("/") ? clean : path.posix.normalize(path.posix.join(base, clean));
}
function localFile(url) {
  if (url.endsWith("/")) return path.join(root, url.slice(1), "index.html");
  return path.join(root, url.slice(1));
}
function visibleEmail(source) {
  const noMailto = source.replace(/href\s*=\s*(["'])mailto:[\s\S]*?\1/gi, "");
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(textContent(noMailto));
}
function parseColor(value) {
  const hex = value?.trim().match(/^#([\da-f]{3,8})$/i)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((x) => x + x).join("") : hex;
    const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return [...rgb, full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1];
  }
  const rgba = value?.trim().match(/^rgba?\(\s*([\d.]+)[,\s]+\s*([\d.]+)[,\s]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  return rgba ? [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])] : null;
}
function luminance([r, g, b]) { return [r, g, b].map((n) => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0); }
function ratio(a, b) { const [x, y] = [luminance(a), luminance(b)].sort((a, b) => b - a); return (x + .05) / (y + .05); }
function block(css, selector) { return css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\}`, "i"))?.[1] ?? ""; }
function token(css, selector, name) { return block(css, selector).match(new RegExp(`--${name}\\s*:\\s*([^;]+)`, "i"))?.[1]?.trim(); }

test("all required built pages and release files exist", () => {
  for (const url of pages) assert.ok(existsSync(pageFile(url)), `missing built page ${pagePath(url)}`);
  for (const file of ["404.html", "robots.txt", "sitemap.xml", "writing/the-agent-is-not-the-model.html", "assets/css/site.css", "assets/js/theme.js", "assets/js/chladni.js", "assets/js/site.js"]) assert.ok(existsSync(path.join(root, file)), `missing ${file}`);
});

test("pages have semantic document, metadata, and accessibility basics", () => {
  for (const item of existingPages().map(page)) {
    const { tags, source, url } = item;
    assert.equal(tags.filter((tag) => tag.name === "html" && has(tag, "lang", "en")).length, 1, `${url}: html lang=en`);
    assert.equal(named(tags, "title").length, 1, `${url}: exactly one title`);
    const descriptions = named(tags, "meta").filter((tag) => has(tag, "name", "description"));
    assert.equal(descriptions.length, 1, `${url}: exactly one description`);
    assert.ok((descriptions[0]?.attrs.get("content")?.length ?? 0) >= 50 && descriptions[0].attrs.get("content").length <= 200, `${url}: description 50-200 chars`);
    assert.equal(named(tags, "link").filter((tag) => normalize(tag.attrs.get("rel") || "").includes("canonical")).length, 1, `${url}: one canonical`);
    for (const property of ["og:title", "og:description", "og:image", "og:url"]) assert.ok(named(tags, "meta").some((tag) => has(tag, "property", property)), `${url}: missing ${property}`);
    assert.ok(named(tags, "meta").some((tag) => has(tag, "name", "twitter:card")), `${url}: missing twitter:card`);
    assert.equal(named(tags, "h1").length, 1, `${url}: exactly one h1`);
    const levels = named(tags, "h1").concat(named(tags, "h2"), named(tags, "h3"), named(tags, "h4"), named(tags, "h5"), named(tags, "h6")).map((tag) => Number(tag.name[1]));
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] <= levels[i - 1] + 1, `${url}: heading skips from h${levels[i - 1]} to h${levels[i]}`);
    const focusables = tags.filter((tag) => ["a", "button", "input", "select", "textarea"].includes(tag.name) && !(tag.attrs.has("disabled")));
    assert.ok(focusables[0]?.name === "a" && focusables[0].attrs.get("href") === "#main", `${url}: first focusable is skip link to #main`);
    assert.equal(named(tags, "main").filter((tag) => has(tag, "id", "main")).length, 1, `${url}: main#main`);
    assert.ok(named(tags, "nav").some((tag) => tag.attrs.has("aria-label")), `${url}: labelled nav`);
    for (const img of named(tags, "img")) assert.ok(img.attrs.has("alt"), `${url}: img lacks alt`);
    for (const canvas of named(tags, "canvas")) assert.ok(has(canvas, "aria-hidden", "true") || (has(canvas, "role", "img") && canvas.attrs.has("aria-label")), `${url}: canvas needs aria-hidden or image name`);
    for (const button of [...source.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi)]) {
      assert.ok(/\baria-(?:label|labelledby)\s*=|\btitle\s*=/i.test(button[1]) || textContent(button[2]).trim(), `${url}: button needs accessible name`);
    }
    const ids = tags.map((tag) => tag.attrs.get("id")).filter(Boolean); assert.equal(new Set(ids).size, ids.length, `${url}: duplicate ids`);
    for (const anchor of named(tags, "a").filter((tag) => has(tag, "target", "_blank"))) assert.ok(normalize(anchor.attrs.get("rel") || "").includes("noopener"), `${url}: _blank link misses noopener`);
    assert.equal(visibleEmail(source), false, `${url}: email may only be in mailto href`);
  }
});

test("structured data has required schema types", () => {
  const expectations = [["/", "Person"], ["/writing/the-agent-is-not-the-model/", "Article"], ["/software/trace-npm/", /Software(Application|SourceCode)/]];
  for (const [url, wanted] of expectations) if (existsSync(pageFile(url))) {
    const scripts = [...read(pageFile(url)).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(scripts.length, `${url}: JSON-LD script missing`);
    const types = scripts.flatMap((match) => { try { const data = JSON.parse(match[1]); return Array.isArray(data) ? data : [data]; } catch { assert.fail(`${url}: invalid JSON-LD`); } }).map((data) => data["@type"]);
    assert.ok(types.some((type) => wanted instanceof RegExp ? wanted.test(String(type)) : type === wanted), `${url}: missing ${wanted} JSON-LD`);
  }
});

test("local references resolve, fragments exist, and outbound links are restricted", () => {
  const allowed = new Set(["github.com", "www.linkedin.com", "x.com", "www.instagram.com", "www.npmjs.com", "simpleicons.org", "joshuadefreitas.github.io"]);
  for (const item of existingPages().map(page)) for (const tag of item.tags) for (const attribute of ["src", "href"]) {
    const value = tag.attrs.get(attribute); if (!value || value.startsWith("#")) continue;
    if (/^https?:/i.test(value)) {
      const host = new URL(value).hostname.toLowerCase();
      if (["script", "link", "img", "source"].includes(tag.name)) assert.equal(host, new URL(origin).hostname, `${item.url}: third-party ${tag.name} ${value}`);
      if (tag.name === "a") { assert.ok(allowed.has(host), `${item.url}: unapproved outbound href ${value}`); assert.ok(!host.includes("sekiya"), `${item.url}: forbidden sekiya host`); }
      if (host === new URL(origin).hostname) {
        const target = new URL(value).pathname;
        if (target.startsWith("/neural-field-study/")) continue; // a separate project site on the same origin (its own repository)
        assert.ok(existsSync(localFile(target)), `${item.url}: missing internal ${attribute} ${value}`);
        const fragment = new URL(value).hash.slice(1);
        if (fragment && /\.html$|\/$/.test(target)) assert.ok(attrs(read(localFile(target))).some((node) => node.attrs.get("id") === fragment), `${item.url}: fragment #${fragment} absent from ${target}`);
      }
      continue;
    }
    if (value.startsWith("mailto:") || value.startsWith("data:")) continue;
    const target = targetFor(item.url, value); if (!target) continue;
    assert.ok(existsSync(localFile(target)), `${item.url}: missing ${attribute} ${value}`);
    const fragment = value.split("#")[1];
    if (fragment && /\.html$|\/$/.test(target) && existsSync(localFile(target))) assert.ok(attrs(read(localFile(target))).some((tag) => tag.attrs.get("id") === fragment), `${item.url}: fragment #${fragment} absent from ${target}`);
  }
});

test("banned claims and hosts are absent from built HTML", () => {
  const forbiddenWords = [/\bEY\b/];
  const forbidden = ["solicitation", "consulting", "Ernst", "research institute", "independent institute", "canonical repository", "canonical copy", "sekiyalab", "Designed and implemented ·", "more seriously than", "lathilda.research"];
  for (const item of existingPages().map(page)) {
    for (const phrase of forbidden) assert.ok(!item.source.toLowerCase().includes(phrase.toLowerCase()), `${item.url}: forbidden string ${phrase}`);
    for (const word of forbiddenWords) assert.ok(!word.test(item.source), `${item.url}: forbidden word ${word}`);
  }
});

test("sitemap and robots cover the release and 404 is noindex", () => {
  const sitemap = path.join(root, "sitemap.xml"), robots = path.join(root, "robots.txt"), notFound = path.join(root, "404.html");
  if (!existsSync(sitemap) || !existsSync(robots) || !existsSync(notFound)) return;
  const xml = read(sitemap); for (const url of pages) assert.ok(xml.includes(`${origin}${url}`), `sitemap misses ${url}`);
  assert.ok(!xml.includes("/404.html") && !xml.includes("the-agent-is-not-the-model.html"), "sitemap includes excluded URL");
  assert.match(read(robots), /sitemap:\s*https:\/\/joshuadefreitas\.github\.io\/sitemap\.xml/i);
  assert.ok(/<meta\b[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots)/i.test(read(notFound)), "404 lacks noindex");
});

test("CSS fonts, theme contracts, motion contracts and contrast meet release requirements", () => {
  const file = path.join(root, "assets/css/site.css"); if (!existsSync(file)) return;
  const css = read(file);
  for (const font of ["newsreader-var", "newsreader-italic-var", "inter-var", "dm-mono-400"]) { const match = css.match(new RegExp(`@font-face[\\s\\S]*?src:\\s*url\\(\\s*["']?([^"')\\s]*${font}[^"')\\s]*)`, "i")); assert.ok(match, `font-face missing ${font}`); const bytes = readFileSync(path.join(root, match[1].replace(/^\//, "").split(/[?#]/)[0])); assert.equal(bytes.subarray(0, 4).toString(), "wOF2", `${font} is not woff2`); assert.match(match[0], /font-display\s*:/i, `${font} lacks font-display`); }
  assert.match(css, /@view-transition/i); assert.match(css, /prefers-reduced-motion/i); assert.match(css, /:focus-visible/i);
  assert.match(css, /\[data-theme=["']dark["']\]/i); assert.match(css, /@media[^{]*prefers-color-scheme:\s*dark[\s\S]*?:root:not\(\[data-theme=["']light["']\]\)/i);
  const themes = [[":root", "light"], ["[data-theme=\"dark\"]", "dark"]];
  const rows = [];
  for (const [selector, name] of themes) { const bg = parseColor(token(css, selector, "bg")); assert.ok(bg, `${name}: --bg must be hex/rgba`); for (const [ink, min] of [["ink", 7], ["ink2", 7], ["ink3", 4.5], ["cobalt", 4.5]]) { const value = parseColor(token(css, selector, ink)); assert.ok(value, `${name}: --${ink} must be hex/rgba`); const r = ratio(value, bg); rows.push(`${name} ${ink} ${r.toFixed(2)}:1`); assert.ok(r >= min, `${name}: --${ink} ${r.toFixed(2)}:1 is below ${min}:1`); } }
  console.log("contrast\n" + rows.join("\n"));
});

test("build is reproducible when its script is available", () => {
  const script = path.join(root, "scripts/build.mjs");
  if (!existsSync(script)) { console.log("SKIP build reproducibility: scripts/build.mjs not written yet"); return; }
  assert.doesNotThrow(() => execFileSync(process.execPath, [script, "--check"], { cwd: root, stdio: "pipe" }), "build --check failed");
});

test("release byte budgets are respected", () => {
  for (const url of existingPages()) assert.ok(statSync(pageFile(url)).size <= 70_000, `${url} exceeds 70 KB`);
  const css = path.join(root, "assets/css/site.css"); if (existsSync(css)) assert.ok(statSync(css).size <= 45_000, "site.css exceeds 45 KB");
  const jsDir = path.join(root, "assets/js"); if (existsSync(jsDir)) { const bytes = readdirSync(jsDir).filter((name) => name.endsWith(".js")).reduce((total, name) => total + statSync(path.join(jsDir, name)).size, 0); console.log(`total JS: ${bytes} bytes`); assert.ok(bytes <= 40_000, "total JS exceeds 40 KB"); }
  const images = path.join(root, "assets/img"); if (existsSync(images)) for (const name of readdirSync(images, { recursive: true })) { const file = path.join(images, name); if (statSync(file).isFile()) assert.ok(statSync(file).size <= 400_000, `image exceeds 400 KB: ${path.relative(root, file)}`); }
});

test("technology page: every icon exists, every entry has a tier and a note, and nothing is overclaimed", () => {
  const data = JSON.parse(readFileSync(path.join(root, "src/tools.json"), "utf8"));
  assert.ok(existsSync(path.join(root, "assets/icons/LICENSE-simple-icons.txt")), "icon licence is kept with the icons");
  for (const category of data.categories) for (const tool of category.tools) {
    assert.ok(data.tiers[tool.tier], `${tool.name}: unknown tier ${tool.tier}`);
    assert.ok(tool.note && tool.note.length > 10, `${tool.name}: missing note`);
    assert.ok(!("basis" in tool), `${tool.name}: evidence notes stay out of the public repository`);
    if (tool.icon) assert.ok(existsSync(path.join(root, "assets/icons/generic", `${tool.icon}.svg`)) || existsSync(path.join(root, "assets/icons", `${tool.icon}.svg`)), `${tool.name}: icon ${tool.icon} missing`);
    if (tool.tier === "tried") assert.ok(!tool.pro, `${tool.name}: a tool that is only tried cannot be marked professional`);
  }
  const html = readFileSync(path.join(root, "tools/index.html"), "utf8");
  assert.ok(!/expert|proficien|mastery/i.test(html), "no expertise claims on the tools page");
  assert.ok(!/how well I know|Day to day|Set up and tried/.test(html), "no proficiency framing on the tools page");
});
