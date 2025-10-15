import { jwtDecode } from 'jwt-decode'
import { mutate } from 'swr'
import { config } from './env'
import { 
  LoginResponse, 
  User, 
  UserLogin, 
  UserRegistration,
  UserUpdate,
  JWTClaims, 
  DeviceListItem, 
  DeviceStatus, 
  PaginatedResponse, 
  SnapshotSummary, 
  Snapshot,
  Command,
  CommandRequest,
  SoftwareCatalogItem,
  AuditLogListItem
} from '@/types'

const API_URL = config.apiUrl

// Check if API is available
let apiHealthStatus: 'unknown' | 'healthy' | 'unhealthy' = 'unknown'

export async function checkApiHealth(): Promise<boolean> {
  // If we know it's placeholder, don't bother checking
  if (API_URL.includes('placeholder')) {
    apiHealthStatus = 'unhealthy'
    return false
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    const isHealthy = response.ok
    apiHealthStatus = isHealthy ? 'healthy' : 'unhealthy'
    return isHealthy
  } catch {
    apiHealthStatus = 'unhealthy'
    return false
  }
}

// Get API health status
export function getApiHealthStatus(): typeof apiHealthStatus {
  return apiHealthStatus
}

// Login function - makes API call and stores token
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    // Check API health first
    const isApiHealthy = await checkApiHealth()
    if (!isApiHealthy) {
      throw new Error('API server is not available. Please check your connection or try again later.')
    }

    const response = await fetch(`${API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password } as UserLogin),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(errorData.error || 'Login failed')
    }

    const loginResponse: LoginResponse = await response.json()
    
    // Store token and expiry in localStorage
    localStorage.setItem('auth_token', loginResponse.token)
    localStorage.setItem('auth_expires_at', loginResponse.expires_at)
    
    return loginResponse
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred during login')
  }
}

// Logout function - clears localStorage and redirects
export function logout(): void {
  // Clear auth data from localStorage
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_expires_at')
  
  // Clear all SWR cache
  mutate(() => true, undefined, { revalidate: false })
  
  // Redirect to login
  window.location.href = '/login'
}

// Get current user from JWT token (no API call needed)
export function getCurrentUser(): User | null {
  try {
    const token = getAuthToken()
    if (!token) return null
    
    // Check if token is expired before decoding
    if (isTokenExpired()) return null
    
    const decoded = jwtDecode<JWTClaims>(token)
    
    // Construct User object from JWT claims
    const user: User = {
      id: decoded.user_id,
      username: decoded.username,
      role: decoded.role,
      created_at: '', // Not available in JWT, would need API call
      updated_at: '', // Not available in JWT, would need API call
    }
    
    return user
  } catch (error) {
    console.error('Error decoding JWT token:', error)
    return null
  }
}

// Check if token is expired
export function isTokenExpired(): boolean {
  try {
    const token = getAuthToken()
    const expiresAt = localStorage.getItem('auth_expires_at')
    
    if (!token || !expiresAt) return true
    
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    
    return now >= expiryDate
  } catch (error) {
    console.error('Error checking token expiration:', error)
    return true
  }
}

// Get auth token from localStorage
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token')
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

// Fetch devices with pagination and filtering
export async function fetchDevices(
  page: number, 
  limit: number, 
  search?: string, 
  status?: DeviceStatus
): Promise<PaginatedResponse<DeviceListItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (search && search.trim()) {
    params.append('search', search.trim())
  }

  if (status && status.trim()) {
    params.append('status', status.trim())
  }

  const url = `${API_URL}/v1/devices?${params.toString()}`
  
  // The actual fetch is handled by SWR's global fetcher with authentication
  // This function just constructs the URL - SWR will call the global fetcher
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch snapshots: ${response.statusText}`)
  }

  const snapshotsJson = await response.json()
  return {
    data: snapshotsJson.snapshots || [],
    pagination: snapshotsJson.pagination || { total: 0, page: 1, limit, total_pages: 0 }
  }

  const devicesJson = await response.json()
  return {
    data: devicesJson.devices || [],
    pagination: devicesJson.pagination || { total: 0, page: 1, limit, total_pages: 0 }
  }
}

// Fetch device statistics by getting all devices and calculating stats
export async function fetchDeviceStats(): Promise<{
  total: number
  online: number
  offline: number
  error: number
}> {
  try {
    // Get all devices to calculate statistics
    const response = await fetchDevices(1, 1000) // Get up to 1000 devices for stats
    const devices = response.data

    const stats = {
      total: response.pagination.total,
      online: devices.filter(device => device.is_online).length,
      offline: devices.filter(device => !device.is_online && device.status !== 'error').length,
      error: devices.filter(device => device.status === 'error').length,
    }

    return stats
  } catch (error) {
    console.error('Error fetching device stats:', error)
    throw error
  }
}

// Fetch device detail with latest snapshot
export async function fetchDeviceDetail(deviceId: string): Promise<DeviceListItem> {
  try {
    const response = await fetch(`${API_URL}/v1/devices/${deviceId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch device detail: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching device detail:', error)
    throw error
  }
}

// Fetch device snapshots with pagination
export async function fetchDeviceSnapshots(
  deviceId: string,
  page: number,
  limit: number
): Promise<PaginatedResponse<SnapshotSummary>> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    const response = await fetch(`${API_URL}/v1/devices/${deviceId}/snapshots?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch device snapshots: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching device snapshots:', error)
    throw error
  }
}

// Fetch full snapshot detail with volumes and software
export async function fetchSnapshotDetail(
  deviceId: string,
  snapshotId: string
): Promise<Snapshot> {
  try {
    const response = await fetch(`${API_URL}/v1/devices/${deviceId}/snapshots/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch snapshot detail: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching snapshot detail:', error)
    throw error
  }
}

// Fetch device commands with pagination and optional status filter
export async function fetchDeviceCommands(
  deviceId: string,
  page: number,
  limit: number,
  status?: string
): Promise<PaginatedResponse<Command>> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (status) {
      params.append('status', status)
    }

    const response = await fetch(`${API_URL}/v1/devices/${deviceId}/commands?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch device commands: ${response.statusText}`)
    }

    const commandsJson = await response.json()
    return {
      data: commandsJson.commands || [],
      pagination: commandsJson.pagination || { total: 0, page: 1, limit, total_pages: 0 }
    }
  } catch (error) {
    console.error('Error fetching device commands:', error)
    throw error
  }
}

// Create a new command for a device
export async function createDeviceCommand(
  deviceId: string,
  commandRequest: CommandRequest
): Promise<Command> {
  try {
    const response = await fetch(`${API_URL}/v1/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commandRequest),
    })

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Not authorized to create commands')
      }
      if (response.status === 404) {
        throw new Error('Device not found')
      }
      if (response.status === 400) {
        throw new Error('Invalid command type')
      }
      throw new Error(`Failed to create command: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error creating device command:', error)
    throw error
  }
}

// Fetch software catalog with pagination, search, filter, and sort
export async function fetchSoftwareCatalog(
  page: number,
  limit: number,
  search?: string,
  publisher?: string,
  sortBy?: string
): Promise<PaginatedResponse<SoftwareCatalogItem>> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (search) {
      params.append('search', search)
    }

    if (publisher) {
      params.append('publisher', publisher)
    }

    if (sortBy) {
      params.append('sort', sortBy)
    } else {
      params.append('sort', 'device_count')
    }

    const response = await fetch(`${API_URL}/v1/software?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch software catalog: ${response.statusText}`)
    }

    const softwareJson = await response.json()
    return {
      data: softwareJson.software || [],
      pagination: softwareJson.pagination || { total: 0, page: 1, limit, total_pages: 0 }
    }
  } catch (error) {
    console.error('Error fetching software catalog:', error)
    throw error
  }
}

// User management functions
export async function fetchUsers(
  page: number,
  limit: number
): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  const url = `${API_URL}/v1/users?${params.toString()}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`)
    }

    const json = await response.json()
    return {
      data: json.users || [],
      pagination: json.pagination || { total: 0, page: 1, limit, total_pages: 0 }
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    throw new Error('Failed to fetch users')
  }
}

export async function createUser(userRegistration: UserRegistration): Promise<User> {
  const url = `${API_URL}/v1/users`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userRegistration),
    })

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('Username already exists')
      }
      if (response.status === 403) {
        throw new Error('Access denied. Admin privileges required.')
      }
      throw new Error(`Failed to create user: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function updateUser(userId: string, userUpdate: UserUpdate): Promise<User> {
  const url = `${API_URL}/v1/users/${userId}`
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userUpdate),
    })

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating user:', error)
    throw new Error('Failed to update user')
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const url = `${API_URL}/v1/users/${userId}`
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    })

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Cannot delete the last admin user')
      }
      if (response.status === 404) {
        throw new Error('User not found')
      }
      throw new Error(`Failed to delete user: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

export async function fetchAuditLogs(
  page: number,
  limit: number,
  filters?: {
    userId?: string
    deviceId?: string
    action?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<PaginatedResponse<AuditLogListItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (filters?.userId) params.append('user_id', filters.userId)
  if (filters?.deviceId) params.append('device_id', filters.deviceId)
  if (filters?.action) params.append('action', filters.action)
  if (filters?.startDate) params.append('start_date', filters.startDate.toISOString())
  if (filters?.endDate) params.append('end_date', filters.endDate.toISOString())

  const url = `${API_URL}/v1/audit-logs?${params.toString()}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    })

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Invalid date format')
      }
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`)
    }

    const json = await response.json()
    return {
      data: json.audit_logs || [],
      pagination: json.pagination || { total: 0, page: 1, limit, total_pages: 0 }
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    throw new Error('Failed to fetch audit logs')
  }
}