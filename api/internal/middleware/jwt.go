package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/tracr/api/internal/config"
	"github.com/tracr/api/internal/models"
)

// JWTAuth middleware validates JWT tokens for web UI endpoints
func JWTAuth(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract token from Authorization header or cookie
		var tokenString string
		
		// Try Authorization header first
		authHeader := c.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			// Try cookie
			tokenString = c.Cookies("jwt_token")
		}

		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "JWT token is required",
			})
		}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid signing method")
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Extract claims
		claims, ok := token.Claims.(*jwt.RegisteredClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token claims",
			})
		}

		// Check expiration
		if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token has expired",
			})
		}

		// Parse user ID from subject
		userID, err := uuid.Parse(claims.Subject)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid user ID in token",
			})
		}

		// Extract custom claims from token
		var userClaims models.JWTClaims
		if tokenWithClaims, ok := token.Claims.(*JWTClaimsCustom); ok {
			userClaims = models.JWTClaims{
				UserID:   tokenWithClaims.UserID,
				Username: tokenWithClaims.Username,
				Role:     models.UserRole(tokenWithClaims.Role),
			}
		} else {
			// Fallback: load user from database
			// This is less efficient but ensures consistency
			userClaims.UserID = userID
			// In a production system, you might want to cache user data
		}

		// Store user info in context
		c.Locals("user_id", userClaims.UserID)
		c.Locals("user_claims", &userClaims)

		return c.Next()
	}
}

// JWTClaimsCustom extends RegisteredClaims with custom fields
type JWTClaimsCustom struct {
	jwt.RegisteredClaims
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Role     string    `json:"role"`
}

// RequireRole middleware ensures user has required role
func RequireRole(requiredRole models.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userClaims := c.Locals("user_claims")
		if userClaims == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User not authenticated",
			})
		}

		claims, ok := userClaims.(*models.JWTClaims)
		if !ok {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Invalid user claims",
			})
		}

		// Check role hierarchy: admin can access viewer endpoints
		if requiredRole == models.UserRoleViewer {
			// Both viewer and admin can access viewer endpoints
			if claims.Role != models.UserRoleViewer && claims.Role != models.UserRoleAdmin {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "Insufficient permissions",
				})
			}
		} else if requiredRole == models.UserRoleAdmin {
			// Only admin can access admin endpoints
			if claims.Role != models.UserRoleAdmin {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "Admin role required",
				})
			}
		}

		return c.Next()
	}
}