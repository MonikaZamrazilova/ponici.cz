import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

/**
 * ESLint config pro ADMIN LAYER (Next.js app).
 *
 * Admin je Next.js aplikace — `server-only` je pro ni správný mechanismus
 * (na rozdíl od webu, který běží na TanStack Start). Proto se zde NEaplikují
 * webová pravidla (`no-restricted-imports` pro server-only).
 *
 * Tento config přepisuje zděděný webový config (repo root), který admin
 * nemůže používat.
 */
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "dist/**", "content/**", ".output/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  eslintPluginPrettier,
);
