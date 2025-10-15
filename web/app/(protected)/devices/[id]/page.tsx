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
import { validateDeviceId } from '@/lib/utils'

function InvalidDeviceIdPage({ deviceId, router }: { deviceId: string; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/devices')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Devices
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h3 className="text-lg font-semibold">Invalid Device ID Format</h3>
              <p className="text-muted-foreground max-w-md">
                Device IDs must be valid UUIDs. The provided ID &ldquo;{deviceId}&rdquo; is not in the correct format.
              </p>
              <div className="bg-muted p-4 rounded-lg text-left max-w-md">
                <h4 className="font-medium mb-2">What this means:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• This device was likely registered with a development/mock API server</li>
                  <li>• Production systems require UUID-formatted device IDs</li>
                  <li>• The device needs to be re-registered with a production API</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => router.push('/devices')}>
                  Back to Device List
                </Button>
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(deviceId)}>
                  Copy Device ID
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function DeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.id as string
  
  const [selectedTab, setSelectedTab] = useState('overview')

  // Always call hooks - move validation after hooks
  const { 
    data: device, 
    error, 
    isLoading
  } = useSWR(
    deviceId && validateDeviceId(deviceId) ? ['device', deviceId] : null,
    () => fetchDeviceDetail(deviceId),
    { refreshInterval: 60000 } // Refresh every 60 seconds
  )

  // Redirect back to devices page if device not found
  useEffect(() => {
    if (error && error.message === 'Device not found') {
      router.push('/devices')
    }
  }, [error, router])

  // Validate device ID format after hooks
  if (!validateDeviceId(deviceId)) {
    return <InvalidDeviceIdPage deviceId={deviceId} router={router} />
  }

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
    let errorMessage = 'Failed to load device details'
    let errorDescription = error.message || 'An unexpected error occurred'
    
    // Parse specific error types
    if (error.message?.includes('400')) {
      errorMessage = 'Invalid Device ID'
      errorDescription = 'The device ID format is invalid. Device IDs must be valid UUIDs.'
    } else if (error.message?.includes('404')) {
      errorMessage = 'Device Not Found'
      errorDescription = 'This device does not exist or may have been deleted.'
    } else if (error.message?.includes('401')) {
      errorMessage = 'Authentication Required'
      errorDescription = 'Please log in again to access device details.'
    } else if (error.message?.includes('500')) {
      errorMessage = 'Server Error'
      errorDescription = 'A server error occurred. Please try again later.'
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>{errorMessage}</CardTitle>
            </div>
            <CardDescription>
              {errorDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push('/devices')}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Devices
              </Button>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(deviceId)}
                className="flex-1"
              >
                Copy Device ID
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Device ID: {deviceId}
            </p>
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