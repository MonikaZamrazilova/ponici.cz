"use client";

import { useRouter } from "next/navigation";
import { Button, Field, useForm, tokens } from "@admin/ui";
import { PasswordInput } from "./PasswordInput";

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();

  const form = useForm<{ password: string }>({
    initialValues: { password: "" },
    validate: (values) =>
      (values.password ? {} : { password: "Zadejte heslo" }) as Record<string, string>,
    onSubmit: async ({ password }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message: string } };
      if (!json.ok) {
        return { ok: false, message: json.error?.message ?? "Přihlášení selhalo" };
      }
      router.push("/admin/dashboard");
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
      <Field label="Heslo" error={form.errors["password"]} htmlFor="login-password">
        <PasswordInput
          id="login-password"
          value={form.values.password}
          onChange={(e) => form.setValue("password", e.target.value)}
          placeholder="Heslo"
          autoFocus
          autoComplete="current-password"
          disabled={disabled || form.submitting}
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
      <Button type="submit" disabled={disabled || form.submitting || !form.values.password}>
        {form.submitting ? "Přihlašuji…" : "Přihlásit se"}
      </Button>
    </form>
  );
}
