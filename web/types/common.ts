// Pagination parameters for list requests
export interface PaginationParams {
  page: number
  limit: number
}

// Pagination metadata in responses
export interface PaginationMeta {
  total: number
  page: number
  limit: number
  total_pages: number
}

// Generic paginated response structure
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

// API error response structure
export interface ApiError {
  error: string
  status: number
  details?: Record<string, unknown>
}

// Common filter parameters
export interface FilterParams {
  search?: string
  status?: string
  sort?: string
  start_date?: string
  end_date?: string
}