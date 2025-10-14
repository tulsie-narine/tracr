'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { config } from '@/lib/env'
import ApiSetupGuide from '@/components/api-setup-guide'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      // If API is using placeholder URL, show setup guide
      if (config.apiUrl.includes('placeholder')) {
        setShowSetupGuide(true)
        return
      }

      // Otherwise proceed with normal routing
      if (isAuthenticated) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  // Show API setup guide if using placeholder
  if (showSetupGuide) {
    return <ApiSetupGuide />
  }

  // Show loading spinner while redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return null
}
