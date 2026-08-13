import { promises as fs } from "fs";
import { contentManifestSchema, type ContentManifest, type ManifestSourcePort } from "@admin/core";

/**
 * Integration adapter — zdroj kontraktu projektu.
 * Čte manifest.json ze souboru (artefakt vyexportovaný externí aplikací).
 * Stejné portové rozhraní umožní HTTP zdroj bez změny volajících.
 */
export function fileManifestSource(manifestPath: string): ManifestSourcePort {
  return {
    async load(): Promise<ContentManifest> {
      const raw = await fs.readFile(manifestPath, "utf8");
      const parsed = contentManifestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        throw new Error(
          `Neplatný manifest (${manifestPath}): ${parsed.error.message}. Spusťte "npm run manifest:export" v externí aplikaci.`
        );
      }
      // JSON kontrakt nemůže být plně typovaný — strukturu ověřil zod,
      // deep ContentItem typy jsou garantované konvencí obou stran.
      return parsed.data as ContentManifest;
    },
  };
}
