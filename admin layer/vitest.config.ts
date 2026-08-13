import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@admin/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      // itemService/auditService importují "server-only" — v testech (node) je prázdný stub
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/*/tests/**/*.test.ts", "apps/*/tests/**/*.test.ts"],
  },
});
