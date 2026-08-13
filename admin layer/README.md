# Admin Layer

Reusable admin vrstva pro správu obsahu napříč projekty (Recepce.tech, tvojevyska.cz, …).
Postavená na vzoru, který se v projektech osvědčil (password session, content registry,
draft → publish workflow, JSONL audit), ale **oddělená od business logiky veřejných webů**.

> Cíl A0.1 + A0.2: jednoznačná architektura; každý modul má jasnou odpovědnost; připojení
> dalšího webu = implementace/konfigurace adapteru, nikoli přepis adminu.

## Jak to funguje jedním odstavcem

Každý připojený web je v adminu jeden **ProjectAdapter** — typovaný kontrakt (identita,
auth strategie, explicitní capabilities, data porty). Web dodává `manifest.json`
(jaké druhy obsahu umí spravovat, schémata polí, base data). Admin je generická
multi-projekt aplikace: editors, seznamy, validace i media se generují z kontraktu.
Editace probíhá jako draft; `Publish` zapíše override do `published.json`, který si web
zabundluje při buildu. **Žádné `if (project === ...)` — chování řídí capabilities.**

```
┌──────────────────────────────┐   kontrakt (JSON)    ┌─────────────────────────────────┐
│  apps/demo-web  (web A)      │ ───────────────────▶ │  apps/admin (Next.js)           │
│  - manifest (registr)        │                      │  - přehled projektů             │
│  - repository (merge)        │   published.json     │  - seznamy + editors per projekt│
│  - žádný admin kód           │ ◀─────────────────── │  - draft → publish, audit, media│
├──────────────────────────────┤                      │  - registry adapterů (rozšíření)│
│  sandbox  (projekt B, data)  │ ───────────────────▶ │  - API: /api/projects/[id]/...  │
└──────────────────────────────┘                      └─────────────────────────────────┘
        ↑ business data                                    ↑ sdílené vrstvy
        └────────── @admin/core (kontrakt, porty, validace, auth primitiva)
        └────────── @admin/ui   (reusable UI primitiva)
```

## Integration Contract (A0.2)

Kontrakt mezi Admin Layerem a hostitelským webem je typovaná sada rozhraní v
`@admin/core/src/project.ts` + portů v `@admin/core/src/ports.ts`:

| Oblast kontraktu | Rozhraní / typ | Obsah |
|---|---|---|
| **Identita projektu** | `ProjectIdentity` | id, name, description, repo, homepage |
| **Content entities** | `ContentManifest` → `EntityKindDef[]` | druhy obsahu, schémata polí, locales, baseItems |
| **CRUD capabilities** | `ProjectContentCapability` | create / edit / publish / discard / delete (explicitní politika; delete jen pro položky vytvořené v adminu) |
| **Media capabilities** | `ProjectMediaCapability` | enabled, maxSizeMb, allowedMimeTypes |
| **Publishing capabilities** | `ProjectPublishCapability` | model: `overrides` \| `webhook` \| `none`, volitelný hookUrl |
| **Authentication strategy** | `ProjectAuth` | jak se admin připojuje k datům projektu (`none` \| `shared-secret`) |
| **Permissions** | `Permission` / `hasPermission` | role admina → oprávnění (content:read/write, audit:read, media:read/write) |
| **Environment configuration** | `adminEnvSchema` (zod) | ADMIN_* proměnné; fail-fast validace |
| **API / data adapter** | `ProjectAdapter` ports | manifest, drafts, published, audit, media?, deploy? |

Pravidla:
- **Capabilities jsou politika, ne podmínky.** Služby i UI se řídí
  `adapter.capabilities.*` — 403 v API, skrytá tlačítka v UI. Nic neví o konkrétním projektu.
- **Porty jsou hranice.** Výměna JSON úložiště za DB/HTTP = nová implementace portu.
- **Secret se nikdy nedostane na klienta** — `ProjectAuth.secret` je server-only.

## Repozitář

```
admin layer/
├── packages/
│   ├── core/          @admin/core   kontrakt, porty, validace, auth, config (bez Next.js)
│   └── ui/            @admin/ui     reusable UI primitiva + schema-driven FieldInput
├── apps/
│   ├── admin/         admin aplikace (Next.js) — vrstvy viz níže
│   └── demo-web/      ukázkový veřejný web — dokazuje oddělení vrstev
└── content/projects/  data per projekt (git-trackovaná struktura)
    ├── demo-web/      manifest.json, store/, audit/, media/
    └── sandbox/       druhý projekt (jiné capabilities)
```

## Vrstvy a odpovědnosti

| Vrstva | Odpovědnost | Kde |
|---|---|---|
| **Admin UI** | stránky, shell, projekt-scoped navigace | `apps/admin/src/app/admin/**`, `src/components` |
| **UI primitiva** | reusable komponenty + design tokeny | `packages/ui/src` |
| **Auth / autorizace** | session token, role → oprávnění | `@admin/core/src/auth.ts`, `apps/admin/src/lib/auth.ts`, `src/middleware.ts` |
| **Sessions** | podepsaná cookie + server-side store (TTL, revokace) | `apps/admin/src/lib/storage/sessionStore.ts` |
| **Project adapter / registry** | typovaný kontrakt projektu; jediné rozšiřovací místo | `apps/admin/src/lib/projects/registry.ts`, `fileAdapter.ts` |
| **Application services** | use-cases: save / publish / discard, audit, media (per projekt) | `apps/admin/src/lib/services/*` |
| **Data access** | implementace portů nad JSON/JSONL/filesystém | `apps/admin/src/lib/storage/*` |
| **Integration adapters** | zdroj kontraktu, deploy webhook | `apps/admin/src/lib/adapters/*` |
| **Validation** | zod z manifestu — kontrakt i entity | `@admin/core/src/validation.ts` |
| **Audit / logging** | záznam každé akce (append-only, per projekt) | `@admin/core/src/audit.ts`, `services/auditService.ts` |
| **Configuration** | env schema + resolved paths | `@admin/core/src/config.ts`, `apps/admin/src/lib/config.ts` |

## Životní cyklus obsahu (draft vs published, A5.1)

1. Web vyexportuje kontrakt: `npm run manifest:export` → `content/projects/<id>/manifest.json`.
2. Admin načte manifest přes `ManifestSourcePort` a genericky vykreslí editors.
3. Uložení → validace (zod) → `drafts.json` → audit. **Draft web nikdy nevidí.**
4. Editor ukazuje tři verze (taby): **Upravit** (form, změněná pole mají chip),
   **Publikovaná verze** (base + published override, bez draftu) a
   **Náhled** (co web uvidí po publishi). „Vrátit bez publikování“ = discard → reset
   na poslední publikovanou verzi.
5. `Publikovat` → přesun do `published.json` + audit + volitelný deploy hook (per projekt).
6. Web si při buildu zabundluje `published.json` a merguje s vlastními base daty
   (`apps/demo-web/src/lib/repository.ts`). Publish a deploy jsou oddělené kroky —
   **změna v adminu nemění web, dokud neproběhne explicitní publish + build.**

## Připojení dalšího webu (adapter, ne přepis)

1. **Web**: závislost `@admin/core` (jen typy) → `src/manifest/index.ts` (kinds, fields,
   baseItems) → exportní skript → repository mergující `published.json`.
2. **Admin**: do `apps/admin/src/lib/projects/registry.ts` přidejte:
   - `FileProjectConfig` záznam (id, name, capabilities) — nebo vlastní `ProjectAdapter`
     factory pro jiné úložiště (HTTP, DB),
   - id do `ADMIN_PROJECTS` v `.env`,
   - volitelně `ADMIN_PROJECT_HOOK_URLS` pro deploy webhook.

To je celé. Nové pole/typ = 3 místa (FieldSchema + zodFromField + FieldInput), viz níže.

## Konfigurace (apps/admin/.env)

| Proměnná | Význam | Výchozí |
|---|---|---|
| `ADMIN_PASSWORD` | heslo role admin (Owner/Admin) | — |
| `ADMIN_EDITOR_PASSWORD` | volitelné heslo role editor | — |
| `ADMIN_VIEWER_PASSWORD` | volitelné heslo role viewer (read-only) | — |
| `ADMIN_PROJECTS` | aktivní projekty (id z registry, čárkami) | všechny registrované |
| `ADMIN_PROJECTS_ROOT` | kořen dat projektů | `<workspace>/content/projects` |
| `ADMIN_PROJECT_HOOK_URLS` | deploy webhooky per projekt (JSON) | — |

Struktura dat projektu: `<root>/<projectId>/{manifest.json, store/{drafts,published}.json, audit/audit.jsonl, media/}`.

## Auth & session (A1.1)

- **Cookie**: `admin_session` — httpOnly, sameSite=lax, secure v produkci, `maxAge` 7 dní.
  Hodnota je HMAC-SHA256 podepsaný payload `{ sid, expiresAt, role }` (klíč odvozený z hesla) —
  tamper-proof, verifikovatelný i na edge (middleware).
- **Server-side session store**: `content/.sessions/sessions.jsonl` (gitignored) — TTL
  a **revokace (logout)** mají pravdu tady. Vypršené záznamy se mažou lazy + při loginu.
- **Vrstvená ochrana**: middleware (rychlá krypto-kontrola) → shell layout
  (store-backed validace) → každý API handler `requireSession()`/`requirePermission()`.
  UI guard (přesměrování na 401) je jen UX, ne ochrana.
- **Expired session**: stránky → `/login?expired=1` s hláškou; API → 401 JSON;
  client helper `apiFetch` přesměruje na login.
- **Žádné secrets v client bundle** — hesla i klíč derivace žijí výhradně server-side
  (`server-only`), ověřeno v built client chunks.

## Permission model (A1.2)

Centralizovaný model v `@admin/core/src/auth.ts` — jeden zdroj pravdy pro API i UI:

| Role | Oprávnění |
|---|---|
| **admin** (Owner/Admin) | vše (content, media, settings:read/write, audit) |
| **editor** | content:read/create/update/delete/publish, media:read/write, audit:read |
| **viewer** | content:read, media:read, audit:read |

Role se určí podle hesla použitého při loginu (`ADMIN_PASSWORD` / `ADMIN_EDITOR_PASSWORD` /
`ADMIN_VIEWER_PASSWORD`) a je podepsaná v session payloadu (nelze ji padělat).

- **Enforcement je vždy server-side**: API handlery `requirePermission()` /
  `requireAnyPermission()` (save → create|update, publish → content:publish,
  discard → content:delete, media → media:read/write, settings → settings:read,
  stránky → `canPermission()` s `<Forbidden />`).
- **UI jen reflektuje**: `PermissionsProvider` / `usePermissions()` / `<Can permission="…">`
  (session role z `GET /api/auth/session`) skrývá tlačítka a nav položky.
  Nikdy není jedinou ochranou.
- **settings:write** je definované pro budoucí mutace nastavení; dnes existuje
  read-only stránka `/admin/settings` + `GET /api/settings` (jen metadata, žádné secrets).

## Form system (A4.1)

Konzistentní primitiva v `@admin/ui` (`useForm`, `useUnsavedGuard`, `FieldInput`):

- **Field typy**: text, textarea, number, boolean, select, **multiselect**,
  URL, image/media reference, **richtext** (toolbar B/I/U/seznam, HTML),
  object, repeater, localized.
- **Client validace** = stejná funkce jako server (`validateEntity` z `@admin/core` —
  zod z manifestu) → pravidla nikde neduplikovaná. **Server se nikdy nespoléhá
  jen na client validaci** (každý save validuje znovu).
- **Dirty state** (`useForm.dirty`, badge "Neuložené změny").
- **Unsaved changes warning** (`useUnsavedGuard`): beforeunload + potvrzení
  při kliku na odkaz v rámci adminu.
- **Submit/loading** (`submitting`), **success/error feedback** (jednotný result banner).
- Všechny admin formuláře (ItemForm, LoginForm) běží na stejných primitivech.

## API kontrakt (apps/admin)

Všechny mutace vrací `ApiResult<T>`: `{ ok: true, data }` nebo `{ ok: false, error: { message, fields? } }`.
Operace respektují capabilities projektu (odpověď 403).

| Endpoint | Metoda | Účel |
|---|---|---|
| `/api/auth/login`, `/api/auth/logout` | POST | session |
| `/api/auth/session` | GET | role + oprávnění (jen UI reflexe) |
| `/api/projects/[projectId]/items/[kind]/[id]` | POST | `{ action: "save"\|"publish"\|"discard", data? }` |
| `/api/projects/[projectId]/media` | GET / POST | seznam / upload (file field: `file`) |
| `/api/projects/[projectId]/media/[id]` | GET / DELETE | soubor / smazání |
| `/api/settings` | GET | metadata konfigurace (settings:read, žádné secrets) |

## Rozšiřování

- **Nový field typ** → `FieldSchema` v `@admin/core/src/manifest.ts` + `zodFromField`
  + větev v `FieldInput` (`packages/ui/src/FieldInput.tsx`).
- **Databáze místo JSON souborů** → nová implementace portů ve `storage/` nebo
  vlastní `ProjectAdapter` factory (příklad: HTTP + `ProjectAuth.shared-secret`).
- **Více rolí** → rozšířit `Role`/`ROLE_PERMISSIONS` v `@admin/core/src/auth.ts`.

## Konfigurace: core vs project (A6.1)

Oddělené dvě vrstvy konfigurace:

| Vrstva | Životní cyklus | Obsah | Kde |
|---|---|---|---|
| **Core (admin)** | env-driven, fail-fast | auth provider (`password` + hesla rolí), session TTL, core moduly (`ADMIN_MODULES`), kořen projektů, aktivní projekty, deploy hooky | `@admin/core/src/config.ts`, `apps/admin/src/lib/config.ts` |
| **Project** | registry.ts (adapter boundary) | identita, **moduly** (content/media/audit), **feature flagy** (preview, publishedVersion, richText, multiselect), **media provider** (filesystem/none), capability, publish model | `packages/core/src/project.ts` (`ProjectConfig`), `apps/admin/src/lib/projects/registry.ts` |

Moduly a feature flagy se vynucují na třech místech: **nav** (skrytí sekcí),
**stránky/API** (disabled state / 403) a **UI** (taby, fallback polí — rich text → textarea,
multi-select → čárkami oddělený text). Vypnutí modulu = řádek v konfiguraci,
ne editace komponent.

Settings stránka a `/api/settings` renderují **registr nastavení odvozený z konfigurace**
(`settingsService.collectSettings`) — žádné hardcoded řádky.

## Notifikace (A7.1)

- **Transient toasty** (`@admin/ui/src/notifications.tsx`): `NotificationProvider` +
  `useNotifications()` — typy success / warning / error / info, auto-dismiss dle typu
  (4–10 s), ruční zavření, max 4 najednou. Stack je fixed v rohu, `pointer-events` jen
  na kartách — **neblokuje běžnou práci**. Všechny akce (uložit/publikovat/zahodit/smazat,
  media upload/delete) hlásí výsledek přes toasty.
- **Persistentní systémové alerty** (`alertsService.collectSystemAlerts`): odvozené ze
  skutečného stavu — admin bez hesla, nečitelný kontrakt projektu, nefunkční session store,
  nepublikované drafty. Banner pod topbarem (`SystemAlertsBar`), mizí, když podmínka skončí.
- Oprávnění: alerty neobsahují secrets; settings nevyžadují.

## Audit log (A8.1)

**Centrální append-only log** — `content/audit/central.jsonl` (git-trackovaný), jeden
zdroj pravdy pro všechny události:

| Akce | Kdy |
|---|---|
| `login` / `logout` / `failed_login` | přihlášení/odhlášení (actor = role, `anonymous` při neúspěchu) |
| `create` / `update` / `delete` | draft operace (actor = role) |
| `publish` / `rollback` | publikování / vrácení na base verzi |
| `settings` | budoucí runtime změny nastavení (dnes env-static) |
| `permission` | odmítnuté mutace (403) — kdo, co a jaké oprávnění mu chybělo |

Každá událost: `actor` (uživatel/role), `projectId` (`core` = globální), `entityKind`,
`entityId`, `action`, `timestamp`, `summary`.

- **Dohledatelnost**: `/admin/audit` (globální log) a `/admin/projects/[id]/audit`
  (filtrované na projekt) — filtry podle **akce, uživatele, entity a fulltextu** (ID, popis).
- **Rollback** = smazání published override base položky (web se vrátí k vlastnímu
  obsahu); tlačítko v tabu „Publikovaná verze“ editoru.
- Permission model je env-static (není co měnit za běhu) — role-scoped operace
  dělají i tak každou akci dohledatelnou podle uživatele.

## Accessibility (A9.1)

- **Formuláře**: každá kontrola má `<label htmlFor>` + `id` (useId), skupiny
  (multiselect, localized, object, repeater) jako `fieldset`/`legend`, rich text
  jako `role="textbox"` s pojmenovaným toolbarém (aria-label).
- **Keyboard**: globální `:focus-visible` outline (odstraněn `outline: none`
  z inputů), skip link "Přeskočit na obsah", mobilní drawer s focusem
  na zavírací tlačítko + Escape, UserMenu s Escape/outside-click.
- **Dialogy**: žádné vlastní modaly — potvrzovací dialogy jsou nativní
  (`window.confirm`, přístupné screen readerům).
- **Contrast**: textové barvy tokenů ≥ 4.5:1 (WCAG AA), `prefers-reduced-motion`
  respektováno (animace vypnuté).
- **Semantics/aria jen kde je potřeba**: nav s `aria-label` + `aria-current="page"`,
  tablist/tab/tabpanel v editoru, `role="status"` u toastů, `aria-live="polite"`
  u chyb přihlášení, `region` u systémových alertů, `scope="col"` v tabulkách.
- Hlavní flows (login, list, editor, publish, media, audit) jsou ovladatelné
  klávesnicí a formuláře mají dostupné labels/stavy.

## Security (A9.1 audit)

| Oblast | Opatření |
|---|---|
| **Auth** | podepsaná session cookie (HMAC, expiry) + server-side session store (revokace); login rate limit 10/15 min/IP (429); failed_login audit |
| **Authorization** | každý handler `requirePermission`/`requireAnyPermission` (role), capability projektu, modulová gate — viewer nemůže mutovat (403) |
| **IDOR** | všechny operace scoped přes adapter projektu (adapter = vlastní store); cizí kind/mediální soubor → 404/403 |
| **CSRF** | SameSite=Lax cookie + `assertSameOrigin` na všech mutacích (items POST, media POST/DELETE, logout) — cizí Origin → 403 |
| **XSS** | žádné `dangerouslySetInnerHTML`; React escapuje; rich text **sanitizován serverově** při save/publish (`sanitizeRichText`, allowlist tagů, bez skriptů/event handlerů/javascript: URL) |
| **File upload** | náhodné UUID názvy (žádný path traversal), mime allowlist, velikostní limit (capability), `nosniff` |
| **Payloads** | content-length capy: items 1 MB (413), login 16 KB, media 20 MB |
| **Secrets** | server-only moduly; ověřeno: žádný secret v client bundle; settings API vrací jen metadata |
| **Headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` |
| **Boundaries** | data access a auth výhradně server-side; client jen UI reflexe (Can/usePermissions) |

## Nasazení (A12.1)

```bash
# 1. build
npm ci
npm run build -w admin          # produkční build adminu

# 2. env (apps/admin/.env v produkci — viz .env.example)
#    ADMIN_PASSWORD / ADMIN_EDITOR_PASSWORD / ADMIN_VIEWER_PASSWORD
#    ADMIN_PROJECTS, ADMIN_PROJECTS_ROOT, ADMIN_PROJECT_HOOK_URLS (JSON)
#    ADMIN_MODULES (volitelně), ADMIN_SESSION_TTL_MS (volitelně)

# 3. start
npm run start -w admin           # next start; nebo docker + PM2/systemd
```

- **Health checks**: `GET /api/health` (veřejný, bez secrets) — `200 ok` / `503 degraded`
  (podle validnosti kontraktů projektů). Pro orchestrátory/monitoring.
- **Backup**: `content/` (manifesty, drafts, published, central audit) je **git-trackovaná
  data** — backup = git push; obnova = git checkout + rebuild. `content/.sessions/`
  a `content/projects/*/media/` jsou runtime (gitignored) — media se obnoví re-uploadem,
  sessiony se vytvoří znovu.
- **Rollback strategie**:
  1. per-item: tlačítko „Vrátit na base verzi“ (rollback) v adminu → web se vrátí k base;
  2. infra: `git revert` publikovaných override + redeploy (build je source of truth);
  3. deploy: `ADMIN_PROJECT_HOOK_URLS` = webhook, který po publishi spustí rebuild webu.
- **Migrations**: data jsou JSON/JSONL soubory — migrace = skript v `scripts/`.
  Historická: per-projekt audit soubory → centrální `content/audit/central.jsonl`
  (A8.1). Session: deterministický token → podepsaná cookie + session store (A1.1).
- **Logging**: aplikace loguje chyby (`console.error` + error boundaries), auditní
  události do centrálního logu; neúspěšné přihlášení a odmítnuté mutace jsou
  dohledatelné v audit logu.
- **Secure defaults**: vše je defaultně vypnuté nebo minimální — bez hesla není admin;
  moduly jsou zapnuté jen pokud je to v konfiguraci; secrets nikdy na klienta.

## Reusability Gate (A12.2)

Audit proveden — kontrolováno v kódu i prakticky (připojení Ponycedecka.cz a Sandboxu):

| Hledaný anti-vzor | Výsledek |
|---|---|
| project-specific conditionals v core | **0** — core nezná žádný projekt |
| hardcoded názvy (demo-web/sandbox/ponycedecka) | jen v `registry.ts` (extension point) + env |
| hardcoded routes / content types | 0 v core; routes jsou generické (`[projectId]`, `[kind]`) |
| duplicitní CRUD logika | 1× `ContentList` + 1× `ItemForm` + 1× API route pro všechny projekty |
| předpoklady o databázi / auth provideru / media | žádné — jen porty (`ports.ts`), konkrétní implementace = adapter |
| připojení 2. projektu prakticky | Ponycedecka.cz + Sandbox plně funkční (dashboard, CRUD, media, publish, audit) bez změny core |

**Pravidlo:** vše, co patří projektu, žije v `ProjectConfig` (registry) + kontraktu
(manifest.json). Vlastní UI = vlastní `ProjectAdapter` factory, nikdy podmínky v core.

## Spuštění

```bash
npm install
npm run manifest:export   # vygeneruje kontrakt demo-webu
npm run dev               # admin na :3000, demo-web na :3100
npm run typecheck
npm run build
```
