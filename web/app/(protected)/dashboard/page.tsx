'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { fetchDeviceStats, fetchDevices } from '@/lib/api-client'
import { config } from '@/lib/env'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DeviceCard from '@/components/device-card'
import { 
  Monitor, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp,
  ArrowRight 
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  // Fetch device statistics with 60-second polling
  const { data: stats, error: statsError, isLoading: statsLoading } = useSWR(
    'device-stats',
    fetchDeviceStats,
    { refreshInterval: 60000 }
  )

  // Fetch recent devices with 60-second polling
  const { data: devicesData, error: devicesError, isLoading: devicesLoading } = useSWR(
    [config.apiUrl + '/v1/devices', { page: 1, limit: 6 }],
    () => fetchDevices(1, 6),
    { refreshInterval: 60000 }
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {user && (
          <p className="text-lg text-muted-foreground mt-2">
            Welcome back, {user.username}!
          </p>
        )}
      </div>

      {/* Device Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))
        ) : statsError ? (
          <Card className="md:col-span-2 lg:col-span-4">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load device statistics</p>
              </div>
            </CardContent>
          </Card>
        ) : stats ? (
          <>
            {/* Total Devices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Managed devices
                </p>
              </CardContent>
            </Card>

            {/* Online Devices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.online}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            {/* Offline Devices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offline</CardTitle>
                <XCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats.offline}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? Math.round((stats.offline / stats.total) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            {/* Error Devices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                <p className="text-xs text-muted-foreground">
                  Devices with issues
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Recent Devices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Recent Devices</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/devices" className="flex items-center gap-2">
              View All Devices
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {devicesLoading ? (
          // Loading skeletons for device cards
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-48">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : devicesError ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Monitor className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load recent devices</p>
              </div>
            </CardContent>
          </Card>
        ) : devicesData?.data && devicesData.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {devicesData.data.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Monitor className="h-8 w-8 mx-auto mb-2" />
                <p>No devices found</p>
                <p className="text-sm mt-1">Devices will appear here once they are registered</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}