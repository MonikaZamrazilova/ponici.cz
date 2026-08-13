/**
 * Edit API — ukládání inline změn z webu do adminu (single-origin).
 * Každá změna: načtení aktuálního itemu → merge → save draft → publish.
 * Vlastníka vidí okamžitě (runtime obsah); návštěvníci po přestavbě webu.
 */

const PROJECT_ID = "ponici";

export interface SessionInfo {
  role: string;
  canEdit: boolean;
}

export async function getSession(): Promise<SessionInfo | null> {
  try {
    const res = await fetch("/api/auth/session", { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok: boolean;
      data?: { role?: string; permissions?: string[] };
    };
    if (!json.ok || !json.data?.role) return null;
    const permissions = json.data.permissions ?? [];
    return {
      role: json.data.role,
      canEdit: permissions.some((p) => p.startsWith("content:")),
    };
  } catch {
    return null;
  }
}

interface ContentResponse {
  ok: boolean;
  data?: { kinds?: Record<string, Array<Record<string, unknown>>> };
}

async function fetchItem(kind: string, id: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`/api/projects/${PROJECT_ID}/content`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ContentResponse;
  if (!json.ok || !json.data?.kinds) return null;
  const items = json.data.kinds[kind] ?? [];
  return items.find((item) => item["id"] === id) ?? null;
}

/** Uloží a publikuje změnu pole položky. Vrací chybovou hlášku nebo null. */
export async function saveItemPatch(
  kind: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<string | null> {
  const current = await fetchItem(kind, id);
  if (!current) return "Položka se nepodařila načíst";

  const data = { ...current, ...patch };
  const saveRes = await fetch(`/api/projects/${PROJECT_ID}/items/${kind}/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "save", data }),
  });
  const saveJson = (await saveRes.json()) as { ok: boolean; error?: { message?: string } };
  if (!saveJson.ok) {
    return saveJson.error?.message ?? "Uložení se nezdařilo";
  }

  const pubRes = await fetch(`/api/projects/${PROJECT_ID}/items/${kind}/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "publish" }),
  });
  const pubJson = (await pubRes.json()) as { ok: boolean; error?: { message?: string } };
  if (!pubJson.ok) {
    return pubJson.error?.message ?? "Publikace se nezdařila";
  }
  return null;
}

/** Nahraje obrázek do media knihovny adminu a vrátí jeho URL. */
export async function uploadImage(file: File): Promise<string | null> {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch(`/api/projects/${PROJECT_ID}/media`, {
    method: "POST",
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { ok: boolean; data?: { id?: string } };
  if (!json.ok || !json.data?.id) return null;
  return `/api/projects/${PROJECT_ID}/media/${json.data.id}`;
}
