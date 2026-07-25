export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  contactNumber: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  contactNumber: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UpdateProfileRequest {
  name: string;
}
