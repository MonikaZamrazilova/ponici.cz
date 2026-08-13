import { promises as fs } from "fs";
import type { Role } from "@admin/core";
import { adminConfig } from "../config";
import { readJson, writeJson } from "./fsJson";

/**
 * Runtime override hesel (gitignored) — umožňuje změnit heslo admin role
 * bez editace env proměnných (flow "zapomenuté heslo").
 *
 * Hesla jsou uložena jako plaintext ve stejné podobě jako v .env
 * (session HMAC klíč se z nich derivuje). Soubor je chmod 600.
 */

interface PasswordFile {
  [role: string]: string | undefined;
}

export function passwordStore() {
  const file = adminConfig.passwordsFile;

  async function load(): Promise<PasswordFile> {
    return readJson<PasswordFile>(file, {});
  }

  return {
    /** Heslo role z override store (null, pokud není nastaveno). */
    async get(role: Role): Promise<string | null> {
      return (await load())[role] ?? null;
    },

    /** Nastaví/smaže override heslo role. */
    async set(role: Role, plaintext: string): Promise<void> {
      const data = await load();
      if (plaintext) {
        data[role] = plaintext;
      } else {
        delete data[role];
      }
      await writeJson(file, data);
      await fs.chmod(file, 0o600).catch(() => {});
    },
  };
}

export const passwordOverride = passwordStore();
