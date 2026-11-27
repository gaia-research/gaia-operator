/**
 * Task constraints arrive from YAML/JSON/queue frontmatter, so a request for a
 * prohibited capability may be spelled `true`, `"true"`, `"yes"` or `1`.
 * Treat every value as a request unless it is an explicit negative; an
 * unusual spelling must not slip past the policy gate (fail closed).
 */
const EXPLICIT_NEGATIVES = new Set(["false", "no", "off", "0", "none", "never", "disabled", ""]);

export function isConstraintRequested(value: unknown): boolean {
  if (value === undefined || value === null || value === false || value === 0) {
    return false;
  }
  if (typeof value === "string") {
    return !EXPLICIT_NEGATIVES.has(value.trim().toLowerCase());
  }
  return true;
}
