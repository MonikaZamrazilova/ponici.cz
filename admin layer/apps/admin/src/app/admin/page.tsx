import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /admin — vstupní brána: vede na Dashboard (rozcestník).
 * Nastavení NENÍ výchozí stránka — systémové věci jsou skryté.
 */
export default async function AdminEntryPage() {
  redirect("/admin/dashboard");
}
