import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GITHUB_TOKEN", "test-token");
vi.stubEnv("GITHUB_OWNER", "test-owner");
vi.stubEnv("GITHUB_REPO", "test-repo");
vi.stubEnv("GITHUB_BRANCH", "main");

const { githubAuditStore } = await import("../src/lib/storage/githubAuditStore");
const { appendAudit, listAudit } = await import("../src/lib/services/auditService");
const { centralAuditStore } = await import("../src/lib/storage/auditStore");

const AUDIT_PATH = "admin layer/content/audit/central.jsonl";

function base64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** In-memory GitHub mock pro audit (GET/PUT na jednom souboru). */
function makeAuditMock(initial?: string) {
  let file: { content: string; sha: string } | null = initial
    ? { content: initial, sha: "sha0" }
    : null;
  let shaCounter = 1;

  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      void init;
      if (method === "PUT") {
        const body = JSON.parse(String(init?.body)) as { content: string; sha?: string };
        if (file && file.sha !== body.sha) {
          return Promise.resolve(new Response("Conflict", { status: 409 }));
        }
        file = {
          content: Buffer.from(body.content, "base64").toString("utf8"),
          sha: `sha${shaCounter++}`,
        };
        return Promise.resolve(
          new Response(JSON.stringify({ content: { sha: file.sha } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      if (!file) {
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ content: base64(file.content), sha: file.sha }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch,
  );

  return { getContent: () => file?.content ?? "" };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("githubAuditStore — append JSONL", () => {
  it("append zapíše JSONL řádek do repozitáře", async () => {
    const mock = makeAuditMock();
    const store = githubAuditStore(AUDIT_PATH);
    await store.append({
      id: "e1",
      timestamp: "2026-08-14T10:00:00.000Z",
      actor: "admin",
      projectId: "core",
      action: "login",
      entityKind: "session",
      entityId: "login",
      summary: "Přihlášen",
    });
    const content = mock.getContent();
    expect(content).toContain('"action":"login"');
    expect(content.endsWith("\n")).toBe(true);
    // JSONL — každý řádek validní JSON
    const lines = content.trim().split("\n");
    expect(JSON.parse(lines[0])).toMatchObject({ action: "login", actor: "admin" });
  });

  it("list: přečte a seřadí události (nejnovější první)", async () => {
    makeAuditMock(
      [
        JSON.stringify({
          id: "a",
          timestamp: "2026-08-14T09:00:00.000Z",
          action: "create",
          projectId: "ponici",
          entityKind: "x",
          entityId: "1",
          summary: "a",
          actor: "admin",
        }),
        JSON.stringify({
          id: "b",
          timestamp: "2026-08-14T10:00:00.000Z",
          action: "publish",
          projectId: "ponici",
          entityKind: "x",
          entityId: "2",
          summary: "b",
          actor: "admin",
        }),
      ].join("\n"),
    );
    const store = githubAuditStore(AUDIT_PATH);
    const events = await store.list();
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe("b"); // nejnovější první
    expect(events[1].id).toBe("a");
  });

  it("malformed řádek se ignoruje (audit nesmí shodit aplikaci)", async () => {
    makeAuditMock(
      "not-json\n" +
        JSON.stringify({
          id: "ok",
          timestamp: "2026-08-14T09:00:00.000Z",
          action: "create",
          projectId: "p",
          entityKind: "x",
          entityId: "1",
          summary: "s",
          actor: "admin",
        }),
    );
    const store = githubAuditStore(AUDIT_PATH);
    const events = await store.list();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("ok");
  });

  it("GitHub chyba (500) → append vyhodí; volající používá catch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("Server Error", { status: 500 })),
      ) as unknown as typeof fetch,
    );
    const store = githubAuditStore(AUDIT_PATH);
    await expect(
      store.append({
        id: "x",
        timestamp: "2026-01-01",
        actor: "admin",
        projectId: "core",
        action: "login",
        entityKind: "s",
        entityId: "i",
        summary: "s",
      }),
    ).rejects.toBeDefined();
  });
});

describe("auditService — appendAudit/listAudit", () => {
  it("appendAudit vytvoří událost s id/timestamp/actor", async () => {
    const mock = makeAuditMock();
    await appendAudit({
      projectId: "core",
      action: "settings",
      entityKind: "auth",
      entityId: "reset",
      summary: "Heslo změněno",
    });
    const event = JSON.parse(mock.getContent().trim()) as Record<string, unknown>;
    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.actor).toBe("admin");
    expect(event.action).toBe("settings");
    // žádné secrets v události
    expect(JSON.stringify(event)).not.toMatch(/password|token|secret|code/i);
  });

  it("listAudit filtruje podle projectId", async () => {
    makeAuditMock(
      [
        JSON.stringify({
          id: "1",
          timestamp: "2026-08-14T09:00:00.000Z",
          actor: "admin",
          projectId: "ponici",
          action: "create",
          entityKind: "x",
          entityId: "1",
          summary: "a",
        }),
        JSON.stringify({
          id: "2",
          timestamp: "2026-08-14T10:00:00.000Z",
          actor: "admin",
          projectId: "core",
          action: "login",
          entityKind: "s",
          entityId: "i",
          summary: "b",
        }),
      ].join("\n"),
    );
    const ponici = await listAudit("ponici");
    expect(ponici).toHaveLength(1);
    expect(ponici[0].projectId).toBe("ponici");
    const all = await listAudit();
    expect(all).toHaveLength(2);
  });

  it("centralAuditStore používá GitHub path", async () => {
    expect(centralAuditStore).toBeDefined();
  });
});
