"use client";

import { Button, Card, Field, Textarea, tokens, useForm } from "@admin/ui";

/**
 * Editor obnovovacích e-mailů (password recovery recipients).
 * Jen role s settings:write — enforcement je na API (server-side).
 *
 * E-maily se zadávají po jednom na řádek; změna se commitne do GitHubu
 * přes GitHub Contents API a zapíše se audit (actor, old, new).
 */
export function RecoveryEmailsForm({ initialEmails }: { initialEmails: string[] }) {
  const form = useForm<{ emails: string }>({
    initialValues: { emails: initialEmails.join("\n") },
    validate: (values) => {
      const lines = values.emails
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        return { emails: "Vyžadován alespoň jeden e-mail" } as Record<string, string>;
      }
      const invalid = lines.filter((line) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line));
      if (invalid.length > 0) {
        return {
          emails: `Neplatný formát: ${invalid.join(", ")}`,
        } as Record<string, string>;
      }
      return {};
    },
    onSubmit: async ({ emails }) => {
      const list = emails
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const res = await fetch("/api/settings/recovery-emails", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails: list }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { emails: string[] };
        error?: { message: string };
      };
      if (!json.ok) {
        return { ok: false, message: json.error?.message ?? "Uložení se nezdařilo" };
      }
      form.reset({ emails: (json.data?.emails ?? list).join("\n") });
      return { ok: true, message: "Obnovovací e-maily uloženy." };
    },
  });

  return (
    <Card padded={false}>
      <form
        style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          form.submit();
        }}
      >
        <Field
          label="E-maily pro obnovu hesla"
          error={form.errors.emails}
          htmlFor="recovery-emails"
        >
          <Textarea
            id="recovery-emails"
            value={form.values.emails}
            onChange={(e) => form.setValue("emails", e.target.value)}
            rows={4}
            style={{ fontFamily: tokens.font.mono, fontSize: 13 }}
            placeholder={"monika.zamrazilova@seznam.cz\ndalsi@email.cz"}
          />
        </Field>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="submit" disabled={form.submitting || !form.dirty}>
            {form.submitting ? "Ukládám…" : "Uložit"}
          </Button>
          <span style={{ fontSize: 12, color: tokens.colors.muted }}>
            Prázdný seznam není povolen — fallback je monika.zamrazilova@seznam.cz
          </span>
        </div>
        {form.result && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: form.result.tone === "err" ? tokens.colors.danger : tokens.colors.success,
            }}
          >
            {form.result.text}
          </div>
        )}
      </form>
    </Card>
  );
}
