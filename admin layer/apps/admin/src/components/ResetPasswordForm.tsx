"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Input, useForm, tokens } from "@admin/ui";

export function ResetPasswordForm({
  email,
  devCode,
}: {
  email: string;
  devCode?: string;
}) {
  const router = useRouter();

  const form = useForm<{ code: string; password: string; confirm: string }>({
    initialValues: { code: devCode ?? "", password: "", confirm: "" },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!/^\d{6}$/.test(values.code.trim())) {
        errors.code = "Zadejte 6místný kód";
      }
      if (values.password.length < 8) {
        errors.password = "Heslo musí mít alespoň 8 znaků";
      }
      if (values.confirm !== values.password) {
        errors.confirm = "Hesla se neshodují";
      }
      return errors;
    },
    onSubmit: async ({ code, password }) => {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: code.trim(), newPassword: password }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message: string } };
      if (!json.ok) {
        return { ok: false, message: json.error?.message ?? "Obnova se nezdařila" };
      }
      router.push("/login?reset=1");
      router.refresh();
      return { ok: true };
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
      <Field label="Ověřovací kód" error={form.errors["code"]} htmlFor="reset-code">
        <Input
          id="reset-code"
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
      <Field label="Nové heslo" error={form.errors["password"]} htmlFor="reset-password">
        <Input
          id="reset-password"
          type="password"
          value={form.values.password}
          onChange={(e) => form.setValue("password", e.target.value)}
          placeholder="Minimálně 8 znaků"
          autoComplete="new-password"
          disabled={form.submitting}
        />
      </Field>
      <Field label="Potvrzení hesla" error={form.errors["confirm"]} htmlFor="reset-confirm">
        <Input
          id="reset-confirm"
          type="password"
          value={form.values.confirm}
          onChange={(e) => form.setValue("confirm", e.target.value)}
          placeholder="Ještě jednou"
          autoComplete="new-password"
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
      </div>
      <Button type="submit" disabled={form.submitting}>
        {form.submitting ? "Ukládám…" : "Nastavit nové heslo"}
      </Button>
    </form>
  );
}
