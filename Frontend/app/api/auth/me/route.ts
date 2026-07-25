import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authUser = authenticateRequest(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user data from database
    const result = await pool.query(
      "SELECT id, email, contact_number, name, role, created_at FROM users WHERE id = $1",
      [authUser.userId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          contactNumber: user.contact_number,
          name: user.name,
          role: user.role,
          createdAt: user.created_at,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
