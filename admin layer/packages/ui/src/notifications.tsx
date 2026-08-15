"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { tokens } from "./tokens";

/**
 * Notification system (A7.1).
 *
 * Transient toasty: success / warning / error / info. Auto-dismiss dle typu,
 * ruční zavření, maximálně 4 najednou. Stack je fixed, pointer-events jen
 * na samotných kartách — nikdy neblokuje běžnou práci.
 *
 * Persistentní systémové alerty řeší server (SystemAlertsBar v shellu).
 */

export type NotificationType = "success" | "warning" | "error" | "info";

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message?: string;
  /** vlastní TTL v ms; výchozí dle typu */
  ttlMs?: number;
}

export interface Notification extends NotifyInput {
  id: string;
}

const DEFAULT_TTL: Record<NotificationType, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 10000,
};

const TONE: Record<NotificationType, { fg: string; bg: string; glyph: string }> = {
  success: { fg: tokens.colors.success, bg: tokens.colors.successSoft, glyph: "✓" },
  warning: { fg: tokens.colors.warning, bg: tokens.colors.warningSoft, glyph: "!" },
  error: { fg: tokens.colors.danger, bg: tokens.colors.dangerSoft, glyph: "✕" },
  info: { fg: tokens.colors.info, bg: tokens.colors.infoSoft, glyph: "i" },
};

export interface NotificationApi {
  notify: (input: NotifyInput) => string;
  dismiss: (id: string) => void;
}

const Ctx = createContext<NotificationApi>({ notify: () => "", dismiss: () => {} });

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((n) => n.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (input: NotifyInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((current) => [...current.slice(-3), { ...input, id }]);
      const ttl = input.ttlMs ?? DEFAULT_TTL[input.type];
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), ttl),
      );
      return id;
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={{ notify, dismiss }}>
      {children}
      <div
        style={{
          position: "fixed",
          insetInlineEnd: 16,
          bottom: 16,
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {items.map((n) => {
          const tone = TONE[n.type];
          return (
            <div
              key={n.id}
              role="status"
              style={{
                pointerEvents: "auto",
                maxWidth: 380,
                background: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderInlineStart: `3px solid ${tone.fg}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(17,17,17,0.10)",
                padding: "10px 12px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                animation: "admin-toast-in 0.15s ease-out",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: tone.bg,
                  color: tone.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {tone.glyph}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: tokens.colors.primary }}>
                  {n.title}
                </div>
                {n.message && (
                  <div
                    style={{
                      fontSize: 12,
                      color: tokens.colors.secondary,
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {n.message}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Zavřít notifikaci"
                onClick={() => dismiss(n.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: tokens.colors.muted,
                  fontSize: 14,
                  padding: 2,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useNotifications(): NotificationApi {
  return useContext(Ctx);
}
