import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { authenticateRequest } from "@/lib/auth";
import { pythonApiFetch } from "@/lib/python-api";

export const runtime = "nodejs";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const predictionCache = new Map<
  string,
  { expiresAt: number; value: Record<string, unknown> }
>();
const HISTORY_FILE = path.resolve(process.cwd(), "data/prediction_history.json");
const MAX_HISTORY_ROWS = 2000;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function cleanupCache(now: number) {
  for (const [key, cached] of predictionCache.entries()) {
    if (cached.expiresAt <= now) {
      predictionCache.delete(key);
    }
  }

  if (predictionCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const overflow = predictionCache.size - MAX_CACHE_ENTRIES;
  let removed = 0;
  for (const key of predictionCache.keys()) {
    predictionCache.delete(key);
    removed += 1;
    if (removed >= overflow) {
      break;
    }
  }
}

function cacheKeyHash(cacheKey: string): string {
  return createHash("sha1").update(cacheKey).digest("hex").slice(0, 10);
}

function monthlyPredictionsFromPayload(
  payload: Record<string, unknown>,
): Array<{ month?: string; prediction?: Record<string, unknown> }> {
  if (Array.isArray(payload.monthlyPredictions)) {
    return payload.monthlyPredictions as Array<{
      month?: string;
      prediction?: Record<string, unknown>;
    }>;
  }
  const nested = payload.prediction as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.monthlyPredictions)) {
    return nested.monthlyPredictions as Array<{
      month?: string;
      prediction?: Record<string, unknown>;
    }>;
  }
  return [];
}

function pickLoggedPredictionValue(
  predictionPayload: Record<string, unknown>,
  selectedMonth?: string,
) {
  const monthly = monthlyPredictionsFromPayload(predictionPayload);

  if (selectedMonth && monthly.length > 0) {
    const key = selectedMonth.trim();
    const matched = monthly.find(
      (item) => (item?.month ?? "").trim() === key,
    );
    if (matched?.prediction) {
      return matched.prediction;
    }
  }

  return predictionPayload;
}

async function appendPredictionHistory(entry: Record<string, unknown>) {
  try {
    await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
    let rows: Record<string, unknown>[] = [];
    try {
      const raw = await fs.readFile(HISTORY_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      rows = [];
    }
    rows.push(entry);
    if (rows.length > MAX_HISTORY_ROWS) {
      rows = rows.slice(rows.length - MAX_HISTORY_ROWS);
    }
    await fs.writeFile(HISTORY_FILE, JSON.stringify(rows, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to append prediction history:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const selectedMonth =
      typeof payload?.month === "string" ? payload.month : undefined;
    const now = Date.now();
    cleanupCache(now);
    const cacheKey = stableStringify(payload);
    const cached = predictionCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      const cachedMonthlyPredictions = monthlyPredictionsFromPayload(cached.value);
      const loggedPrediction = pickLoggedPredictionValue(cached.value, selectedMonth);
      await appendPredictionHistory({
        createdAt: new Date().toISOString(),
        userId: authUser.userId,
        role: authUser.role,
        source: "cache",
        input: {
          productName: payload?.productName,
          category: payload?.category,
          month: payload?.month,
          city: payload?.city,
          price: payload?.price,
          discountPct: payload?.discountPct,
        },
        output: {
          predictedSales: loggedPrediction?.predictedSales ?? null,
          salesPotentialCategory: loggedPrediction?.salesPotentialCategory ?? null,
          salesPotentialScore: loggedPrediction?.salesPotentialScore ?? null,
        },
      });
      const response = NextResponse.json({
        prediction: cached.value,
        monthlyPredictions: cachedMonthlyPredictions,
      });
      response.headers.set("X-Cache", "HIT");
      response.headers.set("X-Cache-Key", cacheKeyHash(cacheKey));
      return response;
    }

    const upstream = await pythonApiFetch("/v1/predict/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const resultText = await upstream.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(resultText) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid response from prediction engine" },
        { status: 500 },
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: parsed.error || "Prediction failed" },
        { status: upstream.status },
      );
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    predictionCache.set(cacheKey, {
      value: parsed,
      expiresAt: now + CACHE_TTL_MS,
    });
    const loggedPrediction = pickLoggedPredictionValue(parsed, selectedMonth);

    await appendPredictionHistory({
      createdAt: new Date().toISOString(),
      userId: authUser.userId,
      role: authUser.role,
      source: "fresh",
      input: {
        productName: payload?.productName,
        category: payload?.category,
        month: payload?.month,
        city: payload?.city,
        price: payload?.price,
        discountPct: payload?.discountPct,
      },
      output: {
        predictedSales: loggedPrediction?.predictedSales ?? null,
        salesPotentialCategory: loggedPrediction?.salesPotentialCategory ?? null,
        salesPotentialScore: loggedPrediction?.salesPotentialScore ?? null,
      },
    });

    const monthlyOut = monthlyPredictionsFromPayload(parsed);

    const response = NextResponse.json({
      prediction: parsed,
      monthlyPredictions: monthlyOut,
    });
    response.headers.set("X-Cache", "MISS");
    response.headers.set("X-Cache-Key", cacheKeyHash(cacheKey));
    return response;
  } catch (error) {
    console.error("Prediction API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate prediction",
      },
      { status: 500 },
    );
  }
}
