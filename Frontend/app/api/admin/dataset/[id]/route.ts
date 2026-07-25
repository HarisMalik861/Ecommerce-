import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/dataset-api";
import { proxyPythonJson } from "@/lib/python-api";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid dataset id" }, { status: 400 });
    }

    return proxyPythonJson(`/v1/admin/datasets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error("Dataset delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
