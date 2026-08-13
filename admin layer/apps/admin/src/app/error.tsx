"use client";

import { useEffect } from "react";
import { ErrorCard } from "@admin/ui";

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] root error:", error);
  }, [error]);

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <ErrorCard title="Aplikace selhala" message={error.message} onRetry={reset} />
    </div>
  );
}
