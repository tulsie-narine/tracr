// Device status enum
export type DeviceStatus = 'active' | 'inactive' | 'offline' | 'error'

// Base device interface
export interface Device {
  id: string
  hostname: string
  domain: string
  manufacturer: string
  model: string
  serial_number: string
  os_caption: string
  os_version: string
  os_build: string
  first_seen: string
  last_seen: string
  token_created_at: string
  status: DeviceStatus
  created_at: string
  updated_at: string
}

// Import SnapshotSummary from snapshot module to avoid duplication
import { SnapshotSummary } from './snapshot'

// Device with computed fields for list views
export interface DeviceListItem extends Device {
  latest_snapshot?: SnapshotSummary | null
  is_online: boolean
  uptime_hours?: number | null
}

// Device registration request
export interface DeviceRegistration {
  hostname: string
  os_version: string
  agent_version: string
}

// Device registration response
export interface DeviceRegistrationResponse {
  device_id: string
  device_token: string
}