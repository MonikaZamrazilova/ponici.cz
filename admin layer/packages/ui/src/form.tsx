"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Reusable form system (A4.1) — konzistentní primitiva pro všechny
 * admin formuláře. Validace je client-side zrcadlo serverových pravidel
 * (stejná funkce z @admin/core); server se nikdy nespoléhá jen na ni.
 */

export interface FormResult {
  tone: "ok" | "err";
  text: string;
}

export interface UseFormOptions<T> {
  initialValues: T;
  /** client validace — vrací chyby polí; prázdný objekt = ok */
  validate?: (values: T) => Record<string, string>;
  onSubmit: (values: T) => Promise<{
    ok: boolean;
    message?: string;
    fields?: Record<string, string>;
  }>;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FormResult | null>(null);

  // stabilní identita — umožňuje memoizaci řádků formuláře (A9.2)
  const setValue = useCallback((name: string, value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  function setValuesAll(next: T) {
    setValues(next);
  }

  function reset(next = initialValues) {
    setValues(next);
    setDirty(false);
    setErrors({});
    setResult(null);
  }

  function markClean() {
    setDirty(false);
    setErrors({});
  }

  async function submit(): Promise<boolean> {
    const fieldErrors = validate ? validate(values) : {};
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setResult({ tone: "err", text: "Opravte zvýrazněné chyby ve formuláři." });
      return false;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const response = await onSubmit(values);
      if (!response.ok) {
        setErrors(response.fields ?? {});
        setResult({ tone: "err", text: response.message ?? "Operace selhala" });
        return false;
      }
      setDirty(false);
      setResult({ tone: "ok", text: response.message ?? "Uloženo" });
      return true;
    } catch {
      setResult({ tone: "err", text: "Chyba komunikace se serverem" });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return {
    values,
    setValue,
    setValues: setValuesAll,
    errors,
    dirty,
    submitting,
    result,
    submit,
    reset,
    markClean,
    setResult,
  };
}

/**
 * Warning o neuložených změnách:
 * - beforeunload (zavření/reload záložky)
 * - klik na odkaz v rámci adminu (SPA navigace) → confirm
 */
export function useUnsavedGuard(
  active: boolean,
  message = "Máte neuložené změny. Opravdu chcete opustit stránku?"
) {
  useEffect(() => {
    if (!active) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = message;
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor?.href) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.hash || url.pathname === window.location.pathname) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, message]);
}
