"use client";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

export function getClientCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheRecord<T>;
    if (!parsed || typeof parsed.expiresAt !== "number") return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function setClientCache<T>(key: string, value: T, ttlMs: number) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheRecord<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures silently.
  }
}

/** Clear trends/dashboard caches after switching the active dataset. */
export function clearTrendsClientCaches() {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("dashboard_trends_") ||
        key.startsWith("category_trends_")
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
