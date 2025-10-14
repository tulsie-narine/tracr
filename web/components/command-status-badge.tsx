'use client'

import { Badge } from '@/components/ui/badge'
import { CommandStatus } from '@/types'
import { Clock, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

interface CommandStatusBadgeProps {
  status: CommandStatus
}

export default function CommandStatusBadge({ status }: CommandStatusBadgeProps) {
  switch (status) {
    case 'queued':
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Queued
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200">
          <Loader2 className="h-3 w-3 animate-spin" />
          In Progress
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      )
    case 'expired':
      return (
        <Badge className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          {status}
        </Badge>
      )
  }
}