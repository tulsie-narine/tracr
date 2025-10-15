// Full snapshot data from agent collection  
// volumes and software fields are populated by the backend when calling GetSnapshot
export interface Snapshot {
  id: string
  device_id: string
  collected_at: string
  agent_version: string
  snapshot_hash: string
  cpu_percent?: number
  memory_used_bytes?: number
  memory_total_bytes?: number
  boot_time?: string
  last_interactive_user: string
  created_at: string
  identity?: Identity
  os?: OS
  hardware?: Hardware
  performance?: Performance
  volumes?: Volume[]
  software?: Software[]
}

// Snapshot summary for device list views
// Summary view of snapshot without volumes and software arrays
// Use fetchSnapshotDetail to get full snapshot with volumes and software
// This type is returned by GetLatestSnapshotSummary and ListSnapshotsByDevice
export interface SnapshotSummary {
  id: string
  collected_at: string
  cpu_percent?: number | null
  memory_used_bytes?: number | null
  memory_total_bytes?: number | null
  boot_time?: string | null
}

// Inventory submission from agents
export interface InventorySubmission {
  identity: Identity
  os: OS
  hardware: Hardware
  performance: Performance
  volumes: Volume[]
  software: Software[]
  collected_at: string
  agent_version: string
}

// Identity information
export interface Identity {
  hostname: string
  domain: string
  last_interactive_user: string
  boot_time: string
}

// Operating system information
export interface OS {
  caption: string
  version: string
  build_number: string
  install_date: string
}

// Hardware information
export interface Hardware {
  manufacturer: string
  model: string
  serial_number: string
}

// Performance metrics
export interface Performance {
  cpu_percent: number
  memory_used_bytes: number
  memory_total_bytes: number
}

// Volume/disk information
export interface Volume {
  id?: string
  snapshot_id?: string
  name: string
  filesystem: string
  total_bytes: number
  free_bytes: number
  created_at?: string
  used_bytes?: number
  used_percent?: number
}

// Software information
export interface Software {
  id?: string
  snapshot_id?: string
  name: string
  version: string
  publisher: string
  install_date?: string
  size_kb?: number
  created_at?: string
}

// Software catalog aggregation
export interface SoftwareCatalogItem {
  name: string
  version: string
  publisher: string
  device_count: number
  latest_seen: string
}