"use client";

import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, Table, Td, tokens } from "@admin/ui";
import type { AuditAction, AuditEvent } from "@admin/core";

const ACTION_TONE: Record<AuditAction, "success" | "danger" | "info" | "neutral" | "warning"> = {
  login: "info",
  logout: "neutral",
  failed_login: "danger",
  create: "info",
  update: "neutral",
  publish: "success",
  rollback: "warning",
  unpublish: "neutral",
  archive: "neutral",
  restore: "info",
  delete: "danger",
  settings: "info",
  permission: "warning",
};

/**
 * Audit log s filtry (A8.1) — dohledatelnost podle akce, uživatele (role),
 * druhu entity a fulltextu. Filtrace klient-side nad načteným logem.
 */
export function AuditLog({ events, showProject = false }: { events: AuditEvent[]; showProject?: boolean }) {
  const [action, setAction] = useState<string>("");
  const [actor, setActor] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [query, setQuery] = useState("");

  const actors = useMemo(() => [...new Set(events.map((e) => e.actor))].sort(), [events]);
  const kinds = useMemo(() => [...new Set(events.map((e) => e.entityKind))].sort(), [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      if (action && event.action !== action) return false;
      if (actor && event.actor !== actor) return false;
      if (kind && event.entityKind !== kind) return false;
      if (q) {
        const haystack = `${event.entityId} ${event.summary} ${event.projectId}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, action, actor, kind, query]);

  const columns: { label: string; width?: string }[] = [
    { label: "Čas", width: "15%" },
    { label: "Uživatel (role)", width: "12%" },
    { label: "Akce", width: "10%" },
    ...(showProject ? [{ label: "Projekt", width: "12%" }] : []),
    { label: "Entita", width: "16%" },
    { label: "Popis" },
  ];

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 13,
    borderRadius: 8,
    border: `1px solid ${tokens.colors.borderHi}`,
    background: tokens.colors.surface,
    color: tokens.colors.primary,
    fontFamily: tokens.font.body,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select value={action} onChange={(e) => setAction(e.target.value)} style={selectStyle} aria-label="Filtr akce">
          <option value="">Všechny akce</option>
          {Object.keys(ACTION_TONE).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={actor} onChange={(e) => setActor(e.target.value)} style={selectStyle} aria-label="Filtr uživatele">
          <option value="">Všichni uživatelé</option>
          {actors.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={selectStyle} aria-label="Filtr entity">
          <option value="">Všechny entity</option>
          {kinds.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hledat (ID, popis, projekt)…"
          aria-label="Fulltext"
          style={{
            padding: "6px 10px",
            fontSize: 13,
            borderRadius: 8,
            border: `1px solid ${tokens.colors.borderHi}`,
            background: tokens.colors.surface,
            color: tokens.colors.primary,
            minWidth: 220,
            flex: 1,
            fontFamily: tokens.font.body,
          }}
        />
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <EmptyState
            title={events.length === 0 ? "Zatím žádné auditní záznamy" : "Žádné záznamy neodpovídají filtru"}
            hint={events.length === 0 ? "První akce se objeví tady." : "Změňte filtry."}
          />
        ) : (
          <Table columns={columns}>
            {filtered.map((event) => (
              <tr key={event.id}>
                <Td>
                  <span style={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.colors.muted }}>
                    {new Date(event.timestamp).toLocaleString("cs-CZ")}
                  </span>
                </Td>
                <Td>
                  <span style={{ fontFamily: tokens.font.mono, fontSize: 12 }}>{event.actor}</span>
                </Td>
                <Td>
                  <Badge tone={ACTION_TONE[event.action]}>{event.action}</Badge>
                </Td>
                {showProject && (
                  <Td>
                    <span style={{ fontFamily: tokens.font.mono, fontSize: 12, color: tokens.colors.muted }}>
                      {event.projectId}
                    </span>
                  </Td>
                )}
                <Td>
                  <span style={{ fontFamily: tokens.font.mono, fontSize: 12 }}>
                    {event.entityKind} · {event.entityId}
                  </span>
                </Td>
                <Td>{event.summary}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
