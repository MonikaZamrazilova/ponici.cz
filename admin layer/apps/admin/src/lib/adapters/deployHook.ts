import { type DeployHookPort } from "@admin/core";

/**
 * Integration adapter — upozornění infrastruktury po publishi.
 * Fire-and-forget: publish nesmí selhat kvůli hooku (chyba se jen loguje).
 */
export function deployHook(hookUrl: string): DeployHookPort {
  return {
    async notify(payload) {
      try {
        await fetch(hookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (error) {
        console.error("[admin] deploy hook selhal:", error);
      }
    },
  };
}
