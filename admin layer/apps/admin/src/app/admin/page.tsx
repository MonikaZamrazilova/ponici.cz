import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Zjednodušený režim adminu — jediná stránka je Nastavení.
 * /admin (původní přehled) vede rovnou do Nastavení.
 */
export default async function DashboardPage() {
  redirect("/admin/settings");
}
