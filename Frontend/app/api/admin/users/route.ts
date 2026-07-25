import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      "SELECT id, email, contact_number, name, role, created_at, updated_at FROM users ORDER BY created_at DESC"
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      contactNumber: row.contact_number,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
