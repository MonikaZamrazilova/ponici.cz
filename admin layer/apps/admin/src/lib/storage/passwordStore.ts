import type { Role } from "@admin/core";
import { adminConfig } from "../config";

/**
 * Hesla rolí — serverless-safe (žádný filesystem, žádný secrets soubor).
 *
 * Výchozí zdroj = env proměnné (ADMIN_PASSWORD / ADMIN_EDITOR_PASSWORD /
 * ADMIN_VIEWER_PASSWORD). Runtime změna hesla (reset flow) ukládá override
 * do paměti instance — funguje až do studeného startu; v produkci (Vercel)
 * je env jediný trvalý zdroj (změna hesla = nový deploy s novou env).
 *
 * Všechny metody jsou async kvůli stejnému port rozhraní jako předtím.
 */

/** Runtime override (reset flow) — ztrácí se při studeném startu. */
const memoryOverride = new Map<Role, string>();

export function passwordStore() {
  return {
    /** Heslo role: runtime override má přednost, jinak env. */
    async get(role: Role): Promise<string | null> {
      const value = memoryOverride.get(role) ?? adminConfig.passwords[role];
      return value ? value : null;
    },

    /** Nastaví/smaže runtime override (v paměti, žádný fs). */
    async set(role: Role, plaintext: string): Promise<void> {
      if (plaintext) {
        memoryOverride.set(role, plaintext);
      } else {
        memoryOverride.delete(role);
      }
    },
  };
}

export const passwordOverride = passwordStore();
