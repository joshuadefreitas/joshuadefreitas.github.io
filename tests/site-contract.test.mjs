// Hand-authored structural contracts. This suite contains no generated fixtures.
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const html = readFileSync(path.join(root, "index.html"), "utf8");
const css = readFileSync(path.join(root, "styles.css"), "utf8");

function localPath(relativePath) {
  return path.join(root, relativePath.replace(/[?#].*$/, ""));
}

test("inline scripts are syntactically valid", () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 3, "expected theme, field, and site scripts");
  scripts.forEach((match, index) => {
    assert.doesNotThrow(() => new Function(match[1]), `inline script ${index + 1} must compile`);
  });
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

test("every project card carries its own claim boundary", () => {
  const cards = [...html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)].map((match) => match[1]);
  assert.equal(cards.length, 4, "selected work should remain a deliberate four-project set");
  cards.forEach((card, index) => {
    assert.match(card, /class="card-limit"/, `card ${index + 1} is missing an in-artifact limit`);
  });
});

test("DeepLOB foregrounds the active leakage study rather than legacy results", () => {
  assert.match(html, /Random split[\s\S]*overlap 1\.00/);
  assert.match(html, /Purged \+ embargoed[\s\S]*overlap 0\.00/);
  assert.match(html, /when-overlapping-windows-invent-predictability\.md/);
  assert.doesNotMatch(html, /deeplob_paper\.pdf/);
  assert.match(html, /Does not establish<\/span> tradability, model performance on real exchange data, or validated alpha/);
});

test("the deterministic field exposes reproducible and accessible state", () => {
  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) || []).length, 4);
  assert.doesNotMatch(html, /function orderBook\(|Show the order book|synthetic order book  → DeepLOB/);
  assert.match(html, /function waveField\(\)/);
  assert.match(html, /function flowField\(\)/);
  assert.match(html, /const builders = \[grayScott, neuralField, waveField, flowField\]/);
  assert.match(html, /const flowX = new Float32Array\(N\), flowY = new Float32Array\(N\)/);
  assert.match(html, /const fieldAspect = Math\.min\(2\.4, Math\.max\(0\.42,/);
  assert.match(html, /const cellBudget = narrow \? 112000 : 196000/);
  assert.match(html, /function deposit\(qx, qy, amount\)[\s\S]*?const px = Math\.floor\(qx\), py = Math\.floor\(qy\);[\s\S]*?const fx = qx - px, fy = qy - py/);
  assert.match(html, /const samples = Math\.max\(1, Math\.ceil\(Math\.max\(Math\.abs\(dx\), Math\.abs\(dy\)\)\)\)/);
  assert.match(html, /trail\[row \+ x2L\] \+ 4 \* trail\[row \+ xL\] \+ 6 \* trail\[row \+ x\][\s\S]*?\+ 4 \* trail\[row \+ xR\] \+ trail\[row \+ x2R\]/);
  assert.match(html, /flowX\[y2U \+ x\] \+ 4 \* flowX\[yU \+ x\] \+ 6 \* flowX\[i\][\s\S]*?\+ 4 \* flowX\[yD \+ x\] \+ flowX\[y2D \+ x\]/);
  assert.match(html, /const v = 1 - Math\.exp\(-flowY\[i\] \* 1\.65\)/);
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
  assert.match(css, /--notation-opacity: 0\.42/);
  assert.match(css, /\[data-theme="dark"\][\s\S]*?--notation-opacity: 0\.38/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.notation-field \{ inset-inline: -18%; opacity: 0\.30; \}/);
  assert.match(css, /\.notation-field[\s\S]*?color: var\(--ink-2\)/);
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

test("the operating standard remains complete but does not dominate the default page", () => {
  assert.match(html, /<details class="rules">/);
  const ruleNumbers = [...html.matchAll(/class="rule-no">(\d{2})</g)].map((match) => match[1]);
  assert.deepEqual(ruleNumbers, ["01", "02", "03", "04", "05", "06", "07"]);
});

test("the page has one primary heading and no third-party analytics", () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(html, /googletagmanager|google-analytics|plausible\.io|segment\.com|posthog/i);
  assert.doesNotMatch(html, /<(?:img|script)\b[^>]*src="https?:/i);
  assert.doesNotMatch(html, /<link\b[^>]*rel="(?:stylesheet|preload|icon|apple-touch-icon)"[^>]*href="https?:/i);
  assert.doesNotMatch(html, /fetch\("https?:/i);
});
