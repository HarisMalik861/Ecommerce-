import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/dataset-api";
import { proxyPythonJson } from "@/lib/python-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const datasetId = String(body?.id ?? "").trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(datasetId)) {
      return NextResponse.json({ error: "Invalid dataset id" }, { status: 400 });
    }

    return proxyPythonJson(
      `/v1/admin/datasets/${encodeURIComponent(datasetId)}/activate`,
      { method: "POST" },
    );
  } catch (error) {
    console.error("Dataset activate error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
