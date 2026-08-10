# Joshua de Freitas | Personal site

The public portfolio of [Joshua de Freitas](https://github.com/joshuadefreitas), senior data engineer at EY in Madrid.

**Live site:** [joshuadefreitas.github.io](https://joshuadefreitas.github.io)

**LinkedIn:** [linkedin.com/in/defreitasjoshua](https://www.linkedin.com/in/defreitasjoshua/)

I work across dependable data products, intelligent software, analytical research, simulation, and visual computing. This site is the front door to that work: a small, dependency-free GitHub Pages project with the code and decisions kept intentionally visible.

## Design contract

The site should feel editorial rather than fashionable: restrained typography, a neutral scale, generous measure, and motion that reveals mechanism rather than decorating empty space.

Project visuals follow one durable rule: **depict the project's actual mechanism or evidence**. The DeepLOB plate therefore shows overlapping windows crossing a random train/validation boundary and the clean gap created by purging and embargoing. It does not use a generic market chart. A visual may simplify, but it must not imply a result the project does not establish.

Every project card states its limit in the card itself. Those boundaries are part of the artifact because cards are read away from the repositories that provide their full context.

## Visual system

One neutral scale, no hue — a cool silver-grey running from paper to ink, with a silver sheen gradient reserved for hairlines and the primary control. Light is the source of truth; dark is a remap of the same custom properties rather than a second design, so almost every rule in `styles.css` is theme-agnostic.

Theme resolves before first paint from a stored preference, falling back to `prefers-color-scheme`. Until a preference is stored, the OS keeps control — including if it changes while the page is open.

The local fonts use `font-display: optional`: the editorial faces appear when they are immediately available, while a cold or constrained connection keeps a stable system fallback instead of introducing a late reflow. Newsreader is stored as three small, fixed instances — display light, text light, and text regular — rather than shipping both of its variable axes to every visitor.

The hero's ground runs four deterministic simulations in rotation — Gray–Scott reaction-diffusion, a neural field, coupled wave interference, and particle advection through a flow field — seeded from the UTC date, so every visitor sees the same run on the same day. Each paints a single intensity channel; the theme decides whether that intensity composites as ink on white (`multiply`) or light on black (`screen`). One field, two themes, one code path. The segments in the readout show which field is running and how far through its dwell it is, and jump straight to another. A generated seed is written to the URL, so replayability survives a refresh and the run can be shared.

Three things are deliberately decoupled, which is what makes the detail affordable:

- **simulation from display** — the field is computed on an aspect-adaptive grid capped at roughly 196,000 cells on larger screens and 112,000 on narrow screens, then scaled by the GPU onto a canvas sized to the element's own device pixels;
- **simulation from frame rate** — each field advances on its own interval rather than once per animation frame;
- **crossfade from pixels** — the fade is two `drawImage` calls with an alpha, not a per-byte interpolation of the buffer.

The document and fonts paint before the live field is initialised. Warm-up is then spread across frames under a 6ms desktop / 4ms narrow-screen budget rather than run in one go. The animation loop stops when the hero is outside the viewport or the document is hidden, and reduced-motion users receive a settled still rather than rotation.

The four sections below it carry an original technical murmuration: equations, tensor shapes, purged-split notation, SQL, Python, and TypeScript fragments drawn from a fixed local vocabulary. Every fragment follows its own deterministic 25-keyframe harmonic path, with independent phase, duration, scale, and opacity creating a restrained sense of curved flight and depth. Only the visible section runs. The field is decorative, hidden from assistive technology, absent in print, and removed entirely when reduced motion is requested. No stock footage or external media is involved.

Each section retains its quieter ground underneath that current — a grid, a drifting sheen, contour bands, or a soft light — so the manuscript feels embedded in the paper rather than laid over it.

## Selected work

| Repository | What it shows |
| --- | --- |
| [`dbx-core`](https://github.com/joshuadefreitas/dbx-core) | Notebook-free Databricks engineering built around real Python packages, local development, and remote execution. |
| [`deep-lob`](https://github.com/joshuadefreitas/deep-lob) | A negative-control study showing how overlapping-window evaluation can manufacture predictability from null data. |
| [`trace-npm`](https://github.com/joshuadefreitas/trace-npm) | Install-script forensics that reports observed files, processes, and network activity together with visibility limits. |

The site also links to the [full public repository list](https://github.com/joshuadefreitas?tab=repositories). Archived and historical projects are kept separate from the current portfolio.

## Project structure

- `index.html` — content, metadata, interactions, and the deterministic field
- `styles.css` — design tokens, both themes, responsive layout, and project plates
- `assets/hero-field-study-{600,800}.webp` / `hero-field-study.webp` / `trace-npm-demo*.webp` — responsive, local project media; reduced-motion visitors receive a still trace frame
- `assets/social-card.svg` / `.jpg` — editable source and rendered social preview
- `assets/fonts/` — self-hosted OFL fonts and their licence texts
- `tests/site-contract.test.mjs` — dependency-free checks for the site's central contracts
- `.github/workflows/site-contract.yml` — runs those contracts on every push and pull request

## Local preview

This is a static site with no build step or package installation required:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Checks

Requires Node.js 22 or newer. No package installation is needed.

| Command | Purpose |
| --- | --- |
| `npm test` | Compile inline scripts and check navigation, metadata, local assets, theme contrast, accessibility state, claim boundaries, asset budgets, employment framing, and the DeepLOB study link. |
| `npm run check` | Alias for the full dependency-free check. |

The same suite runs in GitHub Actions on every push and pull request. These checks enforce structural and evidence contracts. Theme quality, responsive composition, focus behavior, motion, and console output still require browser verification before publication.

## Content policy

The site identifies EY as the current employer, but every linked project is personal, publicly released work and the page is not a solicitation for employment or consulting. It does not publish employer, client, or confidential project details. Fonts and imagery are self-hosted; the page contains no analytics or tracking scripts.
