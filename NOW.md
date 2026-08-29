# NOW

## State

Active published portfolio surface. `LAT-92` — realign the two laboratory
descriptions with their live identities — is **complete and accepted**, and is
`Done` in Linear. It is committed locally and **not pushed**. The published
mirror still serves the pre-realignment copy; publication was never authorized
by that unit and is not authorized here.

**Last reconciled:** 2026-08-29 (estate reconciliation) against live Git state,
a live `ls-remote` of the public origin, and Linear `LAT-92`.

## Current bounded unit

None. `LAT-92` closed on 2026-08-24; this file went on declaring it active for
five days and Cairn surfaced it as this repository's live unit throughout.
Pushing the accepted commits and any publication decision are separate steps,
not a continuation of that unit.

## Last accepted evidence

- Canonical lab sentences, hero framing, README rows and both lab links are
  enforced by the dependency-free site contract.
- Retired lab copy, candidate/Foundation wording and the non-canonical Lathilda
  URL are rejected.
- Grok's clean-head closure returned `ACCEPT` with no findings over the sealed
  state; the seal record is
  `docs/reviews/line/2026-08-24T050837Z-portfolio-lab-realignment-final-seal-964b2ea-grok.md`.
- Browser verification at 1440x1000 and 390x844 was performed on 2026-08-24.
- 19/19 site contract tests pass at the current head `f01ade1` (re-run
  2026-08-29).

## Next gate

Obtain independent review of the source change. Publication remains a separate
Joshua decision after review and browser evidence.

## Git and publication state

- Branch `main` is at `f01ade1`, **three commits ahead of `origin/main` and
  zero behind**. Verified live: `git ls-remote` reports `origin/main` at
  `cee653e7`, matching the local tracking ref. This repository is public, so
  the remote comparison is direct evidence, not a tracking-ref inference.
- The three commits were **rebased onto `origin/main` on 2026-08-29**, so their
  hashes changed: `d1c3156`/`964b2ea`/`523884f` became
  `2375eb5`/`73b72dd`/`f01ade1`. The accepted line-review and seal records
  committed here still name the pre-rebase hashes. They were not rewritten;
  the old commits remain reachable in this clone.
- The rebase changed content in exactly one way: `AGENTS.md`, `CLAUDE.md` and
  `GEMINI.md` are deleted, per workspace ADR-0011. `git diff 523884f f01ade1`
  is those three deletions and nothing else, so every byte of the accepted
  realignment survived unchanged. The three files remain on disk and are
  excluded through `.git/info/exclude`.
- **Not pushed.** The 2026-08-29 estate reconciliation held no Git credentials
  for GitHub and could not push. Nothing blocks the push on evidence: the work
  is accepted, green and correctly represented.
- Publication of the mirror remains a separate Joshua decision and is not
  authorized here.

## Do not start

No general redesign, analytics, CMS, framework migration or automatic exposure
of private programme work without a specific problem and publication decision.

## Handoff checklist

Read `AGENTS.md`, `README.md`, the site-contract tests and the relevant Linear
issue. Run the dependency-free checks and perform browser verification for any
visual or interaction change.

## Blind spots

The publication mirror is outside this unit. Lab descriptions are compressed
pointers to the two programme READMEs; they do not restate either full research
programme or claim a selected Lathilda flagship or earned Ghalvera Foundation
threshold.
