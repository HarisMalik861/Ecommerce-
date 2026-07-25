"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "sonner";

const TOKEN_KEY = "ti_auth_token";

export interface User {
  id: number;
  email: string | null;
  contactNumber: string;
  name: string;
  role: "user" | "admin";
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (
    contactNumber: string,
    password: string,
    name: string,
    email?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  authHeaders: () => HeadersInit;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = (): HeadersInit => {
    const token = readStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            ...authHeaders(),
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else if (response.status === 401 || response.status === 403) {
          setUser(null);
          storeToken(null);
        }
      } catch {
        // Network error: keep existing user state
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`;
        }
        toast.error("Login Failed", {
          description: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.token) {
        storeToken(data.token);
      }
      setUser(data.user);
      toast.success("Welcome back!", {
        description: "You have successfully logged in.",
      });
    } catch (error) {
      console.error("Login: Exception:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    contactNumber: string,
    password: string,
    name: string,
    email?: string,
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          contactNumber,
          password,
          name,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Signup failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`;
        }
        toast.error("Signup Failed", {
          description: errorMessage,
        });
        throw new Error(errorMessage);
      }

      toast.success("Account Created!", {
        description: "Please sign in with your credentials.",
      });
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          ...authHeaders(),
        },
      });

      if (!response.ok) {
        let errorMessage = "Logout failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`;
        }
        toast.error("Logout Failed", {
          description: errorMessage,
        });
        throw new Error(errorMessage);
      }

      storeToken(null);
      setUser(null);
      toast.success("Logged out");
    } catch (error) {
      storeToken(null);
      setUser(null);
      console.error("Logout error:", error);
      throw error;
    }
  };

  const updateProfile = async (name: string) => {
    if (!user) return;

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ name }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Profile update failed");
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateProfile,
        authHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
