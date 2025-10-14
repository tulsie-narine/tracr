'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import DeviceOverview from '@/components/device-overview'
import DeviceSnapshots from '@/components/device-snapshots'
import DevicePerformance from '@/components/device-performance'
import DeviceVolumes from '@/components/device-volumes'
import DeviceSoftware from '@/components/device-software'
import DeviceCommands from '@/components/device-commands'
import DeviceStatusBadge from '@/components/device-status-badge'
import { fetchDeviceDetail } from '@/lib/api-client'
import { formatDistanceToNow } from 'date-fns'

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.id as string
  
  const [selectedTab, setSelectedTab] = useState('overview')

  const { 
    data: device, 
    error, 
    isLoading
  } = useSWR(
    deviceId ? ['device', deviceId] : null,
    () => fetchDeviceDetail(deviceId),
    { refreshInterval: 60000 } // Refresh every 60 seconds
  )

  // Redirect back to devices page if device not found
  useEffect(() => {
    if (error && error.message === 'Device not found') {
      router.push('/devices')
    }
  }, [error, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading device details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Error Loading Device</CardTitle>
            </div>
            <CardDescription>
              {error.message || 'Failed to load device details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => router.push('/devices')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Devices
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!device) {
    return null
  }

  const isOnline = new Date(device.last_seen).getTime() > Date.now() - 5 * 60 * 1000

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/devices')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Devices
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{device.hostname}</h1>
            <DeviceStatusBadge status={device.status} isOnline={isOnline} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>ID: {device.id}</span>
            <span>•</span>
            <span>
              Last seen: {formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })}
            </span>
            {device.os_caption && (
              <>
                <span>•</span>
                <Badge variant="outline">{device.os_caption}</Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="software">Software</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <DeviceOverview device={device} isOnline={isOnline} />
        </TabsContent>

        <TabsContent value="snapshots" className="mt-6">
          <DeviceSnapshots deviceId={deviceId} />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <DevicePerformance deviceId={deviceId} />
        </TabsContent>

        <TabsContent value="volumes" className="mt-6">
          <DeviceVolumes deviceId={deviceId} />
        </TabsContent>

        <TabsContent value="software" className="mt-6">
          <DeviceSoftware deviceId={deviceId} />
        </TabsContent>

        <TabsContent value="commands" className="mt-6">
          <DeviceCommands deviceId={deviceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}