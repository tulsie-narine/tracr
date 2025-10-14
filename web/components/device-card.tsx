import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { DeviceListItem } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import DeviceStatusBadge from '@/components/device-status-badge'
import { formatUptime, formatPercentage } from '@/lib/utils'
import { 
  Monitor, 
  Clock, 
  Cpu, 
  MemoryStick 
} from 'lucide-react'

interface DeviceCardProps {
  device: DeviceListItem
}

export default function DeviceCard({ device }: DeviceCardProps) {
  return (
    <Link href={`/devices/${device.id}`} className="block">
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-base font-medium">{device.hostname}</CardTitle>
              <CardDescription className="text-sm">
                {device.os_caption} {device.os_version}
              </CardDescription>
            </div>
          </div>
          <DeviceStatusBadge status={device.status} isOnline={device.is_online} />
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Manufacturer and Model */}
          {(device.manufacturer || device.model) && (
            <div className="text-sm text-muted-foreground">
              {device.manufacturer} {device.model}
            </div>
          )}
          
          {/* Last Seen */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Last seen:</span>
            <span>{formatDistanceToNow(new Date(device.last_seen), { addSuffix: true })}</span>
          </div>
          
          {/* Uptime */}
          {device.uptime_hours !== undefined && device.uptime_hours !== null && (
            <div className="text-sm">
              <span className="text-muted-foreground">Uptime:</span>
              <span className="ml-2">{formatUptime(device.uptime_hours)}</span>
            </div>
          )}
          
          {/* Performance Metrics */}
          {device.latest_snapshot && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              {/* CPU */}
              {device.latest_snapshot.cpu_percent !== undefined && device.latest_snapshot.cpu_percent !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <Cpu className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">CPU:</span>
                  <span className="font-medium">{device.latest_snapshot.cpu_percent.toFixed(1)}%</span>
                </div>
              )}
              
              {/* Memory */}
              {device.latest_snapshot.memory_used_bytes !== undefined && 
               device.latest_snapshot.memory_total_bytes !== undefined && 
               device.latest_snapshot.memory_used_bytes !== null && 
               device.latest_snapshot.memory_total_bytes !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <MemoryStick className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">RAM:</span>
                  <span className="font-medium">
                    {formatPercentage(device.latest_snapshot.memory_used_bytes, device.latest_snapshot.memory_total_bytes)}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}