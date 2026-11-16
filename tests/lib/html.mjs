// A deliberately small, dependency-free HTML tokeniser for static site checks.
// It understands comments, quoted/unquoted attributes and leaves SVG intact.
export function parseHTML(source) {
  const tags = [];
  const comments = [];
  let cursor = 0;
  while (cursor < source.length) {
    const comment = source.indexOf("<!--", cursor);
    const open = source.indexOf("<", cursor);
    if (comment !== -1 && comment === open) {
      const end = source.indexOf("-->", comment + 4);
      comments.push(source.slice(comment, end < 0 ? source.length : end + 3));
      cursor = end < 0 ? source.length : end + 3;
      continue;
    }
    if (open < 0) break;
    let end = open + 1, quote = "";
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) { if (char === quote) quote = ""; }
      else if (char === "\"" || char === "'") quote = char;
      else if (char === ">") break;
    }
    if (end >= source.length) break;
    const raw = source.slice(open, end + 1);
    const match = raw.match(/^<\s*(\/)?\s*([\w:-]+)/);
    if (match && !raw.startsWith("<!") && !raw.startsWith("<?")) {
      tags.push({ name: match[2].toLowerCase(), closing: Boolean(match[1]), raw, attrs: attributes(raw) });
    }
    cursor = end + 1;
  }
  return { tags, comments };
}

export function attributes(raw) {
  const attrs = new Map();
  const body = raw.replace(/^<\s*\/?\s*[\w:-]+|\/?>$/g, "");
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = re.exec(body))) attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  return attrs;
}

export function textContent(source) {
  return source.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "").replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&(?:amp|lt|gt|quot|#39);/gi, " ").replace(/\s+/g, " ").trim();
}
