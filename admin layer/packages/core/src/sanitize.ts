import sanitizeHtml from "sanitize-html";

/**
 * Sanitizace rich textu (A9.1 security audit).
 *
 * Rich text se ukládá jako HTML a editor ho vkládá přes innerHTML —
 * proto se sanitizuje SERVEROVĚ při každém save/publish (allowlist tagů
 * a atributů, žádné skripty, iframy, javascript: URL, event handlery).
 * Klient nikdy nedůvěřuje nezpracovanému HTML.
 */

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "span",
  "blockquote",
  "h2",
  "h3",
  "pre",
  "code",
  "hr",
];

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}
