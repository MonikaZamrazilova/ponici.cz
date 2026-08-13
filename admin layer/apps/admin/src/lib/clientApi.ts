import type { ApiResult } from "@admin/core";

/**
 * Client-side fetch helper pro admin API.
 * 401 (session chybějící/vypršela/odvolaná) → přesměrování na login
 * s hláškou. To je jen UX vrstva — bezpečnost zajišťují serverové
 * validace (middleware + route handlery + session store).
 */
export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    window.location.assign("/login?expired=1");
    throw new Error("SESSION_EXPIRED");
  }
  return (await res.json()) as ApiResult<T>;
}
