import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { signToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const { email, contactNumber, password, name, role } = await request.json();
    const normalizedContactNumber = String(contactNumber || "").trim();
    const normalizedEmail = String(email || "").trim() || null;

    // Validate input - contact number, password, and name required; email optional
    if (!normalizedContactNumber || !password || !name) {
      return NextResponse.json(
        { error: "Contact number, password, and name are required" },
        { status: 400 },
      );
    }

    // Validate email format only if provided
    if (normalizedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 },
        );
      }
    }

    // Validate contact number format (supports + and digits/spaces/hyphens)
    const contactRegex = /^\+?[0-9\s-]{7,20}$/;
    if (!contactRegex.test(normalizedContactNumber)) {
      return NextResponse.json(
        { error: "Invalid contact number format" },
        { status: 400 },
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    // Check if email already exists (only when email provided)
    if (normalizedEmail) {
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [normalizedEmail],
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 },
        );
      }
    }

    // Check if contact number already exists
    const existingContact = await pool.query(
      "SELECT id FROM users WHERE contact_number = $1",
      [normalizedContactNumber],
    );

    if (existingContact.rows.length > 0) {
      return NextResponse.json(
        { error: "Contact number already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set role (default to 'user', only allow 'admin' if explicitly set)
    const userRole = role === "admin" ? "admin" : "user";

    // Insert user (email can be null)
    const result = await pool.query(
      "INSERT INTO users (email, contact_number, password, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, contact_number, name, role",
      [normalizedEmail, normalizedContactNumber, hashedPassword, name, userRole],
    );

    const user = result.rows[0];
    const jwtIdentifier = user.email || user.contact_number;

    // Generate JWT token (use contact_number as identifier when email is null)
    const token = signToken({
      userId: user.id,
      email: jwtIdentifier,
      role: user.role,
    });

    // Return user data and token
    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          contactNumber: user.contact_number,
          name: user.name,
          role: user.role,
        },
        token,
      },
      { status: 201 },
    );

    // Set token in cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
