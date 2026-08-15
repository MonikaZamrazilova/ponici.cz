import { afterEach, describe, expect, it, vi } from "vitest";

// env PŘED importem
vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");
vi.stubEnv("GITHUB_AUDIT_PATH", "admin layer/content/audit/central.jsonl");
vi.stubEnv("RECOVERY_EMAILS_PATH", "admin layer/content/settings/recovery-emails.json");

const {
  DEFAULT_OWNER_EMAIL,
  normalizeEmail,
  normalizeEmailList,
  getRecoveryEmails,
  isResetEnabled,
  isRecoveryEmail,
  updateRecoveryEmails,
} = await import("../src/lib/services/recoveryEmailsService");

const FALLBACK = "monika.zamrazilova@seznam.cz";

function stubGithubGet(content: string | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init?.body)) as { content: string };
        return new Response(JSON.stringify({ content: { sha: "s" } }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      if (content === null) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response(
        JSON.stringify({
          content: Buffer.from(content, "utf8").toString("base64"),
          sha: "s0",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recoveryEmailsService — validace", () => {
  it("normalizeEmail: validní → lowercase", () => {
    expect(normalizeEmail(" Monika.Zamrazilova@Seznam.cz ")).toBe("monika.zamrazilova@seznam.cz");
  });

  it("normalizeEmail: neplatné formáty → null", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("bez-at-znaminka")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
    expect(normalizeEmail("mezerované heslo")).toBeNull();
  });

  it("normalizeEmailList: deduplikace + ignorování neplatných", () => {
    const list = normalizeEmailList(["A@B.cz", "a@b.cz", "špatný", "", 42, "c@d.cz"]);
    expect(list).toEqual(["a@b.cz", "c@d.cz"]);
  });
});

describe("recoveryEmailsService — priorita (admin config > env > fallback)", () => {
  it("1. admin config má přednost před env i fallbackem", async () => {
    stubGithubGet(JSON.stringify(["admin@konfig.cz", "druhy@konfig.cz"]));
    vi.stubEnv("ADMIN_EMAIL", "env@example.com");
    const emails = await getRecoveryEmails();
    expect(emails).toEqual(["admin@konfig.cz", "druhy@konfig.cz"]);
  });

  it("2. ADMIN_EMAIL env při prázdné admin konfiguraci", async () => {
    stubGithubGet(null);
    vi.stubEnv("ADMIN_EMAIL", "env@example.com");
    const emails = await getRecoveryEmails();
    expect(emails).toEqual(["env@example.com"]);
  });

  it("3. fallback na Moniku, když admin config i env chybí", async () => {
    stubGithubGet(null);
    vi.stubEnv("ADMIN_EMAIL", "");
    const emails = await getRecoveryEmails();
    expect(emails).toEqual([FALLBACK]);
  });

  it("env podporuje více emailů (čárkou)", async () => {
    stubGithubGet(null);
    vi.stubEnv("ADMIN_EMAIL", "a@x.cz, b@x.cz");
    const emails = await getRecoveryEmails();
    expect(emails).toEqual(["a@x.cz", "b@x.cz"]);
  });

  it("isResetEnabled: vždy true (fallback vždy existuje)", async () => {
    stubGithubGet(null);
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(await isResetEnabled()).toBe(true);
  });

  it("isRecoveryEmail: členství v konfiguraci", async () => {
    stubGithubGet(JSON.stringify([FALLBACK]));
    expect(await isRecoveryEmail("monika.zamrazilova@seznam.cz")).toBe(true);
    expect(await isRecoveryEmail("cizi@example.com")).toBe(false);
  });
});

describe("recoveryEmailsService — update + audit", () => {
  it("updateRecoveryEmails: uloží nové emaily a vrátí je (normalizované)", async () => {
    const puts: string[] = [];
    stubGithubGet(JSON.stringify(["stary@example.com"]));
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init?.body)) as { content: string; message: string };
        puts.push(Buffer.from(body.content, "base64").toString("utf8"));
        expect(body.message).toContain("recovery emails");
        return new Response(JSON.stringify({ content: { sha: "s" } }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          content: Buffer.from(JSON.stringify(["stary@example.com"]), "utf8").toString("base64"),
          sha: "s0",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateRecoveryEmails(
      ["nova@example.com", "nova@example.com", "dalsi@example.com"],
      "admin",
    );
    expect(result).toEqual(["nova@example.com", "dalsi@example.com"]);
    expect(puts[0]).toContain("nova@example.com");
  });

  it("updateRecoveryEmails: prázdný/nevalidní seznam → AdminError 400", async () => {
    stubGithubGet(null);
    await expect(updateRecoveryEmails([], "admin")).rejects.toMatchObject({ status: 400 });
    await expect(updateRecoveryEmails(["špatný-email"], "admin")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("updateRecoveryEmails: zapíše audit s actor, old a new (bez secrets)", async () => {
    const auditLines: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const isAudit = String(url).includes("central.jsonl");
        if (isAudit && init?.method === "PUT") {
          const body = JSON.parse(String(init?.body)) as { content: string };
          auditLines.push(Buffer.from(body.content, "base64").toString("utf8"));
          return new Response(JSON.stringify({ content: { sha: "s" } }), {
            status: 201,
            headers: { "content-type": "application/json" },
          });
        }
        if (isAudit) {
          // audit GET — soubor zatím neexistuje (404 → fallback na prázdný log)
          return new Response("Not Found", { status: 404 });
        }
        if (init?.method === "PUT") {
          return new Response(JSON.stringify({ content: { sha: "s" } }), {
            status: 201,
            headers: { "content-type": "application/json" },
          });
        }
        // recovery-emails GET — stará hodnota
        return new Response(
          JSON.stringify({
            content: Buffer.from(JSON.stringify(["stary@example.com"]), "utf8").toString("base64"),
            sha: "s0",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as unknown as typeof fetch,
    );

    await updateRecoveryEmails(["novy@example.com"], "editor");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const auditEvent = auditLines
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .find((e) => e && e.entityId === "recovery-emails") as Record<string, unknown>;
    expect(auditEvent).toBeDefined();
    expect(auditEvent.action).toBe("settings");
    expect(auditEvent.entityId).toBe("recovery-emails");
    expect(auditEvent.details).toMatchObject({
      actor: "editor",
      old: ["stary@example.com"],
      new: ["novy@example.com"],
    });
    expect(JSON.stringify(auditEvent)).not.toContain("token");
    expect(JSON.stringify(auditEvent)).not.toContain("password");
    expect(JSON.stringify(auditEvent)).not.toContain("code");
  });
});
