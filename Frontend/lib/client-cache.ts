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

const ACTIVE_DATASET_KEY = "active_dataset_id";

export function setActiveDatasetId(datasetId: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (datasetId) {
      window.sessionStorage.setItem(ACTIVE_DATASET_KEY, String(datasetId));
    } else {
      window.sessionStorage.removeItem(ACTIVE_DATASET_KEY);
    }
  } catch {
    // ignore
  }
}

export function getActiveDatasetId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ACTIVE_DATASET_KEY);
  } catch {
    return null;
  }
}

/** Clear trends/dashboard/options caches after switching the active dataset. */
export function clearTrendsClientCaches(activeDatasetId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith("dashboard_trends_") ||
        key.startsWith("category_trends_") ||
        key.startsWith("dataset_options_")
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key);
    }
    if (activeDatasetId) {
      setActiveDatasetId(activeDatasetId);
    }
  } catch {
    // ignore
  }
}
