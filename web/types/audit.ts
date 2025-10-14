// Audit log interface
export interface AuditLog {
  id: string
  user_id?: string
  device_id?: string
  action: string
  details: Record<string, unknown> | null
  timestamp: string
  ip_address: string
  user_agent: string
}

// Audit log with joined data for list views
export interface AuditLogListItem extends AuditLog {
  username?: string
  hostname?: string
}