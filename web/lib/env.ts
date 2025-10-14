// Centralized environment configuration with validation

function validateUrl(url: string | undefined, name: string): string {
  if (!url) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  try {
    const parsedUrl = new URL(url)
    // Remove trailing slash
    return parsedUrl.toString().replace(/\/$/, '')
  } catch {
    throw new Error(`Invalid URL format for ${name}: ${url}`)
  }
}

function validateString(value: string | undefined, name: string, defaultValue?: string): string {
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Validate and export environment variables
export const API_URL = validateUrl(process.env.NEXT_PUBLIC_API_URL, 'NEXT_PUBLIC_API_URL')
export const APP_NAME = validateString(process.env.NEXT_PUBLIC_APP_NAME, 'NEXT_PUBLIC_APP_NAME', 'Tracr')
export const APP_VERSION = validateString(process.env.NEXT_PUBLIC_APP_VERSION, 'NEXT_PUBLIC_APP_VERSION', '1.0.0')

// Export consolidated configuration object
export const config = {
  apiUrl: API_URL,
  appName: APP_NAME,
  appVersion: APP_VERSION,
} as const

// Validate configuration on module load
if (typeof window === 'undefined') {
  // Server-side validation
  console.log('Environment configuration loaded:', {
    apiUrl: config.apiUrl,
    appName: config.appName,
    appVersion: config.appVersion,
  })
}