#!/usr/bin/env bash
# A11.2 — End-to-End Admin QA
# Projede admin jako reálný uživatel: role Admin/Editor/Viewer, login, dashboard,
# CRUD, media, draft/publish/rollback, settings, audit, logout, expired session,
# desktop + mobile.
#
# Spuštění:  npm run e2e   (potřebuje ADMIN_*_PASSWORD v apps/admin/.env)
set -u
ADMIN_BASE="http://127.0.0.1:3000"
ADMIN_PW=$(grep '^ADMIN_PASSWORD=' apps/admin/.env | head -1 | cut -d= -f2)
EDITOR_PW=$(grep '^ADMIN_EDITOR_PASSWORD=' apps/admin/.env | head -1 | cut -d= -f2)
VIEWER_PW=$(grep '^ADMIN_VIEWER_PASSWORD=' apps/admin/.env | head -1 | cut -d= -f2)

FAIL=0
COOKIE_DIR=$(mktemp -d)
cleanup() { pkill -f "next dev" 2>/dev/null; pkill -f next-server 2>/dev/null; rm -rf "$COOKIE_DIR" content/.sessions; }
trap cleanup EXIT

check() { # check <popis> <očekávaný> <skutečný>
  if [ "$2" = "$3" ]; then
    echo "  ✓ $1"
  else
    echo "  ✗ $1 (očekáváno: $2, skutečnost: $3)"
    FAIL=1
  fi
}
login() { # login <name> <password> -> nastaví cookie
  curl -s -c "$COOKIE_DIR/$1.txt" -X POST "$ADMIN_BASE/api/auth/login" -H "content-type: application/json" -d "{\"password\":\"$2\"}" -o /dev/null -w "%{http_code}"
}
api() { # api <cookie> <method> <path> <body?>
  if [ -n "${4:-}" ]; then
    curl -s -b "$COOKIE_DIR/$1.txt" -X "$2" "$ADMIN_BASE$3" -H "content-type: application/json" -d "$4" -o /dev/null -w "%{http_code}"
  else
    curl -s -b "$COOKIE_DIR/$1.txt" -X "$2" "$ADMIN_BASE$3" -o /dev/null -w "%{http_code}"
  fi
}

echo "== reset dat"
printf '{}\n' > content/projects/demo-web/store/drafts.json
printf '{}\n' > content/projects/demo-web/store/published.json
printf '{}\n' > content/projects/demo-web/store/drafts.json
rm -f content/projects/demo-web/media/* ; touch content/projects/demo-web/media/.gitkeep

echo "== boot serverů"
npm run dev:admin > /tmp/e2e-admin.log 2>&1 &
npm run dev:demo > /tmp/e2e-demo.log 2>&1 &
sleep 24

echo "== AUTH"
check "login bez cookie → redirect" "307" "$(curl -s -o /dev/null -w '%{http_code}' "$ADMIN_BASE/admin")"
check "API bez cookie → 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' "$ADMIN_BASE/api/projects/demo-web/media")"
check "špatné heslo → 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$ADMIN_BASE/api/auth/login" -H 'content-type: application/json' -d '{"password":"spatne"}')"
check "login admin → 200" "200" "$(login admin "$ADMIN_PW")"
check "login editor → 200" "200" "$(login editor "$EDITOR_PW")"
check "login viewer → 200" "200" "$(login viewer "$VIEWER_PW")"

echo "== DASHBOARD (role admin)"
check "dashboard 200" "200" "$(api admin GET /admin)"
check "systémové alerty region (prázdný stav → 0)" "0" "$(curl -s -b "$COOKIE_DIR/admin.txt" "$ADMIN_BASE/admin" | grep -c 'Systémová oznámení' || true)"

echo "== CONTENT CRUD (admin)"
BODY='{"action":"save","data":{"slug":"e2e-item","name":{"cs":"E2E","en":"E2E"},"tagline":{"cs":"t","en":"t"},"badge":{"cs":"b","en":"b"},"poster":"","href":"https://x.cz","external":false}}'
check "web neukazuje draft (před publishem → 0)" "0" "$(curl -s http://127.0.0.1:3100/ | grep -c 'E2E' || true)"
check "create draft → 200" "200" "$(api admin POST /api/projects/demo-web/items/project/e2e-item "$BODY")"
check "draft stále neukazuje web (0)" "0" "$(curl -s http://127.0.0.1:3100/ | grep -c 'E2E' || true)"
check "validace blokuje (title prázdný) → 400" "400" "$(api admin POST /api/projects/demo-web/items/project/e2e-item '{"action":"save","data":{"slug":"e2e-item","name":{"cs":"","en":""},"tagline":{"cs":"t","en":"t"},"badge":{"cs":"b","en":"b"},"poster":"","href":"https://x.cz","external":false}}')"
check "publish → 200" "200" "$(api admin POST /api/projects/demo-web/items/project/e2e-item '{"action":"publish"}')"
check "published.json obsahuje položku" "1" "$(grep -o '"id": "e2e-item"' content/projects/demo-web/store/published.json | wc -l | tr -d ' ')"
check "web ukazuje publikovaný obsah (dev → 1)" "1" "$(curl -s http://127.0.0.1:3100/ | grep -c 'E2E' || true)"
check "delete admin-owned položky → 200" "200" "$(api admin POST /api/projects/demo-web/items/project/e2e-item '{"action":"delete"}')"
check "base položka nelze smazat → 400" "400" "$(api admin POST /api/projects/demo-web/items/project/barberman '{"action":"delete"}')"
check "rollback base položky → 200" "200" "$(api admin POST /api/projects/demo-web/items/project/barberman "$BODY" > /dev/null; api admin POST /api/projects/demo-web/items/project/barberman '{"action":"publish"}' > /dev/null; api admin POST /api/projects/demo-web/items/project/barberman '{"action":"rollback"}')"
check "published po rollbacku bez barberman" "0" "$(grep -o '"id": "barberman"' content/projects/demo-web/store/published.json | wc -l | tr -d ' ')"

echo "== MEDIA (admin)"
check "media list → 200" "200" "$(api admin GET /api/projects/demo-web/media)"
check "media upload → 201" "201" "$(curl -s -b "$COOKIE_DIR/admin.txt" -X POST "$ADMIN_BASE/api/projects/demo-web/media" -F 'file=@/tmp/test.png;type=image/png' -o /dev/null -w '%{http_code}')"
check "media upload mimo povolené typy → 400" "400" "$(curl -s -b "$COOKIE_DIR/admin.txt" -X POST "$ADMIN_BASE/api/projects/demo-web/media" -F 'file=@package.json;type=application/json' -o /dev/null -w '%{http_code}')"

echo "== ROLE MATRIX"
check "viewer save → 403" "403" "$(api viewer POST /api/projects/demo-web/items/project/barberman "$BODY")"
check "viewer publish → 403" "403" "$(api viewer POST /api/projects/demo-web/items/project/barberman '{"action":"publish"}')"
check "viewer media upload → 403" "403" "$(curl -s -b "$COOKIE_DIR/viewer.txt" -X POST "$ADMIN_BASE/api/projects/demo-web/media" -F 'file=@/tmp/test.png;type=image/png' -o /dev/null -w '%{http_code}')"
check "viewer settings → 403" "403" "$(api viewer GET /api/settings)"
check "viewer audit stránka → 200 (audit:read)" "200" "$(api viewer GET /admin/projects/demo-web/audit)"
check "editor settings → 403" "403" "$(api editor GET /api/settings)"
check "editor save → 200" "200" "$(api editor POST /api/projects/demo-web/items/project/barberman "$BODY")"
check "editor publish → 200" "200" "$(api editor POST /api/projects/demo-web/items/project/barberman '{"action":"publish"}')"

echo "== SETTINGS / AUDIT (admin)"
check "settings API → 200 + auth.provider řádek" "1" "$(curl -s -b "$COOKIE_DIR/admin.txt" "$ADMIN_BASE/api/settings" | grep -c '"key":"auth.provider"' || true)"
check "globální audit 200" "200" "$(api admin GET /admin/audit)"
check "audit log obsahuje publish (≥1)" "1" "$([ $(grep -c '"action":"publish"' content/audit/central.jsonl) -ge 1 ] && echo 1 || echo 0)"
check "audit log obsahuje login (≥3)" "1" "$([ $(grep -c '"action":"login"' content/audit/central.jsonl) -ge 3 ] && echo 1 || echo 0)"

echo "== EXPIRED SESSION"
OLD_COOKIE=$(grep admin_session "$COOKIE_DIR/admin.txt" | awk '{print $NF}')
check "logout → 200" "200" "$(api admin POST /api/auth/logout)"
check "cookie po logoutu neplatí → API 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: admin_session=$OLD_COOKIE" "$ADMIN_BASE/api/projects/demo-web/media")"
EXPIRED_LOC=$(curl -s -o /dev/null -w '%{redirect_url}' -H "Cookie: admin_session=$OLD_COOKIE" "$ADMIN_BASE/admin")
check "cookie po logoutu neplatí → stránka expired=1" "1" "$(echo "$EXPIRED_LOC" | grep -c 'expired=1' || true)"

echo "== DESKTOP / MOBILE"
login admin "$ADMIN_PW" > /dev/null
D=$(curl -s -b "$COOKIE_DIR/admin.txt" "$ADMIN_BASE/admin" 2>/dev/null || true)
check "desktop: sidebar má max-md:hidden class" "1" "$(echo "$D" | grep -c 'max-md:hidden')"
check "mobile: hamburger přítomen" "1" "$(echo "$D" | grep -c 'aria-label="Otevřít menu"')"
check "skip link" "1" "$(echo "$D" | grep -c 'Přeskočit na obsah')"
check "tabs editoru (tablist)" "1" "$(curl -s -b "$COOKIE_DIR/admin.txt" "$ADMIN_BASE/admin/projects/demo-web/kinds/project/barberman" | grep -c 'role="tablist"')"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "✅ E2E: všechny kontroly prošly"
else
  echo "❌ E2E: selhaly kontroly (viz výše)"
  exit 1
fi
