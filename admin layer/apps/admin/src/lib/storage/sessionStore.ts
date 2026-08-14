import type { SessionRecord, SessionStorePort } from "@admin/core";

/**
 * Stateless session store — serverless-safe (žádný filesystem, žádný
 * sessions.jsonl). Session je podepsaná cookie (HMAC klíč odvozený
 * z hesla role): payload { sid, expiresAt, role } + HMAC podpis.
 *
 * Cookie je JEDINÝ zdroj autentizace:
 *  - podpis i expirace se ověřují edge-safe (verifySignedSession) bez store
 *  - role je součást podepsaného payloadu (tamper-proof)
 *
 * Kompromisy bez server-side storage:
 *  - revoke(sid): nelze odvolat jednotlivou session — logout smaže cookie
 *    na klientovi; ukradená cookie zůstává platná do expirace
 *  - revokeAll(): změna hesla (reset flow) automaticky zneplatní VŠECHNY
 *    staré cookie, protože HMAC klíč se derivuje z hesla → žádný storage
 *    není potřeba
 *  - cleanup(): nic se neudržuje — expirace řeší payload, ne záznamy
 */

export function statelessSessionStore(): SessionStorePort {
  return {
    /** No-op — session data žijí v cookie (payload + podpis). */
    async create() {
      /* nothing to persist */
    },

    /**
     * Vrací záznam vždy — validita se řídí podpisem + expiresAt v payloadu
     * cookie (verifySignedSession), ne server-side záznamem.
     */
    async get(sid): Promise<SessionRecord | null> {
      return { sid, createdAt: Date.now(), expiresAt: Date.now() };
    },

    /** No-op — nelze odvolat jednotlivou session bez storage. */
    async revoke() {
      /* logout maže cookie na klientovi; ukradená cookie platí do expirace */
    },

    /**
     * No-op — po změně hesla (reset flow) jsou staré cookie automaticky
     * neplatné: HMAC klíč je odvozený z nového hesla.
     */
    async revokeAll() {
      /* implicitní revokace změnou hesla */
    },

    /** No-op — expirace je v payloadu, žádné záznamy se neudržují. */
    async cleanup(): Promise<number> {
      return 0;
    },
  };
}

export const sessionStore: SessionStorePort = statelessSessionStore();
