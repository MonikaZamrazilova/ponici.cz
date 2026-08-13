import { EmptyState } from "@admin/ui";

/** Stav "modul je vypnutý" — vykreslí stránka, když modul není v konfiguraci. */
export function ModuleDisabled({ module }: { module: string }) {
  return (
    <EmptyState
      title={`Modul „${module}“ je vypnutý`}
      hint="Zapnutí/vypnutí je konfigurační rozhodnutí: core moduly v env (ADMIN_MODULES), projektové v registry.ts (ProjectConfig.modules)."
    />
  );
}
