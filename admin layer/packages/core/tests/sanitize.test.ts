import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "../src/sanitize";

describe("sanitizace rich textu (A9.1)", () => {
  it("odstraní script, event handlery, iframe a javascript: URL", () => {
    const out = sanitizeRichText(
      `<p>Text</p><script>alert(1)</script><img src=x onerror=alert(2)><iframe src=x></iframe><a href="javascript:alert(3)">link</a>`,
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("javascript:");
    expect(out).toContain("<p>Text</p>");
    expect(out).toContain("link");
  });

  it("zachová povolené formátování", () => {
    const out = sanitizeRichText(
      `<p><strong>Tučný</strong> a <a href="https://example.com">odkaz</a></p>`,
    );
    expect(out).toBe(`<p><strong>Tučný</strong> a <a href="https://example.com">odkaz</a></p>`);
  });

  it("odstraní neznámé atributy (style, class)", () => {
    const out = sanitizeRichText(`<p style="position:fixed">x</p><span class="evil">y</span>`);
    expect(out).not.toContain("style=");
    expect(out).not.toContain("class=");
  });
});
