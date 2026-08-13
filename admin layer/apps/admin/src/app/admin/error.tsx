"use client";

import { useEffect } from "react";
import { ErrorCard } from "@admin/ui";

/** Error state shellu — modul spadl, shell zůstává funkční. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] page error:", error);
  }, [error]);

  return (
    <ErrorCard
      title="Stránka selhala"
      message={error.message || "Neočekávaná chyba při renderování stránky."}
      onRetry={reset}
    />
  );
}
