import { describe, expect, it } from "vitest";
import { hasPermission, rolePermissions, ROLES } from "../src/auth";
import { PERMISSIONS } from "../src/auth";

describe("permission model (A1.2)", () => {
  const permissions = [...PERMISSIONS];

  it("admin má všechna oprávnění", () => {
    for (const permission of permissions) {
      expect(hasPermission("admin", permission)).toBe(true);
    }
    expect(rolePermissions("admin")).toHaveLength(PERMISSIONS.length);
  });

  it("editor nemá settings", () => {
    expect(hasPermission("editor", "content:publish")).toBe(true);
    expect(hasPermission("editor", "content:delete")).toBe(true);
    expect(hasPermission("editor", "media:write")).toBe(true);
    expect(hasPermission("editor", "settings:read")).toBe(false);
    expect(hasPermission("editor", "settings:write")).toBe(false);
  });

  it("viewer je read-only", () => {
    expect(hasPermission("viewer", "content:read")).toBe(true);
    expect(hasPermission("viewer", "audit:read")).toBe(true);
    for (const write of [
      "content:create",
      "content:update",
      "content:delete",
      "content:publish",
      "media:write",
      "settings:read",
    ] as const) {
      expect(hasPermission("viewer", write)).toBe(false);
    }
  });

  it("každá role má přiřazenou permisi (úplnost)", () => {
    for (const role of ROLES) {
      expect(rolePermissions(role).length).toBeGreaterThan(0);
    }
  });
});
