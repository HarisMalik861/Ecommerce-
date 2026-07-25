/**
 * Authenticated fetch: always includes credentials + Bearer token from sessionStorage.
 * Use this for all protected /api/* calls from the browser.
 */
const TOKEN_KEY = "ti_auth_token";

export function getClientAuthHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // ignore
  }
  return headers;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = getClientAuthHeaders(init.headers);
  // Let the browser set multipart boundary when body is FormData
  if (init.body instanceof FormData) {
    headers.delete("Content-Type");
  }
  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}

/** Public Render ML API base URL (no trailing slash). */
export function getPublicBackendUrl(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}
