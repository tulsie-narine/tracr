// Command status enum
export type CommandStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'expired'

// Command type enum
export type CommandType = 'refresh_now'

// Command interface
export interface Command {
  id: string
  device_id: string
  command_type: CommandType
  payload: Record<string, unknown> | null
  status: CommandStatus
  created_at: string
  executed_at?: string
  result: Record<string, unknown> | null
}

// Command creation request
export interface CommandRequest {
  command_type: CommandType
  payload?: Record<string, unknown>
}

// Command execution result
export interface CommandResult {
  success: boolean
  message?: string
  error?: string
}

// Refresh now payload
export interface RefreshNowPayload {
  force?: boolean
}