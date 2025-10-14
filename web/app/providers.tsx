'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr-config'
import { AuthProvider } from '@/lib/auth-context'
import ConnectionStatus from '@/components/connection-status'

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SWRConfig value={swrConfig}>
      <AuthProvider>
        <ConnectionStatus />
        {children}
      </AuthProvider>
    </SWRConfig>
  )
}