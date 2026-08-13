import { EmptyState } from "@admin/ui";

/** Stav "nemáte oprávnění" — vykreslují serverové stránky po canPermission=false. */
export function Forbidden() {
  return (
    <EmptyState
      title="Nemáte oprávnění"
      hint="Vaše role nemá oprávnění pro tuto stránku nebo operaci."
    />
  );
}
