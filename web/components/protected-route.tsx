'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Store current path for redirect after login
        if (pathname !== '/login') {
          sessionStorage.setItem('redirect_after_login', pathname)
        }
        router.push('/login')
        return
      }

      // Check role requirements
      if (requiredRole && user && user.role !== requiredRole) {
        // If admin role required but user is viewer, deny access
        if (requiredRole === 'admin' && user.role === 'viewer') {
          router.push('/dashboard') // Redirect to safe page
          return
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname, requiredRole])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render content if not authenticated or checking auth
  if (!isAuthenticated) {
    return null
  }

  // Check role requirements
  if (requiredRole && user && user.role !== requiredRole) {
    if (requiredRole === 'admin' && user.role === 'viewer') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              You don&apos;t have permission to access this page.
            </p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}