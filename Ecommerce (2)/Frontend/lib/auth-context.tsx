"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "sonner";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else if (response.status === 401 || response.status === 403) {
          // Explicitly unauthenticated — clear state
          setUser(null);
        }
        // 5xx server errors: keep existing user state; don't log out
      } catch {
        // Network error: keep existing user state; don't log out
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("Login: Sending request to /api/auth/login");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "include",
      });

      console.log("Login: Response status:", response.status);

      if (!response.ok) {
        let errorMessage = "Login failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Login: Failed to parse error response:", parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`;
        }
        console.error("Login: Error:", errorMessage);
        toast.error("Login Failed", {
          description: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Login: Success, user data:", data.user);
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
        body: JSON.stringify({ email: email || undefined, contactNumber, password, name }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Signup failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`;
        }
        toast.error("Signup Failed", {
          description: errorMessage,
        });
        throw new Error(errorMessage);
      }

      // Don't auto-login, just show success message
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
      });

      if (!response.ok) {
        let errorMessage = "Logout failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`;
        }
        toast.error("Logout Failed", {
          description: errorMessage,
        });
        throw new Error(errorMessage);
      }

      setUser(null);
      toast.success("Logged out");
    } catch (error) {
      console.error("Logout error:", error);

      throw error;
    }
  };

  const updateProfile = async (name: string) => {
    if (!user) return;

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
