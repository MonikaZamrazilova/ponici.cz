import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Breadcrumbs, NotificationProvider, ShellLayout, Topbar, tokens, type Crumb } from "@admin/ui";
import { getSession } from "@/lib/auth";
import { adminConfig, coreModules } from "@/lib/config";
import { listProjects } from "@/lib/projects/registry";
import { collectSystemAlerts } from "@/lib/services/alertsService";
import { AdminUserMenu } from "@/components/AdminUserMenu";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileNav } from "@/components/MobileNav";
import { Nav, type NavItem } from "@/components/Nav";
import { PermissionsProvider } from "@/components/Permissions";
import { ProjectIndicator } from "@/components/ProjectIndicator";
import { SystemAlertsBar } from "@/components/SystemAlertsBar";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin (Owner)",
  editor: "Editor",
  viewer: "Viewer",
};

/**
 * Admin shell (A2.1) — konzistentní rám pro všechny moduly.
 * Modul = stránka do <main>; nav item, breadcrumb i indikátor projektu
 * se odvodí z pathname/registru — žádné layout hacky při přidávání.
 *
 * Server validuje session (store-backed) a role; UI guard jen reflektuje.
 */
export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login?expired=1");
  }

  const projects = listProjects();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/admin";
  const currentId = headersList.get("x-project-id");
  const current = projects.find((p) => p.identity.id === currentId) ?? null;

  // nav — zjednodušený režim: jen Nastavení + vstup do editace webu
  const navItems: NavItem[] = [];
  if (session.role === "admin" && coreModules.settings) {
    navItems.push({ href: "/admin/settings", label: "Nastavení" });
  }
  const webBase = adminConfig.webUrl.replace(/\/$/, "");
  navItems.push({
    href: webBase === "" ? "/?edit=1" : `${webBase}?edit=1`,
    label: "Vstup do edit web",
    external: true,
  });

  const crumbs = buildBreadcrumbs(pathname, projects);
  const alerts = await collectSystemAlerts();

  return (
    <>
      <a
        href="#admin-main"
        className="skip-link"
        style={{
          fontFamily: tokens.font.body,
        }}
      >
        Přeskočit na obsah
      </a>
      <ShellLayout
        sidebarClassName="max-md:hidden"
      contentClassName="max-md:!ml-0"
      sidebar={
        <>
          <div style={{ padding: "18px 20px 14px" }}>
            <Link
              href="/admin"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontWeight: 700, fontSize: 15, color: tokens.colors.primary }}>
                Admin Layer
              </span>
              <Badge tone={session.role === "viewer" ? "neutral" : session.role === "editor" ? "info" : "success"}>
                {ROLE_LABEL[session.role].split(" ")[0]}
              </Badge>
            </Link>
          </div>
          <div style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
            <Nav items={navItems} />
          </div>
          <div
            style={{
              padding: "12px 20px",
              borderTop: `1px solid ${tokens.colors.border}`,
            }}
          >
            <LogoutButton />
          </div>
        </>
      }
    >
      <Topbar
        left={
          <>
            <MobileNav items={navItems} />
            <Breadcrumbs items={crumbs} />
          </>
        }
        right={
          <>
            <ProjectIndicator
              name={current ? current.identity.name : "Všechny projekty"}
              active={Boolean(current)}
            />
            <AdminUserMenu role={session.role} roleLabel={ROLE_LABEL[session.role]} />
          </>
        }
      />
      <SystemAlertsBar alerts={alerts} />
      <main id="admin-main" style={{ flex: 1, padding: "24px clamp(16px, 3vw, 40px)", minWidth: 0 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <NotificationProvider>
            <PermissionsProvider>
              {children}
            </PermissionsProvider>
          </NotificationProvider>
        </div>
      </main>
      </ShellLayout>
    </>
  );
}

/**
 * Breadcrumbs odvozené z pathname — generické, fungují pro každý nový modul
 * bez úprav (známé segmenty se pojmenují, jiné se humanizují).
 */
function buildBreadcrumbs(
  pathname: string,
  projects: { identity: { id: string; name: string } }[]
): Crumb[] {
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Nastavení", href: "/admin/settings" }];

  if (segments.length === 0) return [{ label: "Nastavení" }];

  if (segments[0] === "projects") {
    const projectId = segments[1];
    const project = projects.find((p) => p.identity.id === projectId);
    crumbs.push({
      label: project?.identity.name ?? projectId,
      href: `/admin/projects/${projectId}`,
    });
    const rest = segments.slice(2);
    if (rest[0] === "kinds" && rest[1]) {
      crumbs.push({ label: rest[1], href: `/admin/projects/${projectId}/kinds/${rest[1]}` });
      if (rest[2]) {
        crumbs.push({ label: rest[2] === "new" ? "Nová položka" : decodeURIComponent(rest[2]) });
      }
    } else if (rest[0] === "audit") {
      crumbs.push({ label: "Audit", href: `/admin/projects/${projectId}/audit` });
    } else if (rest[0] === "media") {
      crumbs.push({ label: "Media", href: `/admin/projects/${projectId}/media` });
    }
  } else if (segments[0] === "settings") {
    crumbs.push({ label: "Nastavení", href: "/admin/settings" });
  } else {
    crumbs.push({ label: humanize(segments[0]) });
  }
  return crumbs;
}

function humanize(segment: string): string {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
