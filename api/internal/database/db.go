package database

import (
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

var DB *sqlx.DB

func Connect(databasePath string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("sqlite3", databasePath+"?_journal_mode=WAL&_timeout=5000&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// SQLite connection pool: single writer, WAL mode for better concurrency
	db.SetMaxOpenConns(1) // SQLite handles one writer at a time
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	DB = db
	return db, nil
}

func HealthCheck() error {
	if DB == nil {
		return fmt.Errorf("database connection not initialized")
	}
	
	return DB.Ping()
}