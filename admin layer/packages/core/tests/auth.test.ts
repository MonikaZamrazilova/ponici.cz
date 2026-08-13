import { describe, expect, it } from "vitest";
import {
  isAdminEnabled,
  isRole,
  signSession,
  verifyPassword,
  verifySignedSession,
  type SessionPayload,
} from "../src/auth";

describe("auth primitiva (core)", () => {
  it("podpis/ověření session projde round-trip", async () => {
    const payload: SessionPayload = { sid: "abc", expiresAt: Date.now() + 60_000, role: "admin" };
    const token = await signSession(payload, "heslo");
    const verified = await verifySignedSession(token, "heslo");
    expect(verified).toEqual(payload);
  });

  it("tampered token je odmítnut", async () => {
    const payload: SessionPayload = { sid: "abc", expiresAt: Date.now() + 60_000, role: "admin" };
    const token = await signSession(payload, "heslo");
    expect(await verifySignedSession(`${token}x`, "heslo")).toBeNull();
    expect(await verifySignedSession(token.slice(0, -2), "heslo")).toBeNull();
  });

  it("vypršená session je odmítnuta", async () => {
    const payload: SessionPayload = { sid: "abc", expiresAt: Date.now() - 1, role: "admin" };
    const token = await signSession(payload, "heslo");
    expect(await verifySignedSession(token, "heslo")).toBeNull();
  });

  it("špatné heslo token neověří", async () => {
    const payload: SessionPayload = { sid: "abc", expiresAt: Date.now() + 60_000, role: "admin" };
    const token = await signSession(payload, "heslo");
    expect(await verifySignedSession(token, "jine-heslo")).toBeNull();
  });

  it("payload s neznámou rolí je odmítnut", async () => {
    const payload = { sid: "abc", expiresAt: Date.now() + 60_000, role: "root" };
    const token = await signSession(payload, "heslo");
    expect(await verifySignedSession(token, "heslo")).toBeNull();
  });

  it("verifyPassword — shoda i konstantní délka", async () => {
    expect(verifyPassword("tajne", "tajne")).toBe(true);
    expect(verifyPassword("tajne", "tajneX")).toBe(false);
    expect(verifyPassword("", "")).toBe(false);
  });

  it("isAdminEnabled / isRole", () => {
    expect(isAdminEnabled("x")).toBe(true);
    expect(isAdminEnabled(undefined)).toBe(false);
    expect(isRole("admin")).toBe(true);
    expect(isRole("root")).toBe(false);
  });
});
