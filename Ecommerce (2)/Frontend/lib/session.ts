import { cookies } from 'next/headers';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const SESSION_COOKIE_NAME = 'trendinsight_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory session store (for development - replace with database in production)
const sessions: Map<string, any> = new Map();

export async function createSession(userData: any) {
  const sessionId = generateSessionId();
  const sessionData = {
    user: userData,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
  };

  sessions.set(sessionId, sessionData);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });

  return sessionData;
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return session;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    sessions.delete(sessionId);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// In-memory user store (for development - replace with database in production)
export const userStore: Map<string, any> = new Map([
  [
    'demo@example.com',
    {
      id: 'user_1',
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'password123',
      createdAt: new Date(),
    },
  ],
]);

export function hashPassword(password: string): string {
  // Simple hash for demo - use bcrypt in production
  return Buffer.from(password).toString('base64');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substring(2, 9);
}
