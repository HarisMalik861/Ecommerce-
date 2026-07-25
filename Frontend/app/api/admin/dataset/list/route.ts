import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/dataset-api";
import { proxyPythonJson } from "@/lib/python-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authError = await ensureAdmin(request);
    if (authError) return authError;
    return proxyPythonJson("/v1/admin/datasets");
  } catch (error) {
    console.error("Dataset list error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dataset list",
      },
      { status: 500 },
    );
  }
}
