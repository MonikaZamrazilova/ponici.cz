import "server-only";
import { AdminError } from "@admin/core";

/**
 * Sdílené GitHub Contents API pomocníky (storage backend přes git).
 *
 * Data adminu (drafts, published, manifesty, audit) se ukládají jako
 * soubory v repozitáři přes GitHub Contents API — serverless kompatibilní
 * (žádný filesystem, žádný persistent disk).
 *
 * Env:
 *   GITHUB_TOKEN   — fine-grained PAT, Contents read+write (nikdy na klienta)
 *   GITHUB_OWNER   — vlastník repa (např. MonikaZamrazilova)
 *   GITHUB_REPO    — název repa (např. ponici.cz)
 *   GITHUB_BRANCH  — větev (např. main)
 *
 * Konflikt 409 (sha se mezitím změnila) se řeší retry: nové načtení,
 * znovu aplikovaná transformace, nový zápis. Single-writer admin →
 * jeden retry stačí.
 */

export interface GithubRepo {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export function githubRepo(): GithubRepo {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  if (!token || !owner || !repo) {
    throw new AdminError(
      "GitHub storage není nakonfigurováno — chybí GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO",
      undefined,
      500
    );
  }
  return { owner, repo, branch, token };
}

/** True, pokud jsou GITHUB_* env proměnné nastavené → GitHub storage backend. */
export function isGithubConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO
  );
}

/** Kořen projektů v repozitáři (default pro monorepo strukturu Ponici.cz). */
export function githubContentRoot(): string {
  return process.env.GITHUB_CONTENT_ROOT ?? "admin layer/content/projects";
}

const MAX_RETRIES = 2;
const READ_TIMEOUT_MS = 10_000;
const WRITE_TIMEOUT_MS = 15_000;

/** Cesta v repozitáři → URL-safe segment (mezery, diakritika, / v názvech). */
function encodeRepoPath(repoPath: string): string {
  return repoPath.split("/").map((part) => encodeURIComponent(part)).join("/");
}

export interface GithubFile {
  sha: string;
  content: string; // utf8 text
}

/** Přečte soubor z repozitáře. Vrací null, pokud neexistuje (404). */
export async function githubRead(gh: GithubRepo, repoPath: string): Promise<GithubFile | null> {
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(gh.branch)}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${gh.token}`,
      "user-agent": "ponici-admin",
    },
    signal: AbortSignal.timeout(READ_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new AdminError(`GitHub GET ${repoPath} selhal (HTTP ${res.status})`, undefined, 502);
  }
  const json = (await res.json()) as { content?: string; sha?: string };
  if (!json.content) {
    throw new AdminError(
      `GitHub GET ${repoPath}: chybí content (soubor je pravděpodobně binární)`,
      undefined,
      502
    );
  }
  return {
    sha: json.sha ?? "",
    content: Buffer.from(json.content, "base64").toString("utf8"),
  };
}

/** Přečte JSON soubor s fallbackem při neexistenci (jako readJson). */
export async function githubReadJson<T>(repoPath: string, fallback: T): Promise<T> {
  const file = await githubRead(githubRepo(), repoPath);
  if (!file) return fallback;
  try {
    return JSON.parse(file.content) as T;
  } catch {
    return fallback;
  }
}

/**
 * Čti-změň-zapiš přes GitHub Contents API s retry při konfliktu 409.
 *
 * @param repoPath cesta v repu (např. admin layer/content/projects/ponici/store/drafts.json)
 * @param fallback hodnota, když soubor neexistuje (první zápis)
 * @param update čistá transformace aktuálního obsahu → nový obsah
 * @param message commit message
 *
 * Retry: při 409 se transformace znovu aplikuje na čerstvě načtená data —
 * nikdy nepřepíše cizí změnu. Vrátí true, pokud soubor už existoval.
 */
export async function githubUpdateJson<T>(
  repoPath: string,
  fallback: T,
  update: (current: T) => T,
  message = "admin: update"
): Promise<boolean> {
  const gh = githubRepo();
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await githubRead(gh, repoPath);
    const data = update(current ? (JSON.parse(current.content) as T) : fallback);
    const content = JSON.stringify(data, null, 2) + "\n";
    const ok = await githubPut(gh, repoPath, content, current?.sha ?? null, message);
    if (ok) return current !== null;
  }
  throw new AdminError(
    `GitHub zápis ${repoPath} selhal — konflikt (409) i po opakování`,
    undefined,
    409
  );
}

/** Vrátí true, když PUT proběhl (create/update). */
async function githubPut(
  gh: GithubRepo,
  repoPath: string,
  content: string,
  sha: string | null,
  message: string
): Promise<boolean> {
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${encodeRepoPath(repoPath)}`;
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: gh.branch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${gh.token}`,
      "user-agent": "ponici-admin",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
  });
  if (res.status === 200 || res.status === 201) return true;
  if (res.status === 409) return false; // konflikt → retry s čerstvým stavem
  throw new AdminError(`GitHub PUT ${repoPath} selhal (HTTP ${res.status})`, undefined, 502);
}

/**
 * Append řádku do JSONL souboru v repozitáři (čti-změň-zapiš s retry).
 * Při konfliktu 409 se aktuální obsah znovu načte a řádek se přidá znovu —
 * auditní záznam se nikdy neztratí ani neduplikuje (single-writer).
 */
export async function githubAppendJsonl(
  repoPath: string,
  line: unknown,
  message = "admin: audit"
): Promise<void> {
  const gh = githubRepo();
  const serialized = JSON.stringify(line);
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await githubRead(gh, repoPath);
    const content = `${current?.content ?? ""}${serialized}\n`;
    const ok = await githubPut(gh, repoPath, content, current?.sha ?? null, message);
    if (ok) return;
  }
  throw new AdminError(
    `GitHub audit append ${repoPath} selhal — konflikt (409) i po opakování`,
    undefined,
    409
  );
}
