import { Skeleton } from "@admin/ui";

/** Loading state shellu — kostra hlavní oblasti, sidebar zůstává. */
export default function AdminLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Skeleton width={200} height={24} radius={6} />
      <Skeleton width={420} height={14} radius={6} />
      <Skeleton height={140} radius={12} />
      <Skeleton height={220} radius={12} />
    </div>
  );
}
