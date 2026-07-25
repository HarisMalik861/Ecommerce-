import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { proxyPythonJson } from "@/lib/python-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const category = String(payload?.category ?? "").trim();
    if (!category) {
      return NextResponse.json(
        { error: "Product category is required." },
        { status: 400 },
      );
    }

    return proxyPythonJson("/v1/predict/generic-top", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, topN: 3 }),
    });
  } catch (error) {
    console.error("Generic prediction API error:", error);
    return NextResponse.json(
      { error: "Failed to generate generic prediction" },
      { status: 500 },
    );
  }
}
