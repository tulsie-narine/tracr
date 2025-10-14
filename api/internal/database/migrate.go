package database

import (
	"embed"
	"fmt"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jmoiron/sqlx"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func Migrate(db *sqlx.DB) error {
	// Create schema_migrations table if it doesn't exist
	if err := createMigrationsTable(db); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get list of applied migrations
	appliedMigrations, err := getAppliedMigrations(db)
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// Read migration files
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var migrationFileNames []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			migrationFileNames = append(migrationFileNames, entry.Name())
		}
	}

	// Sort migration files by name (which should include version)
	sort.Strings(migrationFileNames)

	// Apply pending migrations
	for _, fileName := range migrationFileNames {
		version := strings.TrimSuffix(fileName, ".sql")
		
		// Skip if already applied
		if appliedMigrations[version] {
			continue
		}

		if err := applyMigration(db, fileName, version); err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", fileName, err)
		}

		fmt.Printf("Applied migration: %s\n", version)
	}

	return nil
}

func createMigrationsTable(db *sqlx.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(100) PRIMARY KEY,
			applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		);
	`
	
	_, err := db.Exec(query)
	return err
}

func getAppliedMigrations(db *sqlx.DB) (map[string]bool, error) {
	query := "SELECT version FROM schema_migrations"
	
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}

	return applied, rows.Err()
}

func applyMigration(db *sqlx.DB, fileName, version string) error {
	// Read migration file
	content, err := migrationFiles.ReadFile(filepath.Join("migrations", fileName))
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	// Start transaction
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Execute migration SQL
	if _, err := tx.Exec(string(content)); err != nil {
		return fmt.Errorf("failed to execute migration SQL: %w", err)
	}

	// Record migration as applied (if not already done in the SQL)
	checkQuery := "SELECT COUNT(*) FROM schema_migrations WHERE version = $1"
	var count int
	if err := tx.Get(&count, checkQuery, version); err != nil {
		return fmt.Errorf("failed to check migration status: %w", err)
	}

	if count == 0 {
		insertQuery := "INSERT INTO schema_migrations (version) VALUES ($1)"
		if _, err := tx.Exec(insertQuery, version); err != nil {
			return fmt.Errorf("failed to record migration: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration: %w", err)
	}

	return nil
}