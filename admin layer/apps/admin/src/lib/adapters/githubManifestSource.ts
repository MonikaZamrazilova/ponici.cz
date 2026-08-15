import "server-only";
import {
  AdminError,
  contentManifestSchema,
  type ContentManifest,
  type ManifestSourcePort,
} from "@admin/core";
import { githubRead, githubRepo } from "../storage/githubJson";

/**
 * Integration adapter — zdroj kontraktu projektu přes GitHub Contents API.
 *
 * Čte manifest.json z repozitáře (artefakt vyexportovaný externí aplikací).
 * Stejné portové rozhraní jako fileManifestSource — výměna backendu bez
 * změny volajících.
 *
 * @param repoPath cesta v repu k manifest.json (např. admin layer/content/projects/<id>/manifest.json)
 */

export function githubManifestSource(repoPath: string): ManifestSourcePort {
  return {
    async load(): Promise<ContentManifest> {
      const file = await githubRead(githubRepo(), repoPath);
      if (!file) {
        throw new AdminError(
          `Manifest nenalezen v repozitáři: ${repoPath}. Spusťte "npm run manifest:export" v externí aplikaci.`,
          undefined,
          404,
        );
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(file.content);
      } catch {
        throw new AdminError(`Neplatný JSON v manifestu (${repoPath})`, undefined, 502);
      }
      const result = contentManifestSchema.safeParse(parsed);
      if (!result.success) {
        throw new AdminError(
          `Neplatný manifest (${repoPath}): ${result.error.message}. Spusťte "npm run manifest:export" v externí aplikaci.`,
          undefined,
          502,
        );
      }
      return result.data as ContentManifest;
    },
  };
}
