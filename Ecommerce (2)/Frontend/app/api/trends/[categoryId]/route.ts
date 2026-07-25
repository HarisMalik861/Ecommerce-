import { NextResponse } from "next/server";
import { proxyPythonJson } from "@/lib/python-api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const { categoryId } = await params;
  if (!categoryId) {
    return NextResponse.json({ error: "Unknown category" }, { status: 404 });
  }
  return proxyPythonJson(`/v1/trends/categories/${encodeURIComponent(categoryId)}`);
}
