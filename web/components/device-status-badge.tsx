import { Badge } from '@/components/ui/badge'
import { DeviceStatus } from '@/types'
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeviceStatusBadgeProps {
  status: DeviceStatus
  isOnline: boolean
}

export default function DeviceStatusBadge({ status, isOnline }: DeviceStatusBadgeProps) {
  if (isOnline) {
    return (
      <Badge className={cn(
        'bg-green-100 text-green-800 border-green-200',
        'hover:bg-green-100' // Prevent hover state change
      )}>
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Online
      </Badge>
    )
  }

  switch (status) {
    case 'error':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      )
    case 'inactive':
      return (
        <Badge className={cn(
          'bg-yellow-100 text-yellow-800 border-yellow-200',
          'hover:bg-yellow-100' // Prevent hover state change
        )}>
          <XCircle className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      )
    case 'offline':
    default:
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )
  }
}