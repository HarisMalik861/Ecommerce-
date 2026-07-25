import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { proxyPythonJson } from "@/lib/python-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const category = (request.nextUrl.searchParams.get("category") || "").trim();
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return proxyPythonJson(`/v1/dataset/options${qs}`);
  } catch (error) {
    console.error("Failed to load dataset options:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dataset options",
      },
      { status: 500 },
    );
  }
}
