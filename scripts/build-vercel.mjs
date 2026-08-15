/**
 * Vercel build — JEDEN deployment = web (nitro) + admin (Next.js standalone).
 *
 * Proč: build command "npm run build" buildil JEN web; admin Next.js nikdy
 * nebyl součástí outputu. Proxy middleware očekával externí ADMIN_TARGET
 * (Render) nebo spawn "next start" — to na Vercel serverless nejde.
 *
 * Tento skript sestaví .vercel/output (Build Output API v3):
 *   functions/__server.func   → web (nitro node-server)
 *   functions/admin.func      → admin (Next.js standalone server)
 *   config.json rewrites      → /admin, /login, /api, /_next → admin.func
 *                              → vše ostatní → __server.func
 *
 * Spuštění: NODE_ENV=production node scripts/build-vercel.mjs
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminDir = path.join(root, "admin layer", "apps", "admin");
const outDir = path.join(root, ".vercel", "output");
const functionsDir = path.join(outDir, "functions");

function run(cmd, cwd = root, extraEnv = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production", ...extraEnv },
  });
}

console.log("=== 1/3 BUILD WEB (nitro vercel preset) ===");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
// NITRO_PRESET=vercel → nitro generuje .vercel/output (Build Output API v3)
run("npx vite build --logLevel error", root, { NITRO_PRESET: "vercel" });
// nitro vercel preset produkuje .vercel/output s __server.func + config.json

console.log("=== 2/3 BUILD ADMIN (Next.js standalone) ===");
if (!existsSync(path.join(adminDir, "next.config.ts"))) {
  console.error("CHYBA: admin neexistuje na", adminDir);
  process.exit(1);
}
// npm workspace command — `next` binárka se resolvuje z admin layer node_modules
// (Vercel nainstaluje admin layer přes installCommand; root nemá workspaces,
//  proto NEPOUŽÍVÁME `cd adminDir && npm run build`).
run('npm --prefix "admin layer" run build -w admin -- --no-lint', root);

const standaloneRoot = path.join(adminDir, ".next", "standalone");
const adminStandalone = path.join(standaloneRoot, "apps", "admin");
if (!existsSync(path.join(adminStandalone, "server.js"))) {
  console.error(
    'CHYBA: standalone server.js nenalezen — next.config vyžaduje output: "standalone"',
  );
  process.exit(1);
}

console.log("=== 3/3 SLOUČENÍ DO .vercel/output ===");
const adminFunc = path.join(functionsDir, "admin.func");
mkdirSync(adminFunc, { recursive: true });

// 1) node_modules + packages (root level standalone)
for (const dir of ["node_modules", "packages"]) {
  const src = path.join(standaloneRoot, dir);
  if (existsSync(src)) cpSync(src, path.join(adminFunc, dir), { recursive: true });
}
// 2) package.json root + apps/admin obsah (server.js) na vrchol admin.func
cpSync(path.join(standaloneRoot, "package.json"), path.join(adminFunc, "package.json"));
cpSync(adminStandalone, adminFunc, { recursive: true });

// BEZPEČNOST: Next standalone output tracing zkopíroval .env — secrets
// se na Vercel dodávají přes Environment Variables, nikdy ne přes output.
rmSync(path.join(adminFunc, ".env"), { force: true });
for (const f of [".env.local", ".env.production", ".env.production.local"]) {
  rmSync(path.join(adminFunc, f), { force: true });
}

// Vercel Build Output API v3 — povinný konfig funkce.
// Next.js standalone server: handler = server.js, Node.js launcher,
// runtime nodejs24.x (konzistentní s web funkcí od nitro).
const vcConfig = {
  runtime: "nodejs24.x",
  handler: "server.js",
  launcherType: "Nodejs",
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
};
writeFileSync(path.join(adminFunc, ".vc-config.json"), JSON.stringify(vcConfig, null, 2) + "\n");

// Vercel Build Output API v3: `.func` přípona NENÍ součástí URL funkce.
// functions/__server.func → dest "/__server"; functions/admin.func → dest "/admin".
// Routy pro /login, /api, /_next potřebují vlastní funkci (nebo symlink) —
// Vercel podporuje symlinky .func → .func (jeden server, víc URL mount bodů).
for (const alias of ["login", "api", "_next"]) {
  const link = path.join(functionsDir, `${alias}.func`);
  rmSync(link, { recursive: true, force: true });
  try {
    symlinkSync(path.basename(adminFunc), link, "dir");
  } catch {
    // fallback: fyzická kopie (Windows / bez symlink práv)
    cpSync(adminFunc, link, { recursive: true });
  }
}
// ověření symlinku — kopie by zdvojnásobila velikost outputu
for (const alias of ["login", "api", "_next"]) {
  const link = path.join(functionsDir, `${alias}.func`);
  try {
    // lstat: NEdereferencuje — kontrolujeme samotný link
    const st = lstatSync(link);
    if (!st.isSymbolicLink()) {
      console.warn(`[warn] ${alias}.func není symlink — použit fyzický fallback`);
    }
  } catch {
    /* fallback použit */
  }
}

// static assety adminu (Next.js /_next/static)
const nextStatic = path.join(adminDir, ".next", "static");
if (existsSync(nextStatic)) {
  mkdirSync(path.join(adminFunc, ".next"), { recursive: true });
  cpSync(nextStatic, path.join(adminFunc, ".next", "static"), { recursive: true });
}

// web static (assets) zůstává v .vercel/output/static (nitro to zajistil)
// → admin.func/.next/static je dostupné přes /_next/static → route dál

// config.json — přidat rewrites adminu PŘED filesystem/fallback
const configPath = path.join(outDir, "config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

// Vercel Build Output API v3: dest = URL mount pointu funkce, BEZ `.func`.
const adminRoutes = [
  { src: "/admin(?:/(.*))?", dest: "/admin" },
  { src: "/login(?:/(.*))?", dest: "/login" },
  { src: "/api(?:/(.*))?", dest: "/api" },
  { src: "/_next(?:/(.*))?", dest: "/_next" },
];

// odstranit nitro unlockery pro /admin /login /api /_next (dev-only)
config.routes = config.routes.filter(
  (r) =>
    ![
      "/admin/?(?<path>.+)",
      "/login/?(?<path>.+)",
      "/api/?(?<path>.+)",
      "/_next/?(?<path>.+)",
    ].includes(r.src),
);
// vložit admin rewrites na začátek (před filesystem + fallback __server)
config.routes.unshift(...adminRoutes);

writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

// odstranit nitro dev-unlocker funkce (routování nyní řeší config.json)
for (const legacy of ["admin", "api", "login", "_next"]) {
  rmSync(path.join(functionsDir, legacy), { recursive: true, force: true });
}

console.log("\n✅ BUILD HOTOVO");
console.log(`   - web:  ${path.join(functionsDir, "__server.func")}`);
console.log(`   - admin: ${adminFunc}`);
console.log(`   - routes: ${config.routes.length}`);
for (const r of config.routes) {
  if (r.src && r.dest) console.log(`     ${r.src}  →  ${r.dest}`);
}
