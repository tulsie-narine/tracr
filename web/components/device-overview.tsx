'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeviceListItem } from '@/types'
import { formatDistanceToNow, format } from 'date-fns'
import { safeFormatDistanceToNow, safeFormatDate, isValidDate } from '@/lib/utils'
import { 
  Monitor, 
  HardDrive, 
  Cpu, 
  Clock,
  Hash,
  Laptop
} from 'lucide-react'

interface DeviceOverviewProps {
  device: DeviceListItem
  isOnline: boolean
}

export default function DeviceOverview({ device, isOnline }: DeviceOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* System Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <CardTitle>System Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Hostname</p>
            <p className="text-lg">{device.hostname}</p>
          </div>
          
          {device.domain && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Domain</p>
              <p className="text-lg">{device.domain}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Operating System</p>
            <div className="flex flex-col gap-1">
              <p className="text-lg">{device.os_caption}</p>
              <p className="text-sm text-muted-foreground">
                Version {device.os_version} (Build {device.os_build})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hardware Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Laptop className="h-5 w-5" />
            <CardTitle>Hardware Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Manufacturer</p>
            <p className="text-lg">{device.manufacturer || 'Unknown'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Model</p>
            <p className="text-lg">{device.model || 'Unknown'}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
            <p className="text-lg font-mono">{device.serial_number || 'Unknown'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Status & Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Status & Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-lg">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          
          {device.last_seen && isValidDate(device.last_seen) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Seen</p>
              <p className="text-lg">{safeFormatDistanceToNow(device.last_seen, { addSuffix: true })}</p>
              <p className="text-sm text-muted-foreground">
                {safeFormatDate(device.last_seen, 'PPpp')}
              </p>
            </div>
          )}
          
          {device.uptime_hours !== undefined && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Uptime</p>
              <p className="text-lg">{Math.floor(device.uptime_hours / 24)}d {Math.floor(device.uptime_hours % 24)}h</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            <CardTitle>Device Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Device ID</p>
            <p className="text-sm font-mono bg-muted p-2 rounded">{device.id}</p>
          </div>
          
          {device.first_seen && isValidDate(device.first_seen) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">First Seen</p>
              <p className="text-lg">{safeFormatDate(device.first_seen, 'PPP')}</p>
              <p className="text-sm text-muted-foreground">
                {safeFormatDistanceToNow(device.first_seen, { addSuffix: true })}
              </p>
            </div>
          )}
          
          {device.token_created_at && isValidDate(device.token_created_at) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Token Created</p>
              <p className="text-lg">{safeFormatDate(device.token_created_at, 'PPP')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Snapshot Info */}
      {device.latest_snapshot && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <CardTitle>Latest Snapshot</CardTitle>
            </div>
            <CardDescription>
              Most recent system snapshot data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Snapshot ID</p>
              <p className="text-sm font-mono bg-muted p-2 rounded">{device.latest_snapshot.id}</p>
            </div>
            
            {device.latest_snapshot.collected_at && isValidDate(device.latest_snapshot.collected_at) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collected At</p>
                <p className="text-lg">{safeFormatDistanceToNow(device.latest_snapshot.collected_at, { addSuffix: true })}</p>
                <p className="text-sm text-muted-foreground">
                  {safeFormatDate(device.latest_snapshot.collected_at, 'PPpp')}
                </p>
              </div>
            )}

            {device.latest_snapshot.cpu_percent !== undefined && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                <p className="text-lg">{device.latest_snapshot.cpu_percent.toFixed(1)}%</p>
              </div>
            )}

            {device.latest_snapshot.memory_used_bytes && device.latest_snapshot.memory_total_bytes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Memory Usage</p>
                <p className="text-lg">
                  {((device.latest_snapshot.memory_used_bytes / device.latest_snapshot.memory_total_bytes) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agent Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            <CardTitle>Agent Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Registration Status</p>
            <div className="flex items-center gap-2">
              <Badge variant="default">Registered</Badge>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Created At</p>
            <p className="text-lg">{format(new Date(device.created_at), 'PPP')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
            <p className="text-lg">{formatDistanceToNow(new Date(device.updated_at), { addSuffix: true })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}