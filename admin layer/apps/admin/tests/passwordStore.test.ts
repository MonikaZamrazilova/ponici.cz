import { describe, expect, it, vi } from "vitest";

// env PŘED importem — passwordStore čte adminConfig (module-level loadAdminEnv)
vi.stubEnv("ADMIN_PASSWORD", "env-admin-heslo");
vi.stubEnv("ADMIN_EDITOR_PASSWORD", "env-editor-heslo");
vi.stubEnv("ADMIN_VIEWER_PASSWORD", "");
vi.stubEnv("ADMIN_PROJECTS", "");

const { passwordOverride } = await import("../src/lib/storage/passwordStore");

describe("passwordStore — serverless (env + in-memory, žádný fs)", () => {
  it("get() vrací heslo z env", async () => {
    expect(await passwordOverride.get("admin")).toBe("env-admin-heslo");
    expect(await passwordOverride.get("editor")).toBe("env-editor-heslo");
  });

  it("get() vrací null pro roli bez hesla", async () => {
    expect(await passwordOverride.get("viewer")).toBeNull();
  });

  it("set() uloží runtime override, který má přednost před env", async () => {
    await passwordOverride.set("admin", "nove-runtime-heslo");
    expect(await passwordOverride.get("admin")).toBe("nove-runtime-heslo");
    await passwordOverride.set("admin", ""); // cleanup
    expect(await passwordOverride.get("admin")).toBe("env-admin-heslo");
  });

  it("set() prázdnou hodnotou smaže override (vrací se env)", async () => {
    await passwordOverride.set("admin", "x");
    await passwordOverride.set("admin", "");
    expect(await passwordOverride.get("admin")).toBe("env-admin-heslo");
  });
});
