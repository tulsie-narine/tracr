// Centralized environment configuration with validation

// Check if we're in build mode (prerendering/static generation)
const isBuildTime = typeof window === 'undefined' && 
  (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') &&
  !process.env.NEXT_PUBLIC_API_URL

function validateUrl(url: string | undefined, name: string): string {
  if (!url) {
    // During build time (prerendering), provide a fallback URL
    if (isBuildTime || typeof window === 'undefined') {
      console.warn(`Missing ${name}, using fallback URL for build`)
      return 'https://web-production-c4a4.up.railway.app'
    }
    throw new Error(`Missing required environment variable: ${name}`)
  }

  // Auto-add https:// if no protocol is specified
  let fullUrl = url
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    fullUrl = `https://${url}`
  }

  try {
    const parsedUrl = new URL(fullUrl)
    // Remove trailing slash
    return parsedUrl.toString().replace(/\/$/, '')
  } catch (error) {
    console.error(`URL validation failed:`, {
      name,
      originalUrl: url,
      processedUrl: fullUrl,
      isBuildTime,
      error: error instanceof Error ? error.message : String(error)
    })
    throw new Error(`Invalid URL format for ${name}: ${url}`)
  }
}

function validateString(value: string | undefined, name: string, defaultValue?: string): string {
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    if (isBuildTime) {
      return name.includes('APP_NAME') ? 'Tracr' : '1.0.0'
    }
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// Validate and export environment variables
const API_URL = validateUrl(process.env.NEXT_PUBLIC_API_URL, 'NEXT_PUBLIC_API_URL')
const APP_NAME = validateString(process.env.NEXT_PUBLIC_APP_NAME, 'NEXT_PUBLIC_APP_NAME', 'Tracr')
const APP_VERSION = validateString(process.env.NEXT_PUBLIC_APP_VERSION, 'NEXT_PUBLIC_APP_VERSION', '1.0.0')

// Export consolidated configuration object
export const config = {
  apiUrl: API_URL,
  appName: APP_NAME,
  appVersion: APP_VERSION,
} as const

// Export individual values for backward compatibility
export { API_URL, APP_NAME, APP_VERSION }

// Log configuration when not in build mode
if (!isBuildTime) {
  console.log('Environment configuration loaded:', {
    apiUrl: config.apiUrl,
    appName: config.appName,
    appVersion: config.appVersion,
  })
}