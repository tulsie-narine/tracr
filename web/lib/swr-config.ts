import { SWRConfiguration } from 'swr'

// Default fetcher function that makes authenticated API requests
const fetcher = async (url: string | [string, RequestInit?]) => {
  let endpoint: string
  let options: RequestInit = {}

  if (typeof url === 'string') {
    endpoint = url
  } else {
    endpoint = url[0]
    options = url[1] || {}
  }

  // Get JWT token from localStorage (client-side only)
  let token: string | null = null
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token')
  }

  // Add authorization header if token exists
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  })

  // Handle authentication errors
  if (response.status === 401) {
    // Clear invalid token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_expires_at')
      // Redirect to login if not already there
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    throw new Error('Unauthorized')
  }

  if (response.status === 403) {
    throw new Error('Forbidden')
  }

  if (response.status === 404) {
    throw new Error('Not found')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Global error handler
const onError = (error: Error) => {
  console.error('SWR Error:', error)
  
  // Here you could add toast notifications or other error handling
  // For now, we'll just log the error
}

export const swrConfig: SWRConfiguration = {
  fetcher,
  onError,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  dedupingInterval: 2000,
  focusThrottleInterval: 5000,
}