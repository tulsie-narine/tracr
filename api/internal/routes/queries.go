package routes

import (
	"database/sql"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/tracr/api/internal/models"
)

// Device queries

// FindDeviceByHostname retrieves a device by its hostname
func FindDeviceByHostname(db *sqlx.DB, hostname string) (*models.Device, error) {
	var device models.Device
	query := `SELECT * FROM devices WHERE hostname = $1`
	err := db.Get(&device, query, hostname)
	if err != nil {
		return nil, err
	}
	return &device, nil
}

// CreateDevice inserts a new device into the database
func CreateDevice(db *sqlx.DB, device *models.Device) error {
	query := `
		INSERT INTO devices (
			id, hostname, domain, manufacturer, model, serial_number,
			os_caption, os_version, os_build, device_token_hash,
			first_seen, last_seen, status, token_created_at
		) VALUES (
			:id, :hostname, :domain, :manufacturer, :model, :serial_number,
			:os_caption, :os_version, :os_build, :device_token_hash,
			:first_seen, :last_seen, :status, :token_created_at
		)`
	
	_, err := db.NamedExec(query, device)
	return err
}

// UpdateDeviceLastSeen updates the last_seen timestamp for a device
func UpdateDeviceLastSeen(db *sqlx.DB, deviceID uuid.UUID) error {
	query := `UPDATE devices SET last_seen = NOW(), status = 'active' WHERE id = $1`
	_, err := db.Exec(query, deviceID)
	return err
}

// UpdateDeviceFromInventory updates device information from inventory data
func UpdateDeviceFromInventory(tx *sqlx.Tx, deviceID uuid.UUID, inventory *models.InventorySubmission) error {
	query := `
		UPDATE devices SET
			hostname = $2,
			domain = $3,
			manufacturer = $4,
			model = $5,
			serial_number = $6,
			os_caption = $7,
			os_version = $8,
			os_build = $9,
			last_seen = NOW()
		WHERE id = $1`
	
	_, err := tx.Exec(query,
		deviceID,
		inventory.Identity.Hostname,
		inventory.Identity.Domain,
		inventory.Hardware.Manufacturer,
		inventory.Hardware.Model,
		inventory.Hardware.SerialNumber,
		inventory.OS.Caption,
		inventory.OS.Version,
		inventory.OS.BuildNumber,
	)
	return err
}

// UpdateDeviceToken updates the device token hash and creation timestamp
func UpdateDeviceToken(db *sqlx.DB, deviceID uuid.UUID, tokenHash string) error {
	query := `UPDATE devices SET device_token_hash = $2, token_created_at = NOW() WHERE id = $1`
	_, err := db.Exec(query, deviceID, tokenHash)
	return err
}

// FindDeviceByID retrieves a device by its ID
func FindDeviceByID(db *sqlx.DB, deviceID uuid.UUID) (*models.Device, error) {
	var device models.Device
	query := `SELECT * FROM devices WHERE id = $1`
	err := db.Get(&device, query, deviceID)
	if err != nil {
		return nil, err
	}
	return &device, nil
}

// ListDevices retrieves devices with optional search and status filters
func ListDevices(db *sqlx.DB, offset, limit int, search, status string) ([]models.Device, error) {
	var devices []models.Device
	var args []interface{}
	var whereClauses []string
	argCount := 1

	// Build dynamic WHERE clause
	if search != "" {
		whereClauses = append(whereClauses, "hostname ILIKE '%' || $"+strconv.Itoa(argCount) + " || '%'")
		args = append(args, search)
		argCount++
	}

	if status != "" {
		whereClauses = append(whereClauses, "status = $"+strconv.Itoa(argCount))
		args = append(args, status)
		argCount++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query := "SELECT * FROM devices" + whereClause + " ORDER BY last_seen DESC LIMIT $" + strconv.Itoa(argCount) + " OFFSET $" + strconv.Itoa(argCount+1)
	args = append(args, limit, offset)

	err := db.Select(&devices, query, args...)
	if err != nil {
		return nil, err
	}

	// Return empty slice if no devices found
	if devices == nil {
		devices = []models.Device{}
	}

	return devices, nil
}

// CountDevices returns the total number of devices with optional filters
func CountDevices(db *sqlx.DB, search, status string) (int, error) {
	var count int
	var args []interface{}
	var whereClauses []string
	argCount := 1

	// Build same dynamic WHERE clause as ListDevices
	if search != "" {
		whereClauses = append(whereClauses, "hostname ILIKE '%' || $"+strconv.Itoa(argCount) + " || '%'")
		args = append(args, search)
		argCount++
	}

	if status != "" {
		whereClauses = append(whereClauses, "status = $"+strconv.Itoa(argCount))
		args = append(args, status)
		argCount++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query := "SELECT COUNT(*) FROM devices" + whereClause
	err := db.Get(&count, query, args...)
	return count, err
}

// Snapshot queries

// FindSnapshotByHash retrieves a snapshot by device ID and hash
func FindSnapshotByHash(db *sqlx.DB, deviceID uuid.UUID, hash string) (*models.Snapshot, error) {
	var snapshot models.Snapshot
	query := `SELECT * FROM snapshots WHERE device_id = $1 AND snapshot_hash = $2`
	err := db.Get(&snapshot, query, deviceID, hash)
	if err != nil {
		return nil, err
	}
	return &snapshot, nil
}

// CreateSnapshot inserts a new snapshot and returns the generated ID
func CreateSnapshot(tx *sqlx.Tx, snapshot *models.Snapshot) (uuid.UUID, error) {
	query := `
		INSERT INTO snapshots (
			id, device_id, collected_at, agent_version, snapshot_hash,
			cpu_percent, memory_used_bytes, memory_total_bytes,
			boot_time, last_interactive_user
		) VALUES (
			:id, :device_id, :collected_at, :agent_version, :snapshot_hash,
			:cpu_percent, :memory_used_bytes, :memory_total_bytes,
			:boot_time, :last_interactive_user
		) RETURNING id`
	
	rows, err := tx.NamedQuery(query, snapshot)
	if err != nil {
		return uuid.Nil, err
	}
	defer rows.Close()
	
	var id uuid.UUID
	if rows.Next() {
		err = rows.Scan(&id)
	}
	return id, err
}

// CreateVolumes batch inserts volumes for a snapshot
func CreateVolumes(tx *sqlx.Tx, snapshotID uuid.UUID, volumes []models.Volume) error {
	if len(volumes) == 0 {
		return nil
	}
	
	query := `
		INSERT INTO volumes (id, snapshot_id, name, filesystem, total_bytes, free_bytes)
		VALUES (:id, :snapshot_id, :name, :filesystem, :total_bytes, :free_bytes)`
	
	// Add snapshot_id and generate UUIDs for each volume
	for i := range volumes {
		volumes[i].ID = uuid.New()
		volumes[i].SnapshotID = snapshotID
	}
	
	_, err := tx.NamedExec(query, volumes)
	return err
}

// CreateSoftwareItems batch inserts software items for a snapshot
func CreateSoftwareItems(tx *sqlx.Tx, snapshotID uuid.UUID, software []models.Software) error {
	if len(software) == 0 {
		return nil
	}
	
	query := `
		INSERT INTO software_items (id, snapshot_id, name, version, publisher, install_date, size_kb)
		VALUES (:id, :snapshot_id, :name, :version, :publisher, :install_date, :size_kb)`
	
	// Add snapshot_id and generate UUIDs for each software item
	for i := range software {
		software[i].ID = uuid.New()
		software[i].SnapshotID = snapshotID
	}
	
	_, err := tx.NamedExec(query, software)
	return err
}

// GetLatestSnapshotSummary retrieves the most recent snapshot summary for a device
func GetLatestSnapshotSummary(db *sqlx.DB, deviceID uuid.UUID) (*models.SnapshotSummary, error) {
	var summary models.SnapshotSummary
	query := `
		SELECT id, collected_at, cpu_percent, memory_used_bytes, memory_total_bytes, boot_time
		FROM snapshots 
		WHERE device_id = $1 
		ORDER BY collected_at DESC 
		LIMIT 1`
	
	err := db.Get(&summary, query, deviceID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No snapshots exist, return nil instead of error
		}
		return nil, err
	}
	return &summary, nil
}

// FindSnapshotByID retrieves a snapshot by its ID
func FindSnapshotByID(db *sqlx.DB, snapshotID uuid.UUID) (*models.Snapshot, error) {
	var snapshot models.Snapshot
	query := `SELECT * FROM snapshots WHERE id = $1`
	err := db.Get(&snapshot, query, snapshotID)
	if err != nil {
		return nil, err
	}
	return &snapshot, nil
}

// ListSnapshotsByDevice retrieves snapshot summaries for a device with pagination
func ListSnapshotsByDevice(db *sqlx.DB, deviceID uuid.UUID, offset, limit int) ([]models.SnapshotSummary, error) {
	var summaries []models.SnapshotSummary
	query := `
		SELECT id, collected_at, cpu_percent, memory_used_bytes, memory_total_bytes, boot_time
		FROM snapshots 
		WHERE device_id = $1 
		ORDER BY collected_at DESC 
		LIMIT $2 OFFSET $3`
	
	err := db.Select(&summaries, query, deviceID, limit, offset)
	if err != nil {
		return nil, err
	}
	
	// Return empty slice if no snapshots found
	if summaries == nil {
		summaries = []models.SnapshotSummary{}
	}
	
	return summaries, nil
}

// CountSnapshotsByDevice returns the number of snapshots for a device
func CountSnapshotsByDevice(db *sqlx.DB, deviceID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM snapshots WHERE device_id = $1`
	err := db.Get(&count, query, deviceID)
	return count, err
}

// GetVolumesBySnapshot retrieves volumes for a snapshot
func GetVolumesBySnapshot(db *sqlx.DB, snapshotID uuid.UUID) ([]models.Volume, error) {
	var volumes []models.Volume
	query := `SELECT * FROM volumes WHERE snapshot_id = $1 ORDER BY name ASC`
	
	err := db.Select(&volumes, query, snapshotID)
	if err != nil {
		return nil, err
	}
	
	// Return empty slice if no volumes found
	if volumes == nil {
		volumes = []models.Volume{}
	}
	
	return volumes, nil
}

// GetSoftwareBySnapshot retrieves software items for a snapshot
func GetSoftwareBySnapshot(db *sqlx.DB, snapshotID uuid.UUID) ([]models.Software, error) {
	var software []models.Software
	query := `SELECT * FROM software_items WHERE snapshot_id = $1 ORDER BY name ASC`
	
	err := db.Select(&software, query, snapshotID)
	if err != nil {
		return nil, err
	}
	
	// Return empty slice if no software found
	if software == nil {
		software = []models.Software{}
	}
	
	return software, nil
}

// Command queries

// CreateCommand inserts a new command into the database
func CreateCommand(db *sqlx.DB, command *models.Command) error {
	query := `
		INSERT INTO commands (id, device_id, command_type, payload, status, created_at)
		VALUES (:id, :device_id, :command_type, :payload, :status, :created_at)`
	
	_, err := db.NamedExec(query, command)
	return err
}

// ListCommandsByDevice retrieves commands for a device with optional status filter
func ListCommandsByDevice(db *sqlx.DB, deviceID uuid.UUID, offset, limit int, status string) ([]models.Command, error) {
	var commands []models.Command
	var args []interface{}
	argCount := 2

	whereClause := "WHERE device_id = $1"
	args = append(args, deviceID)

	if status != "" {
		argCount++
		whereClause += " AND status = $" + strconv.Itoa(argCount)
		args = append(args, status)
	}

	query := "SELECT * FROM commands " + whereClause + " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(argCount+1) + " OFFSET $" + strconv.Itoa(argCount+2)
	args = append(args, limit, offset)

	err := db.Select(&commands, query, args...)
	if err != nil {
		return nil, err
	}

	// Return empty slice if no commands found
	if commands == nil {
		commands = []models.Command{}
	}

	return commands, nil
}

// CountCommandsByDevice returns the number of commands for a device with optional status filter
func CountCommandsByDevice(db *sqlx.DB, deviceID uuid.UUID, status string) (int, error) {
	var count int
	var args []interface{}
	argCount := 1

	whereClause := "WHERE device_id = $1"
	args = append(args, deviceID)

	if status != "" {
		argCount++
		whereClause += " AND status = $" + strconv.Itoa(argCount)
		args = append(args, status)
	}

	query := "SELECT COUNT(*) FROM commands " + whereClause
	err := db.Get(&count, query, args...)
	return count, err
}

// Software catalog queries

// ListSoftwareCatalog retrieves aggregated software catalog with filters
func ListSoftwareCatalog(db *sqlx.DB, offset, limit int, search, publisher, sortBy string) ([]models.SoftwareCatalogItem, error) {
	var catalog []models.SoftwareCatalogItem
	var args []interface{}
	var whereClauses []string
	argCount := 1

	// Build dynamic WHERE clause
	if search != "" {
		whereClauses = append(whereClauses, "si.name ILIKE '%' || $"+strconv.Itoa(argCount)+" || '%'")
		args = append(args, search)
		argCount++
	}

	if publisher != "" {
		whereClauses = append(whereClauses, "si.publisher = $"+strconv.Itoa(argCount))
		args = append(args, publisher)
		argCount++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Build ORDER BY clause
	var orderBy string
	switch sortBy {
	case "name":
		orderBy = "si.name ASC"
	case "latest_seen":
		orderBy = "latest_seen DESC"
	default: // "device_count"
		orderBy = "device_count DESC"
	}

	query := `
		SELECT 
			si.name, 
			si.version, 
			si.publisher,
			COUNT(DISTINCT s.device_id) as device_count,
			MAX(s.collected_at) as latest_seen
		FROM software_items si
		JOIN snapshots s ON si.snapshot_id = s.id` +
		whereClause +
		` GROUP BY si.name, si.version, si.publisher
		ORDER BY ` + orderBy +
		` LIMIT $` + strconv.Itoa(argCount) + ` OFFSET $` + strconv.Itoa(argCount+1)

	args = append(args, limit, offset)

	err := db.Select(&catalog, query, args...)
	if err != nil {
		return nil, err
	}

	// Return empty slice if no software found
	if catalog == nil {
		catalog = []models.SoftwareCatalogItem{}
	}

	return catalog, nil
}

// CountSoftwareCatalog returns the count of unique software items with filters
func CountSoftwareCatalog(db *sqlx.DB, search, publisher string) (int, error) {
	var count int
	var args []interface{}
	var whereClauses []string
	argCount := 1

	// Build same dynamic WHERE clause as ListSoftwareCatalog
	if search != "" {
		whereClauses = append(whereClauses, "si.name ILIKE '%' || $"+strconv.Itoa(argCount)+" || '%'")
		args = append(args, search)
		argCount++
	}

	if publisher != "" {
		whereClauses = append(whereClauses, "si.publisher = $"+strconv.Itoa(argCount))
		args = append(args, publisher)
		argCount++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query := `
		SELECT COUNT(*) FROM (
			SELECT si.name, si.version, si.publisher
			FROM software_items si
			JOIN snapshots s ON si.snapshot_id = s.id` +
		whereClause +
		` GROUP BY si.name, si.version, si.publisher
		) AS catalog`

	err := db.Get(&count, query, args...)
	return count, err
}

// Audit log queries

// ListAuditLogs retrieves audit logs with filters and joined data
func ListAuditLogs(db *sqlx.DB, offset, limit int, userID, deviceID *uuid.UUID, action string, startDate, endDate *time.Time) ([]models.AuditLogListItem, error) {
	var auditLogs []models.AuditLogListItem
	var args []interface{}
	var whereClauses []string
	argCount := 1

	// Build dynamic WHERE clause
	if userID != nil {
		whereClauses = append(whereClauses, "al.user_id = $"+strconv.Itoa(argCount))
		args = append(args, *userID)
		argCount++
	}

	if deviceID != nil {
		whereClauses = append(whereClauses, "al.device_id = $"+strconv.Itoa(argCount))
		args = append(args, *deviceID)
		argCount++
	}

	if action != "" {
		whereClauses = append(whereClauses, "al.action = $"+strconv.Itoa(argCount))
		args = append(args, action)
		argCount++
	}

	if startDate != nil {
		whereClauses = append(whereClauses, "al.timestamp >= $"+strconv.Itoa(argCount))
		args = append(args, *startDate)
		argCount++
	}

	if endDate != nil {
		whereClauses = append(whereClauses, "al.timestamp <= $"+strconv.Itoa(argCount))
		args = append(args, *endDate)
		argCount++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query := `
		SELECT 
			al.id, al.user_id, al.device_id, al.action, al.details, 
			al.timestamp, al.ip_address, al.user_agent,
			u.username,
			d.hostname
		FROM audit_logs al
		LEFT JOIN users u ON al.user_id = u.id
		LEFT JOIN devices d ON al.device_id = d.id` +
		whereClause +
		` ORDER BY al.timestamp DESC
		LIMIT $` + strconv.Itoa(argCount) + ` OFFSET $` + strconv.Itoa(argCount+1)

	args = append(args, limit, offset)

	err := db.Select(&auditLogs, query, args...)
	if err != nil {
		return nil, err
	}

	// Return empty slice if no logs found
	if auditLogs == nil {
		auditLogs = []models.AuditLogListItem{}
	}

	return auditLogs, nil
}

// CountAuditLogs returns the count of audit logs with filters
func CountAuditLogs(db *sqlx.DB, userID, deviceID *uuid.UUID, action string, startDate, endDate *time.Time) (int, error) {
	var count int
	var args []interface{}
	var whereClauses []string
	argCount := 1

	// Build same dynamic WHERE clause as ListAuditLogs
	if userID != nil {
		whereClauses = append(whereClauses, "user_id = $"+strconv.Itoa(argCount))
		args = append(args, *userID)
		argCount++
	}

	if deviceID != nil {
		whereClauses = append(whereClauses, "device_id = $"+strconv.Itoa(argCount))
		args = append(args, *deviceID)
		argCount++
	}

	if action != "" {
		whereClauses = append(whereClauses, "action = $"+strconv.Itoa(argCount))
		args = append(args, action)
		argCount++
	}

	if startDate != nil {
		whereClauses = append(whereClauses, "timestamp >= $"+strconv.Itoa(argCount))
		args = append(args, *startDate)
		argCount++
	}

	if endDate != nil {
		whereClauses = append(whereClauses, "timestamp <= $"+strconv.Itoa(argCount))
		args = append(args, *endDate)
		argCount++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	query := "SELECT COUNT(*) FROM audit_logs" + whereClause
	err := db.Get(&count, query, args...)
	return count, err
}

// CreateAuditLog inserts a new audit log entry
func CreateAuditLog(db *sqlx.DB, auditLog *models.AuditLog) error {
	query := `
		INSERT INTO audit_logs (id, user_id, device_id, action, details, timestamp, ip_address, user_agent)
		VALUES (:id, :user_id, :device_id, :action, :details, :timestamp, :ip_address, :user_agent)`
	
	_, err := db.NamedExec(query, auditLog)
	return err
}

// Command queries

// GetPendingCommands retrieves pending commands for a device
func GetPendingCommands(db *sqlx.DB, deviceID uuid.UUID) ([]models.Command, error) {
	var commands []models.Command
	query := `
		SELECT * FROM commands 
		WHERE device_id = $1 AND status IN ('queued', 'in_progress')
		ORDER BY created_at ASC`
	
	err := db.Select(&commands, query, deviceID)
	if err != nil {
		return nil, err
	}
	
	// Return empty slice if no commands found
	if commands == nil {
		commands = []models.Command{}
	}
	
	return commands, nil
}

// UpdateCommandStatus updates a command's status and result
func UpdateCommandStatus(db *sqlx.DB, commandID uuid.UUID, status models.CommandStatus, result *models.CommandResult) error {
	query := `
		UPDATE commands SET
			status = $2,
			executed_at = NOW(),
			result = $3
		WHERE id = $1`
	
	var resJSON any
	if result != nil {
		b, _ := json.Marshal(result)
		resJSON = b
	}
	_, err := db.Exec(query, commandID, status, resJSON)
	return err
}

// ExpireOldCommands marks old commands as expired
func ExpireOldCommands(db *sqlx.DB, deviceID uuid.UUID, timeout time.Duration) error {
	query := `
		UPDATE commands SET status = 'expired'
		WHERE device_id = $1 AND status IN ('queued','in_progress')
		  AND created_at < NOW() - ($2 || ' minutes')::interval`
	
	_, err := db.Exec(query, deviceID, strconv.Itoa(int(timeout.Minutes())))
	return err
}

// ValidateCommandOwnership verifies that a command belongs to a specific device
func ValidateCommandOwnership(db *sqlx.DB, commandID, deviceID uuid.UUID) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM commands WHERE id = $1 AND device_id = $2`
	err := db.Get(&count, query, commandID, deviceID)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// User queries

// FindUserByUsername retrieves a user by username
func FindUserByUsername(db *sqlx.DB, username string) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE username = $1`
	err := db.Get(&user, query, username)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindUserByID retrieves a user by ID
func FindUserByID(db *sqlx.DB, userID uuid.UUID) (*models.User, error) {
	var user models.User
	query := `SELECT * FROM users WHERE id = $1`
	err := db.Get(&user, query, userID)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// ListUsers retrieves users with pagination
func ListUsers(db *sqlx.DB, offset, limit int) ([]models.User, error) {
	var users []models.User
	query := `SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	
	err := db.Select(&users, query, limit, offset)
	if err != nil {
		return nil, err
	}
	
	// Return empty slice if no users found
	if users == nil {
		users = []models.User{}
	}
	
	return users, nil
}

// CountUsers returns the total number of users
func CountUsers(db *sqlx.DB) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM users`
	err := db.Get(&count, query)
	return count, err
}

// CountAdminUsers returns the number of admin users
func CountAdminUsers(db *sqlx.DB) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM users WHERE role = 'admin'`
	err := db.Get(&count, query)
	return count, err
}

// CreateUser inserts a new user into the database
func CreateUser(db *sqlx.DB, user *models.User) error {
	query := `
		INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
		VALUES (:id, :username, :password_hash, :role, :created_at, :updated_at)`
	
	_, err := db.NamedExec(query, user)
	return err
}

// UpdateUser updates user fields
func UpdateUser(db *sqlx.DB, userID uuid.UUID, update *models.UserUpdate) error {
	setParts := []string{}
	args := []interface{}{}
	argCount := 1

	if update.Password != nil {
		setParts = append(setParts, "password_hash = $"+strconv.Itoa(argCount))
		args = append(args, *update.Password)
		argCount++
	}

	if update.Role != nil {
		setParts = append(setParts, "role = $"+strconv.Itoa(argCount))
		args = append(args, string(*update.Role))
		argCount++
	}

	if len(setParts) == 0 {
		return nil // No updates to make
	}

	setParts = append(setParts, "updated_at = NOW()")
	
	query := "UPDATE users SET " + strings.Join(setParts, ", ") + " WHERE id = $" + strconv.Itoa(argCount)
	args = append(args, userID)

	_, err := db.Exec(query, args...)
	return err
}

// DeleteUser removes a user from the database
func DeleteUser(db *sqlx.DB, userID uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := db.Exec(query, userID)
	return err
}

func DeleteDevice(db *sqlx.DB, deviceID uuid.UUID) error {
	query := `DELETE FROM devices WHERE id = $1`
	_, err := db.Exec(query, deviceID)
	return err
}