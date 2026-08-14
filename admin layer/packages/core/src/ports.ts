import type { AuditEvent } from "./audit";
import type { ContentItem } from "./item";
import type { ContentManifest } from "./manifest";

/**
 * Porty (rozhraní) data access vrstvy. Admin Layer definuje porty,
 * konkrétní implementace žijí v apps/admin/src/lib/storage.
 * Nahrazení JSON souborů databází = nová implementace portu, ne změna služeb.
 */

export interface OverrideStorePort {
  list(kind: string): Promise<Record<string, ContentItem>>;
  get(kind: string, id: string): Promise<ContentItem | null>;
  save(item: ContentItem, kind: string): Promise<void>;
  remove(kind: string, id: string): Promise<boolean>;
}

export interface AuditStorePort {
  append(event: AuditEvent): Promise<void>;
  list(limit?: number): Promise<AuditEvent[]>;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface MediaStorePort {
  list(): Promise<MediaAsset[]>;
  get(id: string): Promise<{ asset: MediaAsset; data: Uint8Array } | null>;
  save(file: { name: string; mime: string; data: Uint8Array }): Promise<MediaAsset>;
  remove(id: string): Promise<boolean>;
}

/** Jak Admin Layer získá kontrakt externí aplikace (dnes soubor, zítra HTTP). */
export interface ManifestSourcePort {
  load(): Promise<ContentManifest>;
}

/* ─────────────── sessions ─────────────── */

export interface SessionRecord {
  sid: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

/** Server-side session store — TTL + odvolání (logout) mají tady pravdu. */
export interface SessionStorePort {
  create(sid: string, ttlMs: number): Promise<void>;
  /** vrací null, pokud neexistuje, je odvolaná nebo vypršela (a smaže ji) */
  get(sid: string): Promise<SessionRecord | null>;
  revoke(sid: string): Promise<void>;
  /** odvolá všechny sessiony (např. po změně hesla) */
  revokeAll(): Promise<void>;
  /** smaže vypršené záznamy; vrací počet */
  cleanup(): Promise<number>;
}

/** Volitelné upozornění externí infrastruktuře po publishi (deploy). */
export interface DeployHookPort {
  notify(payload: {
    event: "publish";
    projectId: string;
    entityKind: string;
    entityId: string;
  }): Promise<void>;
}
