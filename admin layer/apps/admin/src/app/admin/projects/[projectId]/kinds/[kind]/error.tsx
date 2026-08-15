"use client";

import { useEffect } from "react";
import { ErrorCard } from "@admin/ui";

/** Error state content manageru — retry bez opuštění shellu. */
export default function KindError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] kinds error:", error);
  }, [error]);

  return (
    <ErrorCard
      title="Obsah se nepodařilo načíst"
      message={error.message || "Neočekávaná chyba."}
      onRetry={reset}
    />
  );
}
