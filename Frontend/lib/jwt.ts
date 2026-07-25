import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: number;
  email: string;
  role: "user" | "admin";
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "fallback-secret-key";
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || "7d";
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn() as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch (error) {
    console.error(
      "JWT verification failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
