import type { ContentManifest } from "@admin/core";
import { basePages, baseProfessions, baseProjects, baseSite } from "./base.ts";

/**
 * Registr obsahu demo aplikace — business strana kontraktu.
 * Admin Layer tento soubor nikdy neimportuje; dostává jeho JSON
 * podobu (content/manifest.json) vyexportovanou přes export-manifest.ts.
 */
export const manifest: ContentManifest = {
  app: {
    name: "Demo Web",
    description: "Ukázková veřejná aplikace — obsah spravovaný Admin Layerem.",
    repo: "apps/demo-web",
  },
  locales: ["cs", "en"],
  kinds: [
    {
      kind: "project",
      label: "Projekty",
      description: "Portfoliové projekty zobrazené na domovské stránce.",
      idField: "slug",
      listField: "name",
      listColumns: ["name", "badge"],
      fields: [
        { type: "localized", name: "name", label: "Název", required: true, inner: { type: "text", name: "name", label: "Název" } },
        { type: "localized", name: "tagline", label: "Podtitulek", required: true, inner: { type: "textarea", name: "tagline", label: "Podtitulek" } },
        { type: "localized", name: "badge", label: "Označení", inner: { type: "text", name: "badge", label: "Označení" } },
        { type: "image", name: "poster", label: "Plakát", help: "Obrázek z media knihovny nebo URL." },
        { type: "url", name: "href", label: "Odkaz", required: true },
        { type: "boolean", name: "external", label: "Externí odkaz", help: "Otevírá se v novém okně." },
      ],
      baseItems: baseProjects,
    },
    {
      kind: "profession",
      label: "Profese",
      description: "Služby a profese prezentované na webu.",
      idField: "slug",
      fields: [
        { type: "text", name: "name", label: "Název", required: true },
        { type: "textarea", name: "desc", label: "Popis", required: true },
        {
          type: "multiselect",
          name: "services",
          label: "Služby",
          help: "Multi-select — více hodnot najednou.",
          options: [
            { value: "strih", label: "Střih" },
            { value: "vousy", label: "Vousy" },
            { value: "osetreni", label: "Ošetření" },
            { value: "barveni", label: "Barvení" },
          ],
        },
        { type: "repeater", name: "tags", label: "Štítky", itemLabel: "Štítek", fields: [{ type: "text", name: "tag", label: "Štítek" }] },
        {
          type: "object",
          name: "colors",
          label: "Barvy",
          fields: [
            { type: "text", name: "accent", label: "Akcent" },
            { type: "text", name: "glow1", label: "Glow 1" },
            { type: "text", name: "glow2", label: "Glow 2" },
          ],
        },
      ],
      baseItems: baseProfessions,
    },
    {
      kind: "page",
      label: "Stránky",
      description: "Jednoduché statické stránky.",
      idField: "slug",
      listField: "title",
      listColumns: ["title", "slug"],
      fields: [
        { type: "localized", name: "title", label: "Titul", required: true, inner: { type: "text", name: "title", label: "Titul" } },
        { type: "localized", name: "body", label: "Obsah", required: true, inner: { type: "textarea", name: "body", label: "Obsah" } },
        { type: "richtext", name: "bodyHtml", label: "Obsah (rich text)", help: "HTML formátování — tučné, kurzíva, seznamy." },
      ],
      baseItems: basePages,
    },
    {
      kind: "site",
      label: "Web",
      description: "Globální nastavení webu.",
      idField: "slug",
      listField: "siteName",
      fields: [
        { type: "text", name: "siteName", label: "Název webu", required: true },
        { type: "url", name: "baseUrl", label: "URL webu", required: true },
        { type: "localized", name: "description", label: "Popis (SEO)", inner: { type: "textarea", name: "description", label: "Popis" } },
        { type: "repeater", name: "keywords", label: "Klíčová slova", itemLabel: "Klíčové slovo", fields: [{ type: "text", name: "keyword", label: "Klíčové slovo" }] },
        {
          type: "object",
          name: "contact",
          label: "Kontakt",
          fields: [
            { type: "text", name: "phone", label: "Telefon" },
            { type: "text", name: "email", label: "E-mail" },
          ],
        },
      ],
      baseItems: baseSite,
    },
  ],
};
