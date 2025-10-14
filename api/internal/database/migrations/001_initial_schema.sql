-- Initial schema for Tracr API
-- This creates all the necessary tables for device inventory management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE device_status AS ENUM ('active', 'inactive', 'offline', 'error');
CREATE TYPE command_status AS ENUM ('queued', 'in_progress', 'completed', 'failed', 'expired');
CREATE TYPE user_role AS ENUM ('viewer', 'admin');

-- Devices table
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hostname VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    os_caption VARCHAR(255),
    os_version VARCHAR(100),
    os_build VARCHAR(100),
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    device_token_hash VARCHAR(255) NOT NULL,
    token_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status device_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Snapshots table for inventory data
CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    collected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    agent_version VARCHAR(100),
    snapshot_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for deduplication
    cpu_percent DECIMAL(5,2),
    memory_used_bytes BIGINT,
    memory_total_bytes BIGINT,
    boot_time TIMESTAMP WITH TIME ZONE,
    last_interactive_user VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Volumes table for disk information
CREATE TABLE volumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    name VARCHAR(10) NOT NULL, -- Drive letter (e.g., "C:")
    filesystem VARCHAR(50),
    total_bytes BIGINT NOT NULL,
    free_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Software items table
CREATE TABLE software_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    version VARCHAR(100),
    publisher VARCHAR(255),
    install_date DATE,
    size_kb BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Commands table for device management
CREATE TABLE commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    command_type VARCHAR(50) NOT NULL,
    payload JSONB,
    status command_status NOT NULL DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE,
    result JSONB
);

-- Users table for web UI authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Audit logs table for compliance and security
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Schema migrations tracking
CREATE TABLE schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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

-- Functions and triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (password: admin123 - change in production!)
INSERT INTO users (username, password_hash, role) VALUES 
('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/NWCAs/Ll8NcHGNQ0S', 'admin');

-- Mark this migration as applied
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');