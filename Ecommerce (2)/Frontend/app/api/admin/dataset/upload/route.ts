import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/dataset-api";
import { proxyPythonJson, pythonApiFetch } from "@/lib/python-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const jobId = request.nextUrl.searchParams.get("jobId") ?? "";
    if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }
    return proxyPythonJson(`/v1/admin/jobs/${encodeURIComponent(jobId)}`);
  } catch (error) {
    console.error("Admin dataset upload GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const formData = await request.formData();
    const upstream = await pythonApiFetch("/v1/admin/datasets/upload", {
      method: "POST",
      body: formData,
    });
    const text = await upstream.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { error: text.slice(0, 500) || "Invalid upstream response" };
    }
    return NextResponse.json(body, { status: upstream.status });
  } catch (error) {
    console.error("Admin dataset upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
