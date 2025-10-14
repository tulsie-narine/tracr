package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"github.com/tracr/api/internal/config"
	"github.com/tracr/api/internal/middleware"
	"github.com/tracr/api/internal/models"
)

// Handler holds the database and config dependencies
type Handler struct {
	DB     *sqlx.DB
	Config *config.Config
}

// Setup configures all agent routes
func Setup(app *fiber.App, db *sqlx.DB, cfg *config.Config) {
	handler := &Handler{
		DB:     db,
		Config: cfg,
	}

	// Create v1/agents route group
	agentGroup := app.Group("/v1/agents")

	// Public endpoint - no authentication required
	agentGroup.Post("/register", handler.RegisterDevice)

	// Authenticated endpoints - require device token
	agentAuthed := agentGroup.Group("")
	agentAuthed.Use(middleware.DeviceAuth(db))
	agentAuthed.Post("/:device_id/inventory", handler.SubmitInventory)
	agentAuthed.Post("/:device_id/heartbeat", handler.Heartbeat)
	agentAuthed.Get("/:device_id/commands", handler.PollCommands)
	agentAuthed.Post("/:device_id/commands/:command_id/ack", handler.AckCommand)

	// Authentication routes
	authGroup := app.Group("/v1/auth")
	authGroup.Post("/login", handler.Login)

	// User management routes
	userGroup := app.Group("/v1/users")
	userGroup.Use(middleware.JWTAuth(cfg))
	userGroup.Get("/", middleware.RequireRole(models.UserRoleViewer), handler.ListUsers)
	userGroup.Post("/", middleware.RequireRole(models.UserRoleAdmin), handler.CreateUser)
	userGroup.Get("/:user_id", middleware.RequireRole(models.UserRoleViewer), handler.GetUser)
	userGroup.Put("/:user_id", middleware.RequireRole(models.UserRoleAdmin), handler.UpdateUser)
	userGroup.Delete("/:user_id", middleware.RequireRole(models.UserRoleAdmin), handler.DeleteUser)

	// Device management routes
	deviceGroup := app.Group("/v1/devices")
	deviceGroup.Use(middleware.JWTAuth(cfg))
	deviceGroup.Get("/", middleware.RequireRole(models.UserRoleViewer), handler.ListDevices)
	deviceGroup.Get("/:device_id", middleware.RequireRole(models.UserRoleViewer), handler.GetDevice)
	deviceGroup.Get("/:device_id/snapshots", middleware.RequireRole(models.UserRoleViewer), handler.ListSnapshots)
	deviceGroup.Get("/:device_id/snapshots/:snapshot_id", middleware.RequireRole(models.UserRoleViewer), handler.GetSnapshot)
	deviceGroup.Post("/:device_id/commands", middleware.RequireRole(models.UserRoleAdmin), handler.CreateCommand)
	deviceGroup.Get("/:device_id/commands", middleware.RequireRole(models.UserRoleViewer), handler.ListDeviceCommands)

	// Software catalog routes
	softwareGroup := app.Group("/v1/software")
	softwareGroup.Use(middleware.JWTAuth(cfg))
	softwareGroup.Get("/", middleware.RequireRole(models.UserRoleViewer), handler.ListSoftwareCatalog)

	// Audit log routes
	auditGroup := app.Group("/v1/audit-logs")
	auditGroup.Use(middleware.JWTAuth(cfg))
	auditGroup.Get("/", middleware.RequireRole(models.UserRoleAdmin), handler.ListAuditLogs)
}