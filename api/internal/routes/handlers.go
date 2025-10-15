package routes

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"github.com/tracr/api/internal/models"
)

// RegisterDevice handles device registration and token generation
func (h *Handler) RegisterDevice(c *fiber.Ctx) error {
	var req models.DeviceRegistration
	
	if err := c.BodyParser(&req); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := ValidateStruct(req); err != nil {
		return ValidationErrorResponse(c, err)
	}

	// Generate secure device token
	token, err := GenerateDeviceToken()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate device token")
	}

	tokenHash := HashToken(token)

	// Check if device exists by hostname
	existingDevice, err := FindDeviceByHostname(h.DB, req.Hostname)
	if err != nil && err != sql.ErrNoRows {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	var deviceID uuid.UUID

	if existingDevice != nil {
		// Device exists, update token and return existing device_id
		deviceID = existingDevice.ID
		if err := UpdateDeviceToken(h.DB, deviceID, tokenHash); err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update device token")
		}
	} else {
		// New device, create it
		deviceID = uuid.New()
		device := &models.Device{
			ID:              deviceID,
			Hostname:        req.Hostname,
			OSVersion:       req.OSVersion,
			DeviceTokenHash: tokenHash,
			FirstSeen:       time.Now().UTC(),
			LastSeen:        time.Now().UTC(),
			Status:          models.DeviceStatusActive,
			TokenCreatedAt:  time.Now().UTC(),
		}

		if err := CreateDevice(h.DB, device); err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create device")
		}
	}

	response := models.DeviceRegistrationResponse{
		DeviceID:    deviceID,
		DeviceToken: token,
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// SubmitInventory handles inventory data submission with deduplication
func (h *Handler) SubmitInventory(c *fiber.Ctx) error {
	// Extract device from context (set by DeviceAuth middleware)
	device := c.Locals("device").(*models.Device)

	var req models.InventorySubmission
	if err := c.BodyParser(&req); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	log.Printf("[INFO] Processing inventory submission: device_id=%s, hostname=%s, volumes=%d, software=%d, timestamp=%v", 
		device.ID, device.Hostname, len(req.Volumes), len(req.Software), time.Now())

	if err := ValidateStruct(req); err != nil {
		return ValidationErrorResponse(c, err)
	}

	// Calculate snapshot hash for deduplication
	snapshotHash, err := CalculateSnapshotHash(&req)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to calculate snapshot hash")
	}

	// Check if snapshot with same hash exists for this device
	existingSnapshot, err := FindSnapshotByHash(h.DB, device.ID, snapshotHash)
	if err != nil && err != sql.ErrNoRows {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	if existingSnapshot != nil {
		// Duplicate snapshot, return existing ID
		log.Printf("[INFO] Duplicate snapshot detected: device_id=%s, existing_snapshot_id=%s, collected_at=%v", 
			device.ID, existingSnapshot.ID, existingSnapshot.CollectedAt)
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"snapshot_id": existingSnapshot.ID,
			"message":     "Duplicate snapshot, no changes recorded",
		})
	}

	// Begin transaction for atomic operations
	tx, err := h.DB.Beginx()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to begin transaction")
	}
	defer tx.Rollback()

	// Create new snapshot
	snapshotID := uuid.New()
	snapshot := &models.Snapshot{
		ID:           snapshotID,
		DeviceID:     device.ID,
		CollectedAt:  req.CollectedAt,
		AgentVersion: req.AgentVersion,
		SnapshotHash: snapshotHash,
	}
	
	// Set pointer fields for performance data
	cpu := req.Performance.CPUPercent
	snapshot.CPUPercent = &cpu
	mu := req.Performance.MemoryUsedBytes
	snapshot.MemoryUsedBytes = &mu
	mt := req.Performance.MemoryTotalBytes
	snapshot.MemoryTotalBytes = &mt
	
	// Set boot time and last interactive user
	bt := req.Identity.BootTime
	snapshot.BootTime = &bt
	snapshot.LastInteractiveUser = req.Identity.LastInteractiveUser

	if _, err := CreateSnapshot(tx, snapshot); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create snapshot")
	}

	log.Printf("[INFO] Created new snapshot: snapshot_id=%s, hash=%s, collected_at=%v", 
		snapshotID, snapshotHash, snapshot.CollectedAt)

	// Insert volumes
	if len(req.Volumes) > 0 {
		if err := CreateVolumes(tx, snapshotID, req.Volumes); err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create volumes")
		}
	}

	// Insert software items
	if len(req.Software) > 0 {
		if err := CreateSoftwareItems(tx, snapshotID, req.Software); err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create software items")
		}
	}

	// Update device information from inventory
	if err := UpdateDeviceFromInventory(tx, device.ID, &req); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update device information")
	}

	log.Printf("[INFO] Updated device information: device_id=%s, hostname=%s, os_version=%s %s, last_seen=%v", 
		device.ID, req.Identity.Hostname, req.OS.Caption, req.OS.Version, time.Now())

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("[ERROR] Transaction commit failed: device_id=%s, hostname=%s, error=%v, hint=Check database constraints", 
			device.ID, device.Hostname, err)
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to commit transaction")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"snapshot_id": snapshotID,
	})
}

// Heartbeat updates device last seen timestamp
func (h *Handler) Heartbeat(c *fiber.Ctx) error {
	device := c.Locals("device").(*models.Device)

	if err := UpdateDeviceLastSeen(h.DB, device.ID); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update heartbeat")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Heartbeat received",
	})
}

// PollCommands returns pending commands for the device
func (h *Handler) PollCommands(c *fiber.Ctx) error {
	device := c.Locals("device").(*models.Device)

	// Expire old commands first (older than 5 minutes)
	if err := ExpireOldCommands(h.DB, device.ID, 5*time.Minute); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to expire old commands")
	}

	// Get pending commands
	commands, err := GetPendingCommands(h.DB, device.ID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve commands")
	}

	return c.Status(fiber.StatusOK).JSON(commands)
}

// AckCommand acknowledges command execution result
func (h *Handler) AckCommand(c *fiber.Ctx) error {
	device := c.Locals("device").(*models.Device)
	
	commandIDStr := c.Params("command_id")
	commandID, err := uuid.Parse(commandIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid command ID")
	}

	var result models.CommandResult
	if err := c.BodyParser(&result); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := ValidateStruct(result); err != nil {
		return ValidationErrorResponse(c, err)
	}

	// Validate command belongs to this device
	isValid, err := ValidateCommandOwnership(h.DB, commandID, device.ID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to validate command ownership")
	}
	if !isValid {
		return ErrorResponse(c, fiber.StatusNotFound, "Command not found")
	}

	// Determine status based on result
	var status models.CommandStatus
	if result.Success {
		status = models.CommandStatusCompleted
	} else {
		status = models.CommandStatusFailed
	}

	// Update command with result
	if err := UpdateCommandStatus(h.DB, commandID, status, &result); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update command status")
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Command acknowledgment received",
	})
}

// Login handles user authentication
func (h *Handler) Login(c *fiber.Ctx) error {
	var req models.UserLogin
	
	if err := c.BodyParser(&req); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := ValidateStruct(req); err != nil {
		return ValidationErrorResponse(c, err)
	}

	// Find user by username
	user, err := FindUserByUsername(h.DB, req.Username)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusUnauthorized, "Invalid username or password")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return ErrorResponse(c, fiber.StatusUnauthorized, "Invalid username or password")
	}

	// Generate JWT token
	token, expiresAt, err := GenerateJWTToken(user, h.Config)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate token")
	}

	// Set JWT token in cookie
	c.Cookie(&fiber.Cookie{
		Name:     "jwt_token",
		Value:    token,
		Expires:  expiresAt,
		HTTPOnly: true,
		Secure:   true,
		SameSite: fiber.CookieSameSiteLaxMode,
	})

	// Return response without password hash
	userResponse := *user
	userResponse.PasswordHash = ""

	response := models.LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      userResponse,
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// ListUsers handles user listing with pagination
func (h *Handler) ListUsers(c *fiber.Ctx) error {
	// Extract pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit

	// Get users with pagination
	users, err := ListUsers(h.DB, offset, limit)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve users")
	}

	// Get total count
	total, err := CountUsers(h.DB)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count users")
	}

	totalPages := (total + limit - 1) / limit

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": users,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

// CreateUser handles user creation
func (h *Handler) CreateUser(c *fiber.Ctx) error {
	var req models.UserRegistration
	
	if err := c.BodyParser(&req); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := ValidateStruct(req); err != nil {
		return ValidationErrorResponse(c, err)
	}

	// Check if username already exists
	existingUser, err := FindUserByUsername(h.DB, req.Username)
	if err != nil && err != sql.ErrNoRows {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}
	if existingUser != nil {
		return ErrorResponse(c, fiber.StatusConflict, "Username already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to hash password")
	}

	// Create user
	user := &models.User{
		ID:           uuid.New(),
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	if err := CreateUser(h.DB, user); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create user")
	}

	// Return user without password hash
	userResponse := *user
	userResponse.PasswordHash = ""

	return c.Status(fiber.StatusCreated).JSON(userResponse)
}

// GetUser handles retrieving a specific user
func (h *Handler) GetUser(c *fiber.Ctx) error {
	userIDStr := c.Params("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid user ID")
	}

	user, err := FindUserByID(h.DB, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "User not found")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	// Return user without password hash
	userResponse := *user
	userResponse.PasswordHash = ""

	return c.Status(fiber.StatusOK).JSON(userResponse)
}

// UpdateUser handles user updates
func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	userIDStr := c.Params("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid user ID")
	}

	var req models.UserUpdate
	if err := c.BodyParser(&req); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := ValidateStruct(req); err != nil {
		return ValidationErrorResponse(c, err)
	}

	// Hash password if provided
	if req.Password != nil && *req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), 12)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to hash password")
		}
		hashStr := string(hashedPassword)
		req.Password = &hashStr
	}

	// Update user
	if err := UpdateUser(h.DB, userID, &req); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update user")
	}

	// Get updated user
	updatedUser, err := FindUserByID(h.DB, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve updated user")
	}

	// Return user without password hash
	userResponse := *updatedUser
	userResponse.PasswordHash = ""

	return c.Status(fiber.StatusOK).JSON(userResponse)
}

// DeleteUser handles user deletion
func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	userIDStr := c.Params("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid user ID")
	}

	// Check if user exists
	user, err := FindUserByID(h.DB, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "User not found")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	// Prevent deletion of last admin user
	if user.Role == models.UserRoleAdmin {
		adminCount, err := CountAdminUsers(h.DB)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to check admin count")
		}
		if adminCount <= 1 {
			return ErrorResponse(c, fiber.StatusBadRequest, "Cannot delete the last admin user")
		}
	}

	// Delete user
	if err := DeleteUser(h.DB, userID); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete user")
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ListDevices handles device listing with pagination, search, and filtering
func (h *Handler) ListDevices(c *fiber.Ctx) error {
	// Extract pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit

	// Extract optional search and status filters
	search := c.Query("search")
	status := c.Query("status")

	log.Printf("[DEBUG] ListDevices request: page=%d, limit=%d, offset=%d, search='%s', status='%s'", 
		page, limit, offset, search, status)

	// Get devices with filters and pagination
	devices, err := ListDevices(h.DB, offset, limit, search, status)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve devices")
	}

	log.Printf("[DEBUG] Retrieved %d devices from database", len(devices))

	// Convert to DeviceListItem with computed fields
	var deviceItems []models.DeviceListItem
	for _, device := range devices {
		// Get latest snapshot summary
		latestSnapshot, _ := GetLatestSnapshotSummary(h.DB, device.ID)

		// Calculate computed fields
		isOnline := CalculateDeviceOnlineStatus(device.LastSeen)
		uptimeHours := 0
		if latestSnapshot != nil && latestSnapshot.BootTime != nil {
			uptimeHours = CalculateUptimeHours(latestSnapshot.BootTime)
		}

		deviceItem := models.DeviceListItem{
			Device:         device,
			LatestSnapshot: latestSnapshot,
			IsOnline:       isOnline,
			UptimeHours:    uptimeHours,
		}
		deviceItems = append(deviceItems, deviceItem)
	}

	// Get total count
	total, err := CountDevices(h.DB, search, status)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count devices")
	}

	totalPages := (total + limit - 1) / limit

	log.Printf("[DEBUG] Total devices in database: %d, calculated total_pages: %d", total, totalPages)

	// Log first few device hostnames for verification
	hostnames := make([]string, 0, len(deviceItems))
	for i, item := range deviceItems {
		if i >= 3 { // Log up to 3 hostnames
			break
		}
		hostnames = append(hostnames, item.Hostname)
	}
	log.Printf("[DEBUG] Returning devices to frontend: count=%d, hostnames=%v, pagination=%v", 
		len(deviceItems), hostnames, fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": deviceItems,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

// GetDevice handles retrieving a specific device with latest snapshot
func (h *Handler) GetDevice(c *fiber.Ctx) error {
	deviceIDStr := c.Params("device_id")
	deviceID, err := uuid.Parse(deviceIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid device ID")
	}

	device, err := FindDeviceByID(h.DB, deviceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Device not found")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	// Get latest snapshot summary
	latestSnapshot, _ := GetLatestSnapshotSummary(h.DB, device.ID)

	// Calculate computed fields
	isOnline := CalculateDeviceOnlineStatus(device.LastSeen)
	uptimeHours := 0
	if latestSnapshot != nil && latestSnapshot.BootTime != nil {
		uptimeHours = CalculateUptimeHours(latestSnapshot.BootTime)
	}

	deviceItem := models.DeviceListItem{
		Device:         *device,
		LatestSnapshot: latestSnapshot,
		IsOnline:       isOnline,
		UptimeHours:    uptimeHours,
	}

	return c.Status(fiber.StatusOK).JSON(deviceItem)
}

// ListSnapshots handles listing snapshots for a specific device
func (h *Handler) ListSnapshots(c *fiber.Ctx) error {
	deviceIDStr := c.Params("device_id")
	deviceID, err := uuid.Parse(deviceIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid device ID")
	}

	// Verify device exists
	_, err = FindDeviceByID(h.DB, deviceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Device not found")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	// Extract pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit

	// Get snapshots with pagination
	snapshots, err := ListSnapshotsByDevice(h.DB, deviceID, offset, limit)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve snapshots")
	}

	// Get total count
	total, err := CountSnapshotsByDevice(h.DB, deviceID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count snapshots")
	}

	totalPages := (total + limit - 1) / limit

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": snapshots,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

// GetSnapshot handles retrieving a specific snapshot with volumes and software
func (h *Handler) GetSnapshot(c *fiber.Ctx) error {
	deviceIDStr := c.Params("device_id")
	deviceID, err := uuid.Parse(deviceIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid device ID")
	}

	snapshotIDStr := c.Params("snapshot_id")
	snapshotID, err := uuid.Parse(snapshotIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid snapshot ID")
	}

	// Get snapshot
	snapshot, err := FindSnapshotByID(h.DB, snapshotID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Snapshot not found")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	// Verify snapshot belongs to specified device
	if snapshot.DeviceID != deviceID {
		return ErrorResponse(c, fiber.StatusNotFound, "Snapshot not found")
	}

	// Get volumes for this snapshot
	volumes, err := GetVolumesBySnapshot(h.DB, snapshotID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve volumes")
	}

	// Calculate computed fields for each volume
	for i := range volumes {
		CalculateVolumeUsage(&volumes[i])
	}

	// Get software items for this snapshot
	software, err := GetSoftwareBySnapshot(h.DB, snapshotID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve software")
	}

	// Populate related data
	snapshot.Volumes = volumes
	snapshot.Software = software

	return c.Status(fiber.StatusOK).JSON(snapshot)
}

// CreateCommand handles creating a new command for a device
func (h *Handler) CreateCommand(c *fiber.Ctx) error {
	deviceIDStr := c.Params("device_id")
	deviceID, err := uuid.Parse(deviceIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid device ID")
	}

	// Verify device exists
	_, err = FindDeviceByID(h.DB, deviceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Device not found")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	var req models.CommandRequest
	if err := c.BodyParser(&req); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if err := ValidateStruct(req); err != nil {
		return ValidationErrorResponse(c, err)
	}

	// Validate command type
	if req.CommandType != models.CommandTypeRefreshNow {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid command type")
	}

	// Create command
	command := &models.Command{
		ID:          uuid.New(),
		DeviceID:    deviceID,
		CommandType: req.CommandType,
		Payload:     req.Payload,
		Status:      models.CommandStatusQueued,
		CreatedAt:   time.Now().UTC(),
	}

	if err := CreateCommand(h.DB, command); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create command")
	}

	// Log audit entry
	if err := LogAuditAction(h.DB, c, "create_command", &deviceID, command); err != nil {
		// Log error but don't fail the request
		// In production, you might want to log this error to monitoring system
	}

	return c.Status(fiber.StatusCreated).JSON(command)
}

// ListDeviceCommands handles listing commands for a specific device
func (h *Handler) ListDeviceCommands(c *fiber.Ctx) error {
	deviceIDStr := c.Params("device_id")
	deviceID, err := uuid.Parse(deviceIDStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid device ID")
	}

	// Verify device exists
	_, err = FindDeviceByID(h.DB, deviceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Device not found")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	// Extract pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit

	// Extract optional status filter
	status := c.Query("status")

	// Get commands with pagination and filters
	commands, err := ListCommandsByDevice(h.DB, deviceID, offset, limit, status)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve commands")
	}

	// Get total count
	total, err := CountCommandsByDevice(h.DB, deviceID, status)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count commands")
	}

	totalPages := (total + limit - 1) / limit

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": commands,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

// ListSoftwareCatalog handles listing software catalog with aggregation
func (h *Handler) ListSoftwareCatalog(c *fiber.Ctx) error {
	// Extract pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit

	// Extract optional filters
	search := c.Query("search")
	publisher := c.Query("publisher")
	sortBy := c.Query("sort", "device_count")

	// Validate sort parameter
	validSorts := map[string]bool{
		"name":         true,
		"device_count": true,
		"latest_seen":  true,
	}
	if !validSorts[sortBy] {
		sortBy = "device_count"
	}

	// Get software catalog with filters and pagination
	catalog, err := ListSoftwareCatalog(h.DB, offset, limit, search, publisher, sortBy)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve software catalog")
	}

	// Get total count
	total, err := CountSoftwareCatalog(h.DB, search, publisher)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count software items")
	}

	totalPages := (total + limit - 1) / limit

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": catalog,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

// ListAuditLogs handles listing audit logs with filtering
func (h *Handler) ListAuditLogs(c *fiber.Ctx) error {
	// Extract pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	
	offset := (page - 1) * limit

	// Extract optional filter parameters
	var userID, deviceID *uuid.UUID
	var startDate, endDate *time.Time

	if userIDStr := c.Query("user_id"); userIDStr != "" {
		parsed, err := uuid.Parse(userIDStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Invalid user_id parameter")
		}
		userID = &parsed
	}

	if deviceIDStr := c.Query("device_id"); deviceIDStr != "" {
		parsed, err := uuid.Parse(deviceIDStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Invalid device_id parameter")
		}
		deviceID = &parsed
	}

	action := c.Query("action")

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		parsed, err := time.Parse(time.RFC3339, startDateStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Invalid start_date parameter, use RFC3339 format")
		}
		startDate = &parsed
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		parsed, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Invalid end_date parameter, use RFC3339 format")
		}
		endDate = &parsed
	}

	// Get audit logs with filters and pagination
	auditLogs, err := ListAuditLogs(h.DB, offset, limit, userID, deviceID, action, startDate, endDate)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve audit logs")
	}

	// Get total count
	total, err := CountAuditLogs(h.DB, userID, deviceID, action, startDate, endDate)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count audit logs")
	}

	totalPages := (total + limit - 1) / limit

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": auditLogs,
		"pagination": fiber.Map{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
	})
}

// DeleteDevice handles device deletion
func (h *Handler) DeleteDevice(c *fiber.Ctx) error {
	deviceIDStr := c.Params("device_id")
	
	var device *models.Device
	var deviceID uuid.UUID
	var err error
	
	// Try to parse as UUID first
	if parsedID, parseErr := uuid.Parse(deviceIDStr); parseErr == nil {
		// Valid UUID, find device by ID
		deviceID = parsedID
		device, err = FindDeviceByID(h.DB, deviceID)
		if err != nil {
			return ErrorResponse(c, fiber.StatusNotFound, "Device not found")
		}
	} else {
		// Not a valid UUID, treat as hostname
		log.Printf("[INFO] Device ID %s is not a valid UUID, looking up by hostname", deviceIDStr)
		device, err = FindDeviceByHostname(h.DB, deviceIDStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusNotFound, "Device not found")
		}
		deviceID = device.ID
	}
	
	if device == nil {
		return ErrorResponse(c, fiber.StatusNotFound, "Device not found")
	}

	// Delete device (this will cascade delete related records)
	if err := DeleteDevice(h.DB, deviceID); err != nil {
		log.Printf("[ERROR] Failed to delete device %s: %v", deviceID, err)
		return ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete device")
	}

	// Log the deletion
	log.Printf("[INFO] Device deleted: %s (%s)", device.Hostname, deviceID)

	// Log audit event
	LogAuditAction(h.DB, c, "delete_device", &deviceID, fiber.Map{
		"hostname": device.Hostname,
	})

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Device %s deleted successfully", device.Hostname),
	})
}