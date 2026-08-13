import Link from "next/link";
import { listPages, listProfessions, listProjects } from "@/lib/repository";

/**
 * Domovská stránka demo aplikace — data přicházejí z repository,
 * která merge base obsah s publikovanými změnami z Admin Layeru.
 */
export default function HomePage() {
  const projects = listProjects();
  const professions = listProfessions();
  const pages = listPages();

  return (
    <main style={{ padding: "clamp(32px, 6vw, 80px) clamp(20px, 5vw, 48px)", maxWidth: 1040, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(32px, 6vw, 56px)", letterSpacing: "-0.03em", margin: "0 0 8px" }}>
        Weby a AI asistenti.
      </h1>
      <p style={{ fontSize: 18, color: "rgba(17,17,17,0.6)", margin: "0 0 48px" }}>
        Veřejná část běží čistě na vlastních datech + publikovaných změnách z Admin Layeru.
      </p>

      <h2 style={{ fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(17,17,17,0.4)" }}>
        Projekty
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, margin: "16px 0 48px" }}>
        {projects.map((project) => {
          const name = project.name as Record<string, string>;
          const tagline = project.tagline as Record<string, string>;
          const badge = project.badge as Record<string, string>;
          const href = String(project.href ?? "#");
          return (
            <a
              key={project.id}
              href={href}
              target={project.external ? "_blank" : undefined}
              rel="noreferrer"
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
                border: "1px solid rgba(17,17,17,0.1)",
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ fontSize: 17 }}>{name.cs}</strong>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(17,17,17,0.45)" }}>
                  {badge?.cs}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "rgba(17,17,17,0.6)", lineHeight: 1.5 }}>
                {tagline?.cs}
              </p>
            </a>
          );
        })}
      </div>

      <h2 style={{ fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(17,17,17,0.4)" }}>
        Profese
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "16px 0 48px" }}>
        {professions.map((prof) => {
          const tags = Array.isArray(prof.tags)
            ? (prof.tags as Record<string, unknown>[]).map((t) => String(t.tag ?? "")).filter(Boolean)
            : [];
          return (
            <div key={prof.id} style={{ border: "1px solid rgba(17,17,17,0.1)", borderRadius: 14, padding: 20 }}>
              <strong>{String(prof.name)}</strong>
              <p style={{ margin: "6px 0 10px", fontSize: 14, color: "rgba(17,17,17,0.6)" }}>{String(prof.desc)}</p>
              {tags.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  {tags.map((tag) => (
                    <span key={tag} style={{ fontSize: 12, background: "rgba(17,17,17,0.06)", padding: "3px 10px", borderRadius: 999 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(17,17,17,0.4)" }}>
        Stránky
      </h2>
      <nav style={{ display: "flex", gap: 24, marginTop: 16 }}>
        {pages.map((page) => {
          const title = page.title as Record<string, string>;
          return (
            <Link
              key={page.id}
              href={`/${String(page.slug ?? page.id)}`}
              style={{ color: "#111111", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(17,17,17,0.2)" }}
            >
              {title?.cs}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
