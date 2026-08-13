"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getSite,
  listServices,
  listPrices,
  listFaqs,
  type FaqContent,
  type PriceContent,
  type ServiceContent,
  type SiteContent,
} from "@/lib/repository";
import { fetchRuntimeContent, type RuntimeContent } from "@/lib/runtimeContent";
import { getSession, saveItemPatch, type SessionInfo } from "@/lib/editApi";

/**
 * Admin mód na webu — session + runtime obsah + ukládání změn.
 * Přihlášený admin přepne "Admin mód"; pak kliká na fotky/texty/ceny
 * a upravuje je. Změny se ukládají a publikují do adminu (published.json).
 */

interface EditModeContextValue {
  /** session info (null = nepřihlášen) */
  session: SessionInfo | null;
  checked: boolean;
  /** admin mód zapnutý? */
  enabled: boolean;
  toggle: () => void;
  /** runtime obsah (publikované změny) — fallback je build-time obsah */
  site: SiteContent;
  services: ServiceContent[];
  prices: PriceContent[];
  faqs: FaqContent[];
  /** uloží a publikuje změnu pole položky; vrací chybu nebo null */
  saveField: (
    kind: string,
    id: string,
    patch: Record<string, unknown>,
    label: string,
  ) => Promise<string | null>;
}

const EditModeContext = createContext<EditModeContextValue | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [checked, setChecked] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeContent | null>(null);

  const refresh = useCallback(async () => {
    const next = await fetchRuntimeContent();
    if (next) setRuntime(next);
  }, []);

  useEffect(() => {
    getSession().then((s) => {
      // vstup z adminu: „Vstup do edit web" otevírá web s ?edit=1
      const wantsEdit =
        typeof window !== "undefined" && new URLSearchParams(window.location.search).has("edit");
      if (wantsEdit && !s?.canEdit) {
        // není přihlášen → pošli na login (po přihlášení se vrátí z adminu)
        window.location.href = "/login";
        return;
      }
      setSession(s);
      setChecked(true);
      if (s?.canEdit && wantsEdit) {
        setEnabled(true);
        void refresh();
      }
    });
  }, [refresh]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) void refresh();
      else setRuntime(null);
      return next;
    });
  }, [refresh]);

  const saveField = useCallback(
    async (
      kind: string,
      id: string,
      patch: Record<string, unknown>,
      label: string,
    ): Promise<string | null> => {
      const error = await saveItemPatch(kind, id, patch);
      if (error) return error;
      await refresh();
      return null;
    },
    [refresh],
  );

  const value = useMemo<EditModeContextValue>(
    () => ({
      session,
      checked,
      enabled,
      toggle,
      site: runtime?.site ?? getSite(),
      services: runtime?.services ?? listServices(),
      prices: runtime?.prices ?? listPrices(),
      faqs: runtime?.faqs ?? listFaqs(),
      saveField,
    }),
    [session, checked, enabled, toggle, runtime, saveField],
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode(): EditModeContextValue {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error("useEditMode musí běžet uvnitř EditModeProvider");
  return ctx;
}
