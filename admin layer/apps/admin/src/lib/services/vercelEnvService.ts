import "server-only";
import { AdminError } from "@admin/core";

/**
 * Vercel env manager — trvalá změna ADMIN_PASSWORD přes Vercel API.
 *
 * Proč: reset hesla v serverless nesmí být jen in-memory (cold start by
 * změnu smazal). Tato služba přepíše environment variable ADMIN_PASSWORD
 * v projektu Vercelu, takže změna přežije redeploy i cold start.
 *
 * Env:
 *   VERCEL_TOKEN      — API token (nikdy na klienta; server-only)
 *   VERCEL_PROJECT_ID — ID projektu admin aplikace
 *   VERCEL_TEAM_ID    — volitelné (týmové projekty)
 *
 * Bezpečnost:
 *  - token i nové heslo se NIKDY nelogují (jen statusy / chybové kódy)
 *  - volání jen ze server-side kódu ("server-only")
 *  - bez VERCEL_* konfigurace je služba no-op (lokální vývoj / Render)
 *
 * Flow: GET seznam env → najít ADMIN_PASSWORD → PATCH hodnota
 * (neexistuje → POST create). Pak best-effort redeploy produkčního
 * deploymentu, aby se nová env projevila.
 */

const API = "https://api.vercel.com";

export interface VercelConfig {
  token: string;
  projectId: string;
  teamId?: string;
}

/** Vrací konfiguraci, nebo null, když Vercel není nakonfigurovaný. */
export function getVercelConfig(): VercelConfig | null {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID || undefined };
}

export function isVercelConfigured(): boolean {
  return getVercelConfig() !== null;
}

function query(cfg: VercelConfig): string {
  return cfg.teamId ? `?teamId=${encodeURIComponent(cfg.teamId)}` : "";
}

interface VercelEnvVar {
  id?: string;
  key?: string;
  value?: string;
  target?: string[];
}

async function apiFetch(
  cfg: VercelConfig,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${cfg.token}`);
  headers.set("accept", "application/json");
  if (init.body) headers.set("content-type", "application/json");
  return fetch(`${API}${path}`, { ...init, headers, signal: AbortSignal.timeout(15_000) });
}

/** Najde env var ADMIN_PASSWORD v projektu. Vrací null, pokud neexistuje. */
async function findAdminPasswordVar(cfg: VercelConfig): Promise<VercelEnvVar | null> {
  const res = await apiFetch(cfg, `/v9/projects/${cfg.projectId}/env${query(cfg)}`);
  if (!res.ok) {
    throw new AdminError(`Vercel env list selhal (HTTP ${res.status})`, undefined, 502);
  }
  const json = (await res.json()) as { envs?: VercelEnvVar[] };
  return json.envs?.find((env) => env.key === "ADMIN_PASSWORD") ?? null;
}

/** Přepíše existující env var (PATCH). */
async function patchAdminPassword(cfg: VercelConfig, envId: string, value: string): Promise<void> {
  const target = ["production", "preview", "development"];
  const res = await apiFetch(cfg, `/v9/projects/${cfg.projectId}/env/${envId}${query(cfg)}`, {
    method: "PATCH",
    body: JSON.stringify({ value, target }),
  });
  if (!res.ok) {
    throw new AdminError(`Vercel env update selhal (HTTP ${res.status})`, undefined, 502);
  }
}

/** Vytvoří env var, pokud neexistuje (POST). */
async function createAdminPassword(cfg: VercelConfig, value: string): Promise<void> {
  const target = ["production", "preview", "development"];
  const res = await apiFetch(cfg, `/v10/projects/${cfg.projectId}/env${query(cfg)}`, {
    method: "POST",
    body: JSON.stringify({
      key: "ADMIN_PASSWORD",
      value,
      type: "encrypted",
      target,
    }),
  });
  if (!res.ok) {
    throw new AdminError(`Vercel env create selhal (HTTP ${res.status})`, undefined, 502);
  }
}

/**
 * Best-effort redeploy produkčního deploymentu — nová env se projeví
 * v běžícím deploymentu. Selhání redeployu neznamená selhání resetu
 * (env je už uložená; projeví se při příštím deployi).
 */
async function triggerProductionRedeploy(cfg: VercelConfig): Promise<void> {
  try {
    const list = await apiFetch(
      cfg,
      `/v13/deployments?projectId=${cfg.projectId}${cfg.teamId ? `&teamId=${encodeURIComponent(cfg.teamId)}` : ""}&target=production&limit=1&state=READY`,
    );
    if (!list.ok) return;
    const json = (await list.json()) as { deployments?: { uid?: string }[] };
    const deploymentId = json.deployments?.[0]?.uid;
    if (!deploymentId) return;
    await apiFetch(cfg, `/v13/deployments/${deploymentId}/redeploy${query(cfg)}`, {
      method: "POST",
    });
  } catch {
    // best-effort — ticho
  }
}

/**
 * Trvale změní ADMIN_PASSWORD v projektu Vercelu.
 *
 * Vrací true, když se Vercel update provedl; false, když Vercel není
 * nakonfigurovaný (fallback: in-memory override ve volajícím).
 * Při chybě Vercel API vyhazuje AdminError 502.
 */
export async function updateAdminPasswordOnVercel(newPassword: string): Promise<boolean> {
  const cfg = getVercelConfig();
  if (!cfg) return false;

  const existing = await findAdminPasswordVar(cfg);
  if (existing?.id) {
    await patchAdminPassword(cfg, existing.id, newPassword);
  } else {
    await createAdminPassword(cfg, newPassword);
  }

  await triggerProductionRedeploy(cfg);
  return true;
}
