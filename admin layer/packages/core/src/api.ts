/** API kontrakt — tvar odpovědí všech mutačních endpointů Admin Layeru. */

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: { message: string; fields?: Record<string, string> } };
export type ApiResult<T> = ApiOk<T> | ApiFail;

export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function fail(message: string, fields?: Record<string, string>): ApiFail {
  return { ok: false, error: { message, fields } };
}

/** Chyba aplikace s čitelným cs popisem a volitelně chybami polí. */
export class AdminError extends Error {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>,
    public readonly status: number = 400,
  ) {
    super(message);
  }
}
