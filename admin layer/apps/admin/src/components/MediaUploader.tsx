"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonStyle, useNotifications } from "@admin/ui";
import { apiFetch } from "@/lib/clientApi";
import { Can } from "@/components/Permissions";

export function MediaUploader({ projectId, accept }: { projectId: string; accept: string }) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const json = await apiFetch<unknown>(`/api/projects/${projectId}/media`, {
        method: "POST",
        body: fd,
      });
      if (!json.ok) {
        notify({ type: "error", title: "Nahrání se nepovedlo", message: json.error.message });
      } else {
        notify({ type: "success", title: "Soubor nahrán" });
      }
      router.refresh();
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <Can permission="media:write">
      <label style={{ ...buttonStyle("primary"), cursor: "pointer", display: "inline-flex" }}>
        {busy ? "Nahrávám…" : "+ Nahrát soubor"}
        <input
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={onFile}
          disabled={busy}
        />
      </label>
    </Can>
  );
}
