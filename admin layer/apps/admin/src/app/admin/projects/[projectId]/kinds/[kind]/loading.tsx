import { Skeleton } from "@admin/ui";

/** Loading state list view — kostra tabulky. */
export default function KindListLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Skeleton width={220} height={24} radius={6} />
      <Skeleton height={44} radius={10} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={40} radius={8} />
      ))}
    </div>
  );
}
