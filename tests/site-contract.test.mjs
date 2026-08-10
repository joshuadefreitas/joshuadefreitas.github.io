// Hand-authored structural contracts. This suite contains no generated fixtures.
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const html = readFileSync(path.join(root, "index.html"), "utf8");
const css = readFileSync(path.join(root, "styles.css"), "utf8");
const workflowPath = path.join(root, ".github/workflows/site-contract.yml");
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, "utf8") : "";

function localPath(relativePath) {
  return path.join(root, relativePath.replace(/[?#].*$/, ""));
}

function themeToken(theme, name) {
  const selector = theme === "light"
    ? /:root,\s*\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
    : /\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/;
  const block = css.match(selector)?.[1];
  assert.ok(block, `missing ${theme} theme block`);
  const value = block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  assert.ok(value, `missing hexadecimal --${name} token in ${theme} theme`);
  return value;
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
  const light = Math.max(relativeLuminance(a), relativeLuminance(b));
  const dark = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (light + 0.05) / (dark + 0.05);
}

test("inline scripts are syntactically valid", () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 3, "expected theme, field, and site scripts");
  scripts.forEach((match, index) => {
    assert.doesNotThrow(() => new Function(match[1]), `inline script ${index + 1} must compile`);
  });
});

test("the production field generator preserves its seeded sequence", () => {
  const match = html.match(/        function prng\(seed\) \{([\s\S]*?)\n        \}/);
  assert.ok(match, "production PRNG must remain directly testable");
  const source = `function prng(seed) {${match[1]}\n}`;
  const prng = new Function(`${source}\nreturn prng;`)();
  const actual = Array.from({ length: 8 }, prng(20260810));
  assert.deepEqual(actual, [
    0.5459702829830348,
    0.8996801879256964,
    0.47586432425305247,
    0.29149732063524425,
    0.7152024004608393,
    0.4520007197279483,
    0.17685140459798276,
    0.44571845466271043
  ]);
  assert.deepEqual(actual, Array.from({ length: 8 }, prng(20260810)));
  assert.notDeepEqual(actual, Array.from({ length: 8 }, prng(20260811)));
  actual.forEach((value) => assert.ok(value >= 0 && value < 1));
});

test("the site contracts are enforced on pushes and pull requests", () => {
  assert.ok(workflow, "the tracked GitHub Actions workflow is required");
  assert.match(workflow, /push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
});

test("document ids are unique and navigation fragments resolve", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate ids make navigation and labels ambiguous");

  const fragments = [...html.matchAll(/<nav[^>]*>[\s\S]*?<\/nav>/g)]
    .flatMap((nav) => [...nav[0].matchAll(/href="#([^"]+)"/g)].map((match) => match[1]));
  assert.ok(fragments.length >= 4, "primary navigation should expose all main sections");
  fragments.forEach((fragment) => assert.ok(ids.includes(fragment), `missing target #${fragment}`));
});

test("external new-tab links carry an isolation relationship", () => {
  const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]);
  const newTabs = anchors.filter((tag) => /target="_blank"/.test(tag));
  assert.ok(newTabs.length > 0);
  newTabs.forEach((tag) => assert.match(tag, /rel="[^"]*noreferrer[^"]*"/));
});

test("metadata has a complete canonical and social identity", () => {
  assert.match(html, /rel="canonical" href="https:\/\/joshuadefreitas\.github\.io\/"/);
  assert.match(html, /property="og:type" content="website"/);
  assert.match(html, /property="og:image" content="https:\/\/joshuadefreitas\.github\.io\/assets\/social-card\.jpg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.ok(existsSync(localPath("assets/social-card.jpg")));
  assert.ok(existsSync(localPath("assets/icon-32.png")));
  assert.ok(existsSync(localPath("assets/icon-180.png")));
});

test("all referenced local assets exist", () => {
  const references = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !/^(?:https?:|mailto:|data:)/.test(value));
  const responsiveImages = [...html.matchAll(/srcset="([^"]+)"/g)]
    .flatMap((match) => match[1].split(","))
    .map((candidate) => candidate.trim().split(/\s+/)[0]);
  references.push(...responsiveImages);
  references.forEach((reference) => {
    assert.ok(existsSync(localPath(reference)), `missing local asset: ${reference}`);
  });
});

test("fonts are self-hosted and transfer assets stay within their budgets", () => {
  assert.doesNotMatch(html + css, /fonts\.(?:googleapis|gstatic)\.com/);

  const budgets = new Map([
    ["assets/hero-field-study-600.webp", 40_000],
    ["assets/hero-field-study-800.webp", 60_000],
    ["assets/hero-field-study.webp", 150_000],
    ["assets/social-card.jpg", 150_000],
    ["assets/icon-32.png", 8_000],
    ["assets/icon-180.png", 30_000],
    ["assets/trace-npm-demo.webp", 70_000],
    ["assets/trace-npm-demo-still.webp", 25_000],
    ["assets/fonts/newsreader-display-300.woff2", 35_000],
    ["assets/fonts/newsreader-text-300.woff2", 35_000],
    ["assets/fonts/newsreader-text-400.woff2", 35_000],
    ["assets/fonts/inter-latin.woff2", 75_000],
    ["assets/fonts/dm-mono-latin.woff2", 20_000]
  ]);

  budgets.forEach((budget, relativePath) => {
    const size = statSync(localPath(relativePath)).size;
    assert.ok(size <= budget, `${relativePath} is ${size} bytes; budget is ${budget}`);
  });
});

test("theme text remains readable and the structural edge scale stays deliberate", () => {
  for (const theme of ["light", "dark"]) {
    const paper = themeToken(theme, "paper");
    assert.ok(contrastRatio(themeToken(theme, "ink"), paper) >= 12, `${theme} primary ink is too faint`);
    assert.ok(contrastRatio(themeToken(theme, "ink-2"), paper) >= 7, `${theme} body ink is too faint`);
    assert.ok(contrastRatio(themeToken(theme, "ink-3"), paper) >= 4.5, `${theme} muted ink is too faint`);
    assert.ok(contrastRatio(themeToken(theme, "line"), paper) >= 1.25, `${theme} hairline is disappearing`);
    assert.ok(contrastRatio(themeToken(theme, "line-2"), paper) >= 1.6, `${theme} component edge is too faint`);
    assert.ok(contrastRatio(themeToken(theme, "line-3"), paper) >= 2.4, `${theme} active edge is too faint`);
  }
  assert.match(css, /--silver-edge: #[0-9a-f]{6}/i);
  assert.match(css, /\.section \+ \.section::before\s*\{[\s\S]*?height: 2px/);
  assert.match(css, /\.section-head\s*\{[\s\S]*?border-top: 1\.5px solid var\(--line-2\)/);
  assert.match(css, /\.card\s*\{[\s\S]*?border: 1\.5px solid var\(--line-2\)/);
  assert.match(css, /\.card-visual\s*\{[\s\S]*?border-bottom: 1\.5px solid var\(--line-2\)/);
  assert.match(css, /--notation-ink: #272a2f/);
});

test("every project card carries its own claim boundary", () => {
  const cards = [...html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)].map((match) => match[1]);
  assert.equal(cards.length, 4, "selected work should remain a deliberate four-project set");
  cards.forEach((card, index) => {
    assert.match(card, /class="card-limit"/, `card ${index + 1} is missing an in-artifact limit`);
  });
});

test("each study explains its mechanism before its specialist framing", () => {
  assert.match(html, /Each active cell encourages its nearest neighbours and suppresses a wider ring around it/);
  assert.match(html, /near-duplicates appear in both training and validation/);
  assert.match(html, /which patterns come from the rule and which depend on numerical choices/);
  assert.match(html, /how a flawed test can manufacture confidence/);
});

test("the personal-work boundary cannot read as a job or consulting solicitation", () => {
  assert.match(html, /senior data engineer and AI practitioner based in Madrid, working at EY/i);
  assert.doesNotMatch(html, /\bESG\b/);
  assert.match(html, /personal, publicly released work and separate from\s+my role at\s+EY/i);
  assert.match(html, /not a solicitation for employment or consulting/i);
  assert.doesNotMatch(html, /available for consulting|permanent roles|outside client work|alongside client work/i);
  assert.match(html, /Questions about the published work are welcome/);
  assert.match(css, /\.professional-boundary\s*\{[\s\S]*?border-top: 1\.5px solid var\(--line-2\)/);
});

test("DeepLOB foregrounds the active leakage study rather than legacy results", () => {
  assert.match(html, /Random split[\s\S]*overlap 1\.00/);
  assert.match(html, /Purged \+ embargoed[\s\S]*overlap 0\.00/);
  assert.match(html, /when-overlapping-windows-invent-predictability\.md/);
  assert.doesNotMatch(html, /deeplob_paper\.pdf/);
  assert.match(html, /Does not establish<\/span> tradability, profit or a real market signal/);
});

test("the deterministic field exposes reproducible and accessible state", () => {
  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) || []).length, 4);
  assert.doesNotMatch(html, /function orderBook\(|Show the order book|synthetic order book  → DeepLOB/);
  assert.match(html, /function waveField\(\)/);
  assert.match(html, /const fieldAspect = Math\.min\(2\.4, Math\.max\(0\.42,/);
  assert.match(html, /const cellBudget = narrow \? 112000 : 196000/);
  assert.match(html, /function levelSetField\(\)/);
  assert.match(html, /const phaseSinA = new Float32Array\(N\)/);
  assert.match(html, /const phaseCosB = new Float32Array\(N\)/);
  assert.match(html, /const rowsPerWarmStep = Math\.ceil\(H \/ warm\)/);
  assert.match(html, /const builders = \[grayScott, neuralField, waveField, levelSetField\]/);
  assert.doesNotMatch(html, /function flowField\(\)|const trail = new Float32Array\(N\)|Math\.exp\(-flowY/);
  assert.match(html, /const sources = \[/);
  assert.match(html, /const rowsPerWarmStep = Math\.ceil\(H \/ warm\)/);
  assert.match(html, /Math\.sqrt\(dx \* dx \+ dy \* dy\) \* source\.frequency/);
  assert.match(html, /if \(builtRows < H\) return/);
  assert.match(html, /INVERT \? 0\.56 : 0\.48/);
  assert.match(html, /Math\.abs\(contourA\) \/ 0\.18/);
  assert.match(html, /Math\.abs\(contourB\) \/ 0\.14/);
  assert.match(html, /ridgeA = ridgeA \* ridgeA \* \(3 - 2 \* ridgeA\)/);
  assert.match(html, /INVERT \? 0\.66 : 0\.56/);
  assert.match(html, /name: "Level-set topology", warm, perStep: 1, tickMs: 80/);
  assert.match(html, /nextSim && !fading && \(!nextSim\.pending \|\| prime\(nextSim, PRIME_MS, false\)\)/);
  assert.match(html, /Math\.imul\(SEED, 1664525\) \+ 1013904223/);
  assert.match(html, /const seedParam = url\.get\("seed"\);[\s\S]*?Number\.isSafeInteger\(parsedSeed\)/);
  assert.match(html, /if \(reduce\.matches\) segs\.forEach\(\(s, n\) =>[\s\S]*?n === curIdx \? "1" : "0"/);
  assert.match(html, /setAttribute\("aria-pressed", String\(active\)\)/);
  assert.match(html, /history\.replaceState/);
  assert.doesNotMatch(html, /class="field-note" aria-live=/);
  assert.match(html, /<span aria-live="polite">[\s\S]*?id="field-context"[\s\S]*?id="field-seed"[\s\S]*?<\/span>/);
  assert.match(html, /document\.addEventListener\("visibilitychange"/);
  assert.doesNotMatch(html, /const W = narrow \? 360 : 560/);
  assert.match(html, /requestIdleCallback\(heroField/);
  assert.doesNotMatch(html, /Math\.random\s*\(/);
  assert.match(html, /media="\(prefers-reduced-motion: reduce\)" srcset="assets\/trace-npm-demo-still\.webp"/);
  assert.match(css, /:where\(main\[id\], section\[id\]\) \{ scroll-margin-top: var\(--anchor-offset\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*?\.field-segments \{ flex: 1 1 100%;/);
});

test("the below-hero manuscript field is original, nonlinear, and motion-safe", () => {
  const notationFields = [...html.matchAll(/<div class="notation-field"[^>]*>/g)]
    .map((match) => match[0]);
  assert.equal(notationFields.length, 4);
  notationFields.forEach((field) => assert.match(field, /aria-hidden="true"/));
  assert.match(html, /const notationFragments = Object\.freeze/);
  assert.match(html, /kind: "equation"/);
  assert.match(html, /kind: "tensor"/);
  assert.match(html, /kind: "split"/);
  assert.match(html, /kind: "code"/);
  assert.match(html, /assert overlap === 0/);
  assert.doesNotMatch(html + css, /shutterstock|<video\b/i);
  assert.match(css, /\.notation-field[\s\S]*?pointer-events: none/);
  assert.match(css, /--notation-opacity: 0\.47/);
  assert.match(css, /\[data-theme="dark"\][\s\S]*?--notation-opacity: 0\.38/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.notation-field \{ inset-inline: -18%; opacity: calc\(var\(--notation-opacity\) \* 0\.78\); \}/);
  assert.match(css, /\.notation-field\s*\{[\s\S]*?color: var\(--notation-ink\)/);
  assert.match(html, /const KEYFRAME_COUNT = 25/);
  assert.match(html, /function makeDriftPath\(rand, depth, handedness\)/);
  assert.match(html, /Math\.cos\(t \+ phase\)[\s\S]*?Math\.sin\(2 \* t \+ twist\)[\s\S]*?Math\.cos\(3 \* t - twist\)/);
  assert.match(html, /transform: `translate3d\(\$\{dx\.toFixed\(2\)\}vw, \$\{dy\.toFixed\(2\)\}px, 0\) rotate\([\s\S]*?scale\(/);
  assert.match(html, /const duration = 24000 \+ rand\(\) \* 26000/);
  assert.match(html, /mark\.animate\(makeDriftPath\(rand, depth, handedness\), \{[\s\S]*?duration,[\s\S]*?delay: -rand\(\) \* duration/);
  assert.match(html, /iterations: Infinity/);
  assert.match(html, /fieldAnimations\.set\(field, animations\)/);
  assert.match(html, /animation\[running \? "play" : "pause"\]\(\)/);
  assert.doesNotMatch(css, /@keyframes notation-current-/);
  assert.match(css, /\.notation-mark[\s\S]*?will-change: transform, opacity/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.notation-field \{ display: none; \}/);
});

test("the practice section stays concise, personal and operational", () => {
  assert.equal((html.match(/class="principle"/g) || []).length, 3);
  assert.match(html, /A polished answer to the wrong question is still wrong/);
  assert.match(html, /Clever is useful; legible is better/);
  assert.match(html, /without its author in the room/);
  assert.doesNotMatch(html, /<details class="rules">|class="rule-no"|Seven rules|Operating standard/);
});

test("the page has one primary heading and no third-party analytics", () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(html, /googletagmanager|google-analytics|plausible\.io|segment\.com|posthog/i);
  assert.doesNotMatch(html, /<(?:img|script)\b[^>]*src="https?:/i);
  assert.doesNotMatch(html, /<link\b[^>]*rel="(?:stylesheet|preload|icon|apple-touch-icon)"[^>]*href="https?:/i);
  assert.doesNotMatch(html, /fetch\("https?:/i);
});
