"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Input, useForm, tokens } from "@admin/ui";

export function VerifyResetCodeForm({ email, devCode }: { email: string; devCode?: string }) {
  const router = useRouter();

  const form = useForm<{ code: string }>({
    initialValues: { code: devCode ?? "" },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!/^\d{6}$/.test(values.code.trim())) {
        errors.code = "Zadejte 6místný kód";
      }
      return errors;
    },
    onSubmit: async ({ code }) => {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message: string } };
      if (!json.ok) {
        return { ok: false, message: json.error?.message ?? "Ověření se nezdařilo" };
      }
      router.push(`/login/reset?email=${encodeURIComponent(email)}`);
      router.refresh();
      return { ok: true, message: "Kód ověřen" };
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <Field label="Ověřovací kód" error={form.errors["code"]} htmlFor="verify-code">
        <Input
          id="verify-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={form.values.code}
          onChange={(e) => form.setValue("code", e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          autoFocus
          autoComplete="one-time-code"
          disabled={form.submitting}
          style={{ letterSpacing: "0.15em", fontVariantNumeric: "tabular-nums" }}
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
      </div>
      <Button type="submit" disabled={form.submitting || !/^\d{6}$/.test(form.values.code.trim())}>
        {form.submitting ? "Ověřuji…" : "Ověřit kód"}
      </Button>
    </form>
  );
}
