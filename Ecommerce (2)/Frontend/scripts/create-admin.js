// Script to create an admin user in PostgreSQL database
// Usage: node scripts/create-admin.js

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  try {
    const email = "admin@example.com";
    const contactNumber = "+923000000000";
    const password = "admin123"; // Change this!
    const name = "Admin User";
    const role = "admin";

    // Check if admin already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existing.rows.length > 0) {
      console.log("❌ Admin user already exists with email:", email);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const result = await pool.query(
      "INSERT INTO users (email, contact_number, password, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, contact_number, name, role",
      [email, contactNumber, hashedPassword, name, role],
    );

    console.log("✅ Admin user created successfully!");
    console.log("Email:", result.rows[0].email);
    console.log("Contact Number:", result.rows[0].contact_number);
    console.log("Password:", password);
    console.log("Role:", result.rows[0].role);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");

    await pool.end();
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  }
}

createAdmin();
