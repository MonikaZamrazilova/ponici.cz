"use client";

import { useRouter } from "next/navigation";
import { Button, useNotifications } from "@admin/ui";
import { apiFetch } from "@/lib/clientApi";
import { Can } from "@/components/Permissions";

export function MediaDeleteButton({ projectId, id }: { projectId: string; id: string }) {
  const router = useRouter();
  const { notify } = useNotifications();

  async function remove() {
    if (!window.confirm("Smazat soubor?")) return;
    const json = await apiFetch<{ deleted?: boolean }>(`/api/projects/${projectId}/media/${id}`, {
      method: "DELETE",
    });
    if (json.ok) {
      notify({ type: "success", title: "Soubor smazán" });
      router.refresh();
    } else {
      notify({ type: "error", title: "Smazání selhalo", message: json.error.message });
    }
  }

  return (
    <Can permission="media:write">
      <Button size="sm" variant="danger" onClick={remove}>
        Smazat
      </Button>
    </Can>
  );
}
