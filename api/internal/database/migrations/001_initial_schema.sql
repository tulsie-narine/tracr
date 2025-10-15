-- Initial schema for Tracr API
-- SQLite-compatible schema for device inventory management

-- Devices table
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    hostname TEXT NOT NULL,
    domain TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    os_caption TEXT,
    os_version TEXT,
    os_build TEXT,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    device_token_hash TEXT NOT NULL,
    token_created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'offline', 'error')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Snapshots table for inventory data
CREATE TABLE snapshots (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    collected_at TEXT NOT NULL,
    agent_version TEXT,
    snapshot_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
    cpu_percent REAL,
    memory_used_bytes INTEGER,
    memory_total_bytes INTEGER,
    boot_time TEXT,
    last_interactive_user TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Volumes table for disk information
CREATE TABLE volumes (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Drive letter (e.g., "C:")
    filesystem TEXT,
    total_bytes INTEGER NOT NULL,
    free_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Software items table
CREATE TABLE software_items (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version TEXT,
    publisher TEXT,
    install_date TEXT,
    size_kb INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Commands table for device management
CREATE TABLE commands (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    command_type TEXT NOT NULL,
    payload TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'in_progress', 'completed', 'failed', 'expired')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    executed_at TEXT,
    result TEXT
);

-- Users table for web UI authentication
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer', 'admin')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit logs table for compliance and security
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    ip_address TEXT,
    user_agent TEXT
);

-- Schema migrations tracking
CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
-- Device indexes
CREATE INDEX idx_devices_hostname ON devices(hostname);
CREATE INDEX idx_devices_serial_number ON devices(serial_number);
CREATE INDEX idx_devices_last_seen ON devices(last_seen);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_token_hash ON devices(device_token_hash);

-- Snapshot indexes
CREATE INDEX idx_snapshots_device_id ON snapshots(device_id);
CREATE INDEX idx_snapshots_collected_at ON snapshots(collected_at);
CREATE INDEX idx_snapshots_hash ON snapshots(snapshot_hash);
CREATE INDEX idx_snapshots_device_collected ON snapshots(device_id, collected_at DESC);

-- Volume indexes
CREATE INDEX idx_volumes_snapshot_id ON volumes(snapshot_id);

-- Software indexes
CREATE INDEX idx_software_snapshot_id ON software_items(snapshot_id);
CREATE INDEX idx_software_name ON software_items(name);
CREATE INDEX idx_software_publisher ON software_items(publisher);

-- Command indexes
CREATE INDEX idx_commands_device_id ON commands(device_id);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_created_at ON commands(created_at);
CREATE INDEX idx_commands_device_status ON commands(device_id, status);

-- User indexes
CREATE INDEX idx_users_username ON users(username);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_device_id ON audit_logs(device_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Insert initial admin user (password: admin123 - change in production!)
INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/NWCAs/Ll8NcHGNQ0S', 'admin', datetime('now'), datetime('now'));

-- Mark this migration as applied
INSERT INTO schema_migrations (version, applied_at) VALUES ('001_initial_schema', datetime('now'));