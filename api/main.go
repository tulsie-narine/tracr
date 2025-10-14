package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/tracr/api/internal/config"
	"github.com/tracr/api/internal/database"
	"github.com/tracr/api/internal/middleware"
	"github.com/tracr/api/internal/routes"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run database migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ServerHeader: "Tracr API",
		AppName:      "Tracr API v1.0.0",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
				"code":  code,
			})
		},
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} ${method} ${path} ${status} ${latency} ${bytesSent} ${bytesReceived} ${userAgent}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*", // Configure appropriately for production
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	// Custom middleware
	app.Use(middleware.RequestID())
	app.Use(middleware.RateLimit())

	// Register routes
	routes.Setup(app, db, cfg)

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		fmt.Println("Gracefully shutting down...")
		app.Shutdown()
	}()

	// Start server
	var listenAddr string
	if cfg.TLSCertFile != "" && cfg.TLSKeyFile != "" {
		listenAddr = fmt.Sprintf(":%d", cfg.Port)
		log.Printf("Starting HTTPS server on port %d", cfg.Port)
		if err := app.ListenTLS(listenAddr, cfg.TLSCertFile, cfg.TLSKeyFile); err != nil {
			log.Fatalf("Failed to start HTTPS server: %v", err)
		}
	} else {
		listenAddr = fmt.Sprintf(":%d", cfg.Port)
		log.Printf("Starting HTTP server on port %d (TLS not configured)", cfg.Port)
		if err := app.Listen(listenAddr); err != nil {
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}
}