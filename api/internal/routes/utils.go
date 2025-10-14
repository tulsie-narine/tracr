package routes

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/tracr/api/internal/config"
	"github.com/tracr/api/internal/middleware"
	"github.com/tracr/api/internal/models"
)

// Token generation and hashing utilities

// GenerateDeviceToken generates a cryptographically secure 32-byte token
func GenerateDeviceToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// HashToken hashes a token with SHA-256 and returns hex-encoded string
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// GenerateJWTToken generates a JWT token for a user
func GenerateJWTToken(user *models.User, cfg *config.Config) (string, time.Time, error) {
	expiresAt := time.Now().Add(cfg.JWTExpiry)
	
	claims := middleware.JWTClaimsCustom{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		UserID:   user.ID,
		Username: user.Username,
		Role:     string(user.Role),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to sign JWT token: %w", err)
	}

	return signedToken, expiresAt, nil
}

// Snapshot hashing utilities

// CalculateSnapshotHash computes SHA-256 hash of inventory data for deduplication
func CalculateSnapshotHash(inventory *models.InventorySubmission) (string, error) {
	jsonData, err := json.Marshal(inventory)
	if err != nil {
		return "", fmt.Errorf("failed to marshal inventory: %w", err)
	}
	
	hash := sha256.Sum256(jsonData)
	return hex.EncodeToString(hash[:]), nil
}

// Device status utilities

// DetermineDeviceStatus determines device status based on last seen timestamp
func DetermineDeviceStatus(lastSeen time.Time) models.DeviceStatus {
	if time.Since(lastSeen) <= 5*time.Minute {
		return models.DeviceStatusActive
	}
	return models.DeviceStatusOffline
}

// Error response utilities

// ErrorResponse returns a standardized error response
func ErrorResponse(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(fiber.Map{
		"error": message,
	})
}

// ValidationErrorResponse formats validation errors into user-friendly response
func ValidationErrorResponse(c *fiber.Ctx, err error) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"error": err.Error(),
	})
}

// Device status utilities

// CalculateDeviceOnlineStatus determines if a device is online based on last seen timestamp
func CalculateDeviceOnlineStatus(lastSeen time.Time) bool {
	return time.Since(lastSeen) <= 5*time.Minute
}

// CalculateUptimeHours calculates uptime hours from boot time
func CalculateUptimeHours(bootTime *time.Time) int {
	if bootTime == nil {
		return 0
	}
	return int(time.Since(*bootTime).Hours())
}

// CalculateVolumeUsage calculates used bytes and used percentage for a volume
func CalculateVolumeUsage(volume *models.Volume) {
	volume.UsedBytes = volume.TotalBytes - volume.FreeBytes
	
	if volume.TotalBytes > 0 {
		volume.UsedPercent = (float64(volume.UsedBytes) / float64(volume.TotalBytes)) * 100.0
	} else {
		volume.UsedPercent = 0.0
	}
}

// Audit logging utilities

// ExtractUserFromContext extracts user information from JWT context
func ExtractUserFromContext(c *fiber.Ctx) (uuid.UUID, string, models.UserRole, error) {
	userID := c.Locals("user_id")
	userClaims := c.Locals("user_claims")

	if userID == nil || userClaims == nil {
		return uuid.Nil, "", "", fmt.Errorf("user information not found in context")
	}

	id, ok := userID.(uuid.UUID)
	if !ok {
		return uuid.Nil, "", "", fmt.Errorf("invalid user ID in context")
	}

	claims, ok := userClaims.(models.JWTClaims)
	if !ok {
		return uuid.Nil, "", "", fmt.Errorf("invalid user claims in context")
	}

	return id, claims.Username, claims.Role, nil
}

// ExtractClientIP extracts client IP address from request
func ExtractClientIP(c *fiber.Ctx) string {
	// Check X-Forwarded-For header first (for proxied requests)
	if forwarded := c.Get("X-Forwarded-For"); forwarded != "" {
		// Take the first IP if multiple are present
		if idx := strings.Index(forwarded, ","); idx > 0 {
			return strings.TrimSpace(forwarded[:idx])
		}
		return strings.TrimSpace(forwarded)
	}

	// Check X-Real-IP header
	if realIP := c.Get("X-Real-IP"); realIP != "" {
		return strings.TrimSpace(realIP)
	}

	// Fall back to Fiber's IP method
	return c.IP()
}

// LogAuditAction creates an audit log entry for administrative actions
func LogAuditAction(db *sqlx.DB, c *fiber.Ctx, action string, deviceID *uuid.UUID, details interface{}) error {
	// Extract user information from context
	userID, _, _, err := ExtractUserFromContext(c)
	if err != nil {
		return fmt.Errorf("failed to extract user from context: %w", err)
	}

	// Extract client information
	ipAddress := ExtractClientIP(c)
	userAgent := c.Get("User-Agent")

	// Marshal details to JSON
	var detailsJSON json.RawMessage
	if details != nil {
		detailsBytes, err := json.Marshal(details)
		if err != nil {
			return fmt.Errorf("failed to marshal details: %w", err)
		}
		detailsJSON = json.RawMessage(detailsBytes)
	}

	// Create audit log entry
	auditLog := &models.AuditLog{
		ID:        uuid.New(),
		UserID:    &userID,
		DeviceID:  deviceID,
		Action:    action,
		Details:   detailsJSON,
		Timestamp: time.Now().UTC(),
		IPAddress: ipAddress,
		UserAgent: userAgent,
	}

	// Save to database
	return CreateAuditLog(db, auditLog)
}