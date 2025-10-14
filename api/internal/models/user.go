package models

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	UserRoleViewer UserRole = "viewer"
	UserRoleAdmin  UserRole = "admin"
)

type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Username     string    `json:"username" db:"username" validate:"required,min=3,max=100"`
	PasswordHash string    `json:"-" db:"password_hash"` // Never expose password hash
	Role         UserRole  `json:"role" db:"role" validate:"required"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// UserLogin represents login credentials
type UserLogin struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

// UserRegistration represents user creation request
type UserRegistration struct {
	Username string   `json:"username" validate:"required,min=3,max=100"`
	Password string   `json:"password" validate:"required,min=8"`
	Role     UserRole `json:"role" validate:"required"`
}

// LoginResponse represents successful login response
type LoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	User      User      `json:"user"`
}

// JWTClaims represents JWT token claims
type JWTClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Role     UserRole  `json:"role"`
}

// UserUpdate represents user update request
type UserUpdate struct {
	Password *string   `json:"password,omitempty" validate:"omitempty,min=8"`
	Role     *UserRole `json:"role,omitempty"`
}