"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Permission, Role } from "@admin/core";

/**
 * Client-side reflexe oprávnění (A1.2).
 *
 * POUZE UI vrstva: skrývá tlačítka podle role ze session.
 * Není to ochrana — enforcement je vždy server-side
 * (requirePermission v API handlerách a stránkách).
 */

interface PermissionsState {
  role: Role | null;
  permissions: Permission[];
  loaded: boolean;
}

const Ctx = createContext<PermissionsState>({ role: null, permissions: [], loaded: false });

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PermissionsState>({ role: null, permissions: [], loaded: false });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setState({ role: res.data.role, permissions: res.data.permissions, loaded: true });
        } else {
          setState({ role: null, permissions: [], loaded: true });
        }
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  const { role, permissions, loaded } = useContext(Ctx);
  return {
    role,
    loaded,
    can: (permission: Permission) => permissions.includes(permission),
  };
}

/** Podmíněné vykreslení — stejná pravidla jako server, ale jen pro UI. */
export function Can({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : null;
}
