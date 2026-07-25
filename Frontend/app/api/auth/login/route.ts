import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { signToken } from "@/lib/jwt";

export async function POST(request: Request) {
  console.log("🔐 Login API: Request received");

  try {
    const body = await request.json();
    console.log("🔐 Login API: Body parsed successfully");

    const { identifier, email, password } = body;
    const loginIdentifier = String(identifier || email || "").trim();
    console.log("🔐 Login API: Identifier:", loginIdentifier);

    // Validate input
    if (!loginIdentifier || !password) {
      console.log("🔐 Login API: Missing email or password");
      return NextResponse.json(
        { error: "Email/mobile and password are required" },
        { status: 400 },
      );
    }

    console.log("🔐 Login API: Querying database for user");

    // Find user by email or contact number
    const result = await pool.query(
      "SELECT id, email, contact_number, password, name, role FROM users WHERE email = $1 OR contact_number = $1",
      [loginIdentifier],
    );

    console.log(
      "🔐 Login API: Database query completed, rows found:",
      result.rows.length,
    );

    if (result.rows.length === 0) {
      console.log("🔐 Login API: User not found");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const user = result.rows[0];
    console.log("🔐 Login API: User found, verifying password");

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("🔐 Login API: Password valid:", isValidPassword);

    if (!isValidPassword) {
      console.log("🔐 Login API: Invalid password");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    console.log("🔐 Login API: Generating JWT token");

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    console.log("🔐 Login API: Token generated successfully");

    // Return user data and token
    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          contactNumber: user.contact_number,
          name: user.name,
          role: user.role,
        },
        token,
      },
      { status: 200 },
    );

    // Set token in cookie
    // secure:true works correctly behind Cloudflare tunnel (browser sees HTTPS)
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    console.log("🔐 Login API: Response prepared with cookie");
    return response;
  } catch (error) {
    console.error("🔐 Login API: Error occurred:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
