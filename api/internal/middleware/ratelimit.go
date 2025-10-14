package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type rateLimiter struct {
	requests map[string][]time.Time
	mutex    sync.RWMutex
}

var (
	agentLimiter = &rateLimiter{requests: make(map[string][]time.Time)}
	webLimiter   = &rateLimiter{requests: make(map[string][]time.Time)}
)

// RateLimit provides a simple in-memory rate limiter
// In production, consider using Redis for distributed rate limiting
func RateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip rate limiting if disabled
		// This would be configurable in production
		
		var identifier string
		var limiter *rateLimiter
		var limit int
		
		// Determine if this is an agent or web request
		if isAgentEndpoint(c.Path()) {
			// For agent endpoints, use device ID as identifier
			if deviceID := c.Locals("device_id"); deviceID != nil {
				identifier = deviceID.(uuid.UUID).String()
				limiter = agentLimiter
				limit = 100 // 100 requests per minute per device
			} else {
				// If no device ID (e.g., registration), use IP
				identifier = c.IP()
				limiter = agentLimiter
				limit = 10 // More restrictive for non-authenticated requests
			}
		} else {
			// For web endpoints, use user ID or IP
			if userID := c.Locals("user_id"); userID != nil {
				identifier = userID.(uuid.UUID).String()
				limiter = webLimiter
				limit = 1000 // 1000 requests per minute per user
			} else {
				identifier = c.IP()
				limiter = webLimiter
				limit = 100 // More restrictive for non-authenticated requests
			}
		}

		if identifier == "" {
			identifier = c.IP() // Fallback to IP
		}

		// Check rate limit
		if !checkRateLimit(limiter, identifier, limit) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Rate limit exceeded",
				"retry_after": 60,
			})
		}

		return c.Next()
	}
}

func checkRateLimit(limiter *rateLimiter, identifier string, limit int) bool {
	limiter.mutex.Lock()
	defer limiter.mutex.Unlock()

	now := time.Now()
	cutoff := now.Add(-time.Minute) // Look back 1 minute

	// Get existing requests for this identifier
	requests := limiter.requests[identifier]
	
	// Filter out old requests
	var validRequests []time.Time
	for _, reqTime := range requests {
		if reqTime.After(cutoff) {
			validRequests = append(validRequests, reqTime)
		}
	}

	// Check if under limit
	if len(validRequests) >= limit {
		return false
	}

	// Add current request
	validRequests = append(validRequests, now)
	limiter.requests[identifier] = validRequests

	return true
}

func isAgentEndpoint(path string) bool {
	return len(path) > 10 && path[:11] == "/v1/agents/"
}

// RequestID middleware adds a unique request ID to each request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if request ID already exists (from load balancer, etc.)
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Set response header
		c.Set("X-Request-ID", requestID)

		// Store in context for logging
		c.Locals("request_id", requestID)

		return c.Next()
	}
}

// Cleanup periodically removes old rate limit entries to prevent memory leaks
func StartRateLimitCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			cleanupRateLimiter(agentLimiter)
			cleanupRateLimiter(webLimiter)
		}
	}()
}

func cleanupRateLimiter(limiter *rateLimiter) {
	limiter.mutex.Lock()
	defer limiter.mutex.Unlock()

	cutoff := time.Now().Add(-time.Hour) // Keep last hour of data
	
	for identifier, requests := range limiter.requests {
		var validRequests []time.Time
		for _, reqTime := range requests {
			if reqTime.After(cutoff) {
				validRequests = append(validRequests, reqTime)
			}
		}
		
		if len(validRequests) == 0 {
			delete(limiter.requests, identifier)
		} else {
			limiter.requests[identifier] = validRequests
		}
	}
}