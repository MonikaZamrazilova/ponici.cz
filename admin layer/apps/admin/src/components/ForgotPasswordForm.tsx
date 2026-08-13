"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, useForm, tokens } from "@admin/ui";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [devCode, setDevCode] = useState<string | null>(null);

  const form = useForm<{ email: string }>({
    initialValues: { email: "" },
    validate: (values) => {
      const email = values.email.trim();
      if (!email) return { email: "Zadejte e-mail" } as Record<string, string>;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { email: "Neplatný formát e-mailu" } as Record<string, string>;
      }
      return {};
    },
    onSubmit: async ({ email }) => {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { devCode?: string };
        error?: { message: string };
      };
      if (!json.ok) {
        return { ok: false, message: json.error?.message ?? "Odeslání se nezdařilo" };
      }
      if (json.data?.devCode) {
        setDevCode(json.data.devCode);
        return {
          ok: true,
          message: "MOCK režim — kód se neodeslal e-mailem, je zobrazen níže.",
        };
      }
      router.push(`/login/reset?email=${encodeURIComponent(email.trim())}`);
      router.refresh();
      return { ok: true, message: "Kód byl odeslán na zadaný e-mail." };
    },
  });

  const goToReset = () => {
    const email = encodeURIComponent(form.values.email.trim());
    const code = devCode ? `&devCode=${devCode}` : "";
    router.push(`/login/reset?email=${email}${code}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <Field label="E-mail" error={form.errors["email"]} htmlFor="forgot-email">
        <Input
          id="forgot-email"
          type="email"
          value={form.values.email}
          onChange={(e) => form.setValue("email", e.target.value)}
          placeholder="vas@email.cz"
          autoFocus
          autoComplete="email"
          disabled={form.submitting}
        />
      </Field>
      <div aria-live="polite">
        {form.result && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: form.result.tone === "ok" ? tokens.colors.success : tokens.colors.danger,
            }}
          >
            {form.result.text}
          </span>
        )}
        {devCode && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              background: tokens.colors.warningSoft,
              color: tokens.colors.warning,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            Kód: {devCode}
          </div>
        )}
      </div>
      {devCode ? (
        <Button type="button" onClick={goToReset}>
          Pokračovat k zadání kódu
        </Button>
      ) : (
        <Button type="submit" disabled={form.submitting || !form.values.email}>
          {form.submitting ? "Odesílám…" : "Odeslat kód"}
        </Button>
      )}
    </form>
  );
}
