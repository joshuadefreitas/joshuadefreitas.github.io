# joshuadefreitas.github.io

A small static site: plain HTML, one stylesheet, a few small scripts, self-hosted fonts. No framework, no runtime dependencies.

```
src/pages/       page bodies, each starting with a <!--meta {...}--> header (path, title, description)
src/partials/    head, masthead, footer, and two inline figures
scripts/build.mjs  builds src/ into the pages at the repo root (npm run build); --check verifies they are current
assets/          css, js, fonts (Newsreader, Inter, DM Mono: SIL OFL, see assets/fonts), images
scripts/browser/   real-browser checks over the DevTools protocol (npm run qa, needs Chromium)
tests/           static checks (npm test)
```

Preview: `npm run serve`, then open http://127.0.0.1:8750/ (absolute URLs mean it needs to be served from the root, not opened as a file).

The contact address is configured locally, not in source: put `{"email": "…"}` in `src/site.local.json` (git-ignored) or set `SITE_EMAIL`, then `npm run build`. Without it the Email link is a visible placeholder, and `npm run release:check` (also run on every pull request to `main`) fails until it is set. The address appears only in the built pages' `mailto:` links.

`scripts/arcs.py` redraws the Engineering Workbench arc figure from a model produced by that tool (`src/partials/arcs.html` is its checked-in output).
