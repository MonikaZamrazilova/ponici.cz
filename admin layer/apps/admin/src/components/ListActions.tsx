"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, useNotifications } from "@admin/ui";
import { apiFetch } from "@/lib/clientApi";
import { Can } from "@/components/Permissions";

export function ListActions({
  projectId,
  kind,
  id,
  hasDraft,
  canPublish,
  canDiscard,
  canDelete,
}: {
  projectId: string;
  kind: string;
  id: string;
  hasDraft: boolean;
  canPublish: boolean;
  canDiscard: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [busy, setBusy] = useState(false);

  async function run(action: "publish" | "discard" | "delete") {
    const confirmText =
      action === "publish"
        ? "Publikovat tento obsah?"
        : action === "delete"
          ? "Smazat položku natrvalo? Tuto akci nelze vrátit."
          : "Zahodit draft?";
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const json = await apiFetch<{ published?: boolean } | { discarded?: boolean } | { deleted?: boolean }>(
        `/api/projects/${projectId}/items/${kind}/${id}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      if (!json.ok) {
        notify({ type: "error", title: "Operace selhala", message: json.error.message });
      } else {
        notify({
          type: action === "delete" ? "warning" : "success",
          title: action === "publish" ? "Publikováno" : action === "delete" ? "Položka smazána" : "Draft zahozen",
        });
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const actions = [];
  if (hasDraft && canPublish) actions.push(["publish", "Publikovat"] as const);
  if (hasDraft && canDiscard) actions.push(["discard", "Zahodit"] as const);
  if (canDelete) actions.push(["delete", "Smazat"] as const);

  if (actions.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {actions.map(([action, label]) => (
        <Can
          key={action}
          permission={action === "publish" ? "content:publish" : action === "delete" ? "content:delete" : "content:delete"}
        >
          <Button
            size="sm"
            variant={action === "delete" ? "danger" : action === "publish" ? "primary" : "secondary"}
            onClick={() => run(action)}
            disabled={busy}
          >
            {label}
          </Button>
        </Can>
      ))}
    </div>
  );
}
