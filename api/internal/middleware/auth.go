package middleware

import (
	"crypto/sha256"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/tracr/api/internal/models"
)

// DeviceAuth middleware validates device tokens for agent endpoints
func DeviceAuth(db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header required",
			})
		}

		// Extract Bearer token
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization format, expected 'Bearer <token>'",
			})
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token is required",
			})
		}

		// Extract device ID from URL path
		deviceIDStr := c.Params("device_id")
		if deviceIDStr == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Device ID is required in URL path",
			})
		}

		deviceID, err := uuid.Parse(deviceIDStr)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid device ID format",
			})
		}

		// Hash the provided token for comparison
		hasher := sha256.New()
		hasher.Write([]byte(token))
		tokenHash := fmt.Sprintf("%x", hasher.Sum(nil))

		// Query device and validate token
		var device models.Device
		query := "SELECT * FROM devices WHERE id = $1 AND device_token_hash = $2"
		err = db.Get(&device, query, deviceID, tokenHash)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid device ID or token",
			})
		}

		// Store device in context for use by handlers
		c.Locals("device", &device)
		c.Locals("device_id", deviceID)

		return c.Next()
	}
}