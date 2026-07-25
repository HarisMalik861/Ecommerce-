import { NextRequest } from "next/server";
import { proxyPythonJson } from "@/lib/python-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";
  const qs = refresh ? "?refresh=true" : "";
  return proxyPythonJson(`/v1/trends${qs}`);
}
