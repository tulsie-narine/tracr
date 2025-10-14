// User role enum
export type UserRole = 'viewer' | 'admin'

// User interface
export interface User {
  id: string
  username: string
  role: UserRole
  created_at: string
  updated_at: string
}

// User login request
export interface UserLogin {
  username: string
  password: string
}

// User registration request
export interface UserRegistration {
  username: string
  password: string
  role: UserRole
}

// Login response
export interface LoginResponse {
  token: string
  expires_at: string
  user: User
}

// JWT claims structure
export interface JWTClaims {
  user_id: string
  username: string
  role: UserRole
  exp?: number
  iat?: number
  sub?: string
}

// User update request
export interface UserUpdate {
  password?: string
  role?: UserRole
}