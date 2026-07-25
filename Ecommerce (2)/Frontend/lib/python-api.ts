/**
 * Client for the Render-hosted Python ML API.
 * Set BACKEND_API_URL (and optional BACKEND_API_KEY) in Vercel env.
 */

import { NextResponse } from "next/server";

function getBaseUrl(): string {
  const raw = (process.env.BACKEND_API_URL || "").trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error(
      "BACKEND_API_URL is not set. Point it at your Render ML service (e.g. https://your-api.onrender.com).",
    );
  }
  return raw;
}

function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const key = (process.env.BACKEND_API_KEY || "").trim();
  if (key) {
    headers.set("Authorization", `Bearer ${key}`);
  }
  return headers;
}

export async function pythonApiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = authHeaders(init.headers);
  return fetch(url, {
    ...init,
    headers,
    // Avoid Next.js fetch caching for ML/admin mutations and live data
    cache: "no-store",
  });
}

export async function proxyPythonJson(
  path: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  try {
    const upstream = await pythonApiFetch(path, init);
    const text = await upstream.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text.slice(0, 500) || "Invalid upstream response" };
      }
    }
    const response = NextResponse.json(body, { status: upstream.status });
    const cacheControl = upstream.headers.get("Cache-Control");
    if (cacheControl) {
      response.headers.set("Cache-Control", cacheControl);
    }
    const xCache = upstream.headers.get("X-Cache");
    if (xCache) {
      response.headers.set("X-Cache", xCache);
    }
    return response;
  } catch (error) {
    console.error("Python API proxy error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach ML backend",
      },
      { status: 502 },
    );
  }
}
