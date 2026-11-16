#!/usr/bin/env node
/* Release gate: fails while any built page still carries the placeholder contact address.
   Run in CI on pull requests to main, so an unconfigured Email link cannot be merged by accident. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); if (/node_modules|\.git$|\/out$|\/src$|\/scripts$|\/tests$/.test(p)) return []; return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
const bad = walk(root).filter((f) => /mailto:set-SITE_EMAIL@invalid/.test(readFileSync(f, 'utf8')));
if (bad.length) { console.error(`release gate FAILED: the Email link is still a placeholder in ${bad.length} page(s). Configure src/site.local.json (see README), rebuild, and commit the pages.`); process.exit(1); }
console.log('release gate OK: no placeholder contact address in built pages');
