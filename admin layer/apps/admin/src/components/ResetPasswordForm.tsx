"use client";

import { useRouter } from "next/navigation";
import { Button, Field, Input, useForm, tokens } from "@admin/ui";

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();

  const form = useForm<{ password: string; confirm: string }>({
    initialValues: { password: "", confirm: "" },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (values.password.length < 12) {
        errors.password = "Heslo musí mít alespoň 12 znaků";
      }
      if (!/[A-Z]/.test(values.password)) {
        errors.password = "Heslo musí obsahovat velké písmeno";
      }
      if (!/[a-z]/.test(values.password)) {
        errors.password = "Heslo musí obsahovat malé písmeno";
      }
      if (!/\d/.test(values.password)) {
        errors.password = "Heslo musí obsahovat číslici";
      }
      if (values.confirm !== values.password) {
        errors.confirm = "Hesla se neshodují";
      }
      return errors;
    },
    onSubmit: async ({ password }) => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
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
      <Field label="Nové heslo" error={form.errors["password"]} htmlFor="reset-password">
        <Input
          id="reset-password"
          type="password"
          value={form.values.password}
          onChange={(e) => form.setValue("password", e.target.value)}
          placeholder="Minimálně 12 znaků (velké, malé písmeno, číslice)"
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
