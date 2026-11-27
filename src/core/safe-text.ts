import { PrivacyChecker } from "../policies/privacy.js";

/**
 * Artifacts mix operator-authored text with untrusted platform content (thread
 * titles, page titles, community names, excerpts). These helpers redact each
 * untrusted field on its own, then keep it from forging structure in the
 * review documents a human acts on. Redacting per field (not the assembled
 * document) stops line- or block-spanning patterns from eating neighbouring
 * cells, approval lines or checklists.
 */

// Collapse to one line so content cannot inject headings, checkboxes such as
// "- [x] Approve as-is", or extra list items into approval/draft cards.
// "<" is escaped so content cannot open an HTML comment or tag that hides the
// rest of a rendered card; "[" and "]" so it cannot form links or remote
// images ("![x](https://...)") that load when a reviewer previews the card.
// Backslashes are escaped first, so pre-escaped input ("\\[") cannot turn
// the added escape into a literal backslash followed by a live bracket.
function escapeHtml(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/</g, "&lt;").replace(/([\[\]])/g, "\\$1");
}

export function inlineText(value: string | undefined): string {
  return escapeHtml(PrivacyChecker.filterSensitiveData(value ?? ""))
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Fence text with more backticks than any run it contains, so it cannot close
// the fence early and continue as live markdown.
export function fencedText(value: string | undefined, info = "text"): string {
  const text = PrivacyChecker.filterSensitiveData(value ?? "");
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${info}\n${text}\n${fence}`;
}

// Prefix every line, so multi-line content stays inside the blockquote.
export function quotedBlock(value: string | undefined): string {
  return escapeHtml(PrivacyChecker.filterSensitiveData(value ?? ""))
    .split(/\r\n|\r|\n|\u2028|\u2029/)
    // Escape block markers, and setext underlines (=== / ---) that would turn
    // the previous line into a heading.
    .map((line) => `> ${line
      // Any leading block-marker character is escaped: headings, quotes,
      // bullets (incl. empty ones), thematic breaks and setext underlines.
      .replace(/^(\s*)([#>*_+=-])/, "$1\\$2")
      .replace(/^(\s*\d+)([.)])(\s|$)/, "$1\\$2$3")}`)
    .join("\n");
}

// Neutralise spreadsheet formula injection (=, +, -, @, tab, CR) before CSV
// quoting, per OWASP CSV-injection guidance.
export function csvCell(value: string | undefined): string {
  let text = PrivacyChecker.filterSensitiveData(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}
