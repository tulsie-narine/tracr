'use client'

import { useEffect, useState } from 'react'
import { checkApiHealth } from '@/lib/api-client'
import { config } from '@/lib/env'

export default function ConnectionStatus() {
  const [isChecking, setIsChecking] = useState(true)

  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true)
      const healthy = await checkApiHealth()
      setIsChecking(false)
      
      // Show banner if API is not available and not using placeholder
      if (!healthy && !config.apiUrl.includes('placeholder')) {
        setShowBanner(true)
      } else if (!healthy && config.apiUrl.includes('placeholder')) {
        // Show a different message for placeholder API
        setShowBanner(true)
      }
    }

    // Check on mount
    checkConnection()

    // Check periodically every 30 seconds
    const interval = setInterval(checkConnection, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!showBanner) return null

  const isPlaceholder = config.apiUrl.includes('placeholder')

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-700">
            {isPlaceholder ? (
              <>
                <strong>Development Mode:</strong> No API server configured. 
                Some features may not work properly. Configure{' '}
                <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_API_URL</code>{' '}
                in your Vercel environment variables.
              </>
            ) : (
              <>
                <strong>Connection Issue:</strong> Cannot reach API server at{' '}
                <code className="bg-amber-100 px-1 rounded">{config.apiUrl}</code>.
                {isChecking && ' Checking connection...'}
              </>
            )}
          </p>
          {!isPlaceholder && (
            <button
              onClick={async () => {
                setIsChecking(true)
                const healthy = await checkApiHealth()
                setIsChecking(false)
                if (healthy) setShowBanner(false)
              }}
              className="mt-2 text-sm text-amber-800 underline hover:text-amber-900"
              disabled={isChecking}
            >
              {isChecking ? 'Checking...' : 'Retry Connection'}
            </button>
          )}
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={() => setShowBanner(false)}
              className="inline-flex rounded-md bg-amber-50 p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-amber-50"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}