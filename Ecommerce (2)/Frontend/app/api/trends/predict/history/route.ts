import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

const HISTORY_FILE = path.resolve(process.cwd(), "data/prediction_history.json");

export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rows: Record<string, unknown>[] = [];
    try {
      const raw = await fs.readFile(HISTORY_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      rows = [];
    }

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 20;

    const filtered =
      authUser.role === "admin"
        ? rows
        : rows.filter((row) => Number(row.userId) === authUser.userId);

    const latest = filtered.slice(-limit).reverse();
    return NextResponse.json({
      items: latest,
      total: filtered.length,
      scope: authUser.role === "admin" ? "all" : "mine",
    });
  } catch (error) {
    console.error("Prediction history fetch error:", error);
    return NextResponse.json({ error: "Failed to load prediction history" }, { status: 500 });
  }
}
