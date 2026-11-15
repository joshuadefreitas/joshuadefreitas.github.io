// Verifies the minimal scanner used by the static contracts.
import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML, textContent } from "./lib/html.mjs";

test("scanner handles comments, quoted and bare attributes", () => {
  const doc = parseHTML('<!-- <img> --><a HREF=/x data-x="a > b" disabled>go</a>');
  assert.equal(doc.comments.length, 1);
  assert.equal(doc.tags[0].name, "a");
  assert.equal(doc.tags[0].attrs.get("href"), "/x");
  assert.equal(doc.tags[0].attrs.get("data-x"), "a > b");
  assert.equal(doc.tags[0].attrs.get("disabled"), "");
});
test("scanner tolerates inline SVG", () => {
  const doc = parseHTML('<svg viewBox="0 0 1 1"><path d="M0,0 > 1"/></svg>');
  assert.deepEqual(doc.tags.map((tag) => tag.name), ["svg", "path", "svg"]);
  assert.equal(doc.tags[1].attrs.get("d"), "M0,0 > 1");
});
test("text extraction excludes markup and scripts", () => {
  assert.equal(textContent('<p>Hello <b>there</b></p><script>secret</script>'), "Hello there");
});
