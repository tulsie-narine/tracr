'use client'

import ProtectedRoute from '@/components/protected-route'
import Sidebar from '@/components/sidebar'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 min-h-screen p-6 bg-background">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}