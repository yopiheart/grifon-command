// Shared publish gates for every artifact builder under tools/artifacts/.
//
// WHY THIS FILE EXISTS
// --------------------
// Each artifact ships as TWO things from one source: the page published to
// claude.ai (wrapped in the platform's own <head>, so it must be a body
// FRAGMENT with no document tags) and the committed standalone twin at
// artifacts/<slug>.html, which Neil sends over Viber/email and someone
// double-clicks. The twin is the whole reason the file is committed.
//
// The twin has bitten us twice with the SAME bug, a year apart in repo time:
//
//   2026-07-30 — build-gabriel-review.mjs: every `·` in the Oceanides copy
//     rendered as `Â·` when the file was opened off disk. With no <meta charset>,
//     Chromium guesses windows-1252. That builder fixed it locally by emitting a
//     full document for the twin and a fragment for publishing.
//   2026-08-06 — build-grifon-session.mjs: every literal em-dash rendered as
//     `â€"`. Found by the 390x844 mobile gate. Identical root cause.
//
// The fix existed and did not travel. Three other twins (gb-001-brief,
// grifon-funnel-review, one-hook-twelve-worlds) were still shipping raw UTF-8
// with no charset — including `₱`, in a client-facing brief.
//
// So the rule lives HERE, in code every builder imports, instead of in prose
// nobody rereads. Per CLAUDE.md: prefer a verifier over a paragraph.
//
// THE APPROACH
// ------------
// asciiSafe() converts every non-ASCII character to a numeric HTML entity. That
// makes one single file correct in BOTH roles at once: pure-ASCII bytes decode
// identically under every encoding guess, so the twin needs no <meta charset>,
// and it stays a bare fragment, so it publishes without violating the Artifact
// tool's no-document-tags contract. One file, one path, nothing to remember.
//
// (build-gabriel-review.mjs solves it the other way — full document for the twin,
// separate fragment for publishing. That works too and is left alone; it just
// costs a second output and a discipline about which file to publish.)

/**
 * Entity-escape every non-ASCII character so the shipped bytes are pure ASCII.
 *
 * The <style> block is EXCLUDED and asserted ASCII instead: HTML entities are
 * not decoded inside CSS, so escaping there would corrupt the stylesheet rather
 * than protect it. Keep CSS comments ASCII (`--` not an em-dash).
 */
export function asciiSafe(html, { label = 'artifact' } = {}) {
  const style = html.match(/<style>[\s\S]*?<\/style>/);
  if (!style) {
    // No stylesheet to protect — escape the whole document.
    return escapeNonAscii(html);
  }
  if (hasNonAscii(style[0])) {
    const found = [...new Set([...style[0]].filter((c) => c.codePointAt(0) > 127))];
    fail(label, `<style> block contains non-ASCII (${found.join(' ')}) — entities do not decode in CSS, so make the stylesheet ASCII (use "--" in comments, not an em-dash)`);
  }
  const [before, after] = html.split(style[0]);
  return escapeNonAscii(before) + style[0] + escapeNonAscii(after);
}

/**
 * Assert a finished page is safe to write + publish. Throws a BUILD_FAILED
 * error rather than shipping something that looks almost right.
 *
 * @param {string} html    the finished page
 * @param {object} opts
 * @param {string} opts.label       builder name, for the error message
 * @param {string[]} [opts.required]  substrings that must be present (truncation guard)
 * @param {RegExp[]} [opts.leftover]  token patterns that must NOT survive substitution
 * @param {boolean} [opts.ascii=true] enforce pure-ASCII bytes (skip only if the
 *                                    page carries its own <meta charset>)
 * @param {Array<[string,RegExp]>} [opts.banned] extra per-artifact banned patterns
 */
export function assertArtifact(html, opts = {}) {
  const {
    label = 'artifact', required = [], leftover = [], ascii = true, banned = [],
  } = opts;

  const missing = required.filter((token) => !html.includes(token));
  if (missing.length) fail(label, `template missing ${missing.join(', ')}`);

  for (const re of leftover) {
    const hits = html.match(re);
    if (hits) fail(label, `unsubstituted tokens ${[...new Set(hits)].join(', ')}`);
  }

  // Banned everywhere: the Android WebView the Claude app renders artifacts in
  // mispaints clipped-gradient text — headings came out inverted and far darker
  // than either gradient stop on Neil's real phone, 2026-07-29.
  //
  // Tested against COMMENT-STRIPPED source. A naive substring scan cannot tell a
  // banned declaration from a comment explaining why it is banned, and every
  // template worth having explains itself — one-hook-twelve-worlds.tpl.html
  // documents the ban on line 83 and then sets `background-clip:border-box` to
  // undo it, which is exactly right and was still failing the gate. A checker
  // that punishes good comments teaches people to delete the comments.
  const code = stripComments(html);
  const allBanned = [['clipped-gradient text', /background-clip\s*:\s*text/i], ...banned];
  for (const [name, re] of allBanned) {
    if (re.test(code)) fail(label, `banned pattern present: ${name}`);
  }

  if (ascii && hasNonAscii(html)) {
    const found = [...new Set([...html].filter((c) => c.codePointAt(0) > 127))].slice(0, 12);
    fail(label, `non-ASCII bytes survived (${found.join(' ')}) — the bare-file twin will mojibake without a <meta charset>`);
  }
}

/** asciiSafe + assertArtifact in the order they must run. Returns the page to write. */
export function finalize(html, opts = {}) {
  const out = opts.ascii === false ? html : asciiSafe(html, opts);
  assertArtifact(out, opts);
  return out;
}

/** Drop HTML and CSS comments so pattern checks see code, never prose about code. */
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

const hasNonAscii = (s) => /[^\x00-\x7F]/.test(s); // eslint-disable-line no-control-regex
const escapeNonAscii = (s) =>
  s.replace(/[^\x00-\x7F]/g, (c) => `&#${c.codePointAt(0)};`); // eslint-disable-line no-control-regex

function fail(label, message) {
  const err = new Error(`BUILD_FAILED [${label}]: ${message}`);
  err.buildFailed = true;
  throw err;
}
