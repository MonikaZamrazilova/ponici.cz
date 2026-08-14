import { describe, expect, it, vi } from "vitest";

// env PŘED importem — passwordStore čte adminConfig (module-level loadAdminEnv)
vi.stubEnv("ADMIN_PASSWORD", "admin-heslo-1");
vi.stubEnv("ADMIN_PROJECTS", "");

const { sessionStore } = await import("../src/lib/storage/sessionStore");
const { signSession, verifySignedSession, SESSION_COOKIE } = await import("@admin/core");

describe("statelessSessionStore — signed cookie jako jediný zdroj", () => {
  it("create je no-op (data žijí v cookie)", async () => {
    await expect(sessionStore.create("sid-1", 1000)).resolves.toBeUndefined();
  });

  it("get vrací záznam (validitu řeší podpis + expiresAt v payloadu)", async () => {
    const record = await sessionStore.get("sid-1");
    expect(record?.sid).toBe("sid-1");
  });

  it("revoke a revokeAll jsou no-op (žádný storage)", async () => {
    await expect(sessionStore.revoke("sid-1")).resolves.toBeUndefined();
    await expect(sessionStore.revokeAll()).resolves.toBeUndefined();
  });

  it("cleanup vrací 0", async () => {
    expect(await sessionStore.cleanup()).toBe(0);
  });
});

describe("session cookie primitiva — validace", () => {
  it("valid session cookie: podpis + role + expiresAt v payloadu", async () => {
    const payload = { sid: "s1", expiresAt: Date.now() + 60_000, role: "admin" as const };
    const token = await signSession(payload, "admin-heslo-1");
    const verified = await verifySignedSession(token, "admin-heslo-1");
    expect(verified).toEqual(payload);
  });

  it("invalid signature (jiné heslo / tamper) → null", async () => {
    const payload = { sid: "s1", expiresAt: Date.now() + 60_000, role: "admin" as const };
    const token = await signSession(payload, "admin-heslo-1");
    expect(await verifySignedSession(token, "spatne-heslo")).toBeNull();

    const tampered = token.slice(0, -4) + "xxxx";
    expect(await verifySignedSession(tampered, "admin-heslo-1")).toBeNull();
  });

  it("expired session → null", async () => {
    const payload = { sid: "s1", expiresAt: Date.now() - 1000, role: "admin" as const };
    const token = await signSession(payload, "admin-heslo-1");
    expect(await verifySignedSession(token, "admin-heslo-1")).toBeNull();
  });

  it("revokeAll po změně hesla: staré cookie neplatné (HMAC klíč z hesla)", async () => {
    const oldPayload = { sid: "s1", expiresAt: Date.now() + 60_000, role: "admin" as const };
    const oldToken = await signSession(oldPayload, "puvodni-heslo");

    // simulace resetu hesla: nové heslo = nový HMAC klíč
    expect(await verifySignedSession(oldToken, "puvodni-heslo")).not.toBeNull();
    expect(await verifySignedSession(oldToken, "nove-heslo")).toBeNull();
  });

  it("SESSION_COOKIE je admin_session (bezpečná cookie vlastnost)", () => {
    expect(SESSION_COOKIE).toBe("admin_session");
  });
});
