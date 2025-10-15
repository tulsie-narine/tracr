'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { fetchDeviceCommands } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import CommandStatusBadge from '@/components/command-status-badge'
import CreateCommandDialog from '@/components/create-command-dialog'
import {
  Terminal,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { safeFormatDistanceToNow, safeFormatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Command } from '@/types'

interface DeviceCommandsProps {
  deviceId: string
}

export default function DeviceCommands({ deviceId }: DeviceCommandsProps) {
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')
  
  const { user } = useAuth()

  const {
    data,
    error,
    isLoading,
    mutate
  } = useSWR(
    ['commands', deviceId, page, limit, statusFilter],
    () => fetchDeviceCommands(deviceId, page, limit, statusFilter || undefined),
    { refreshInterval: 30000 }
  )

  const commands = data?.data || []
  const pagination = data?.pagination

  const handleRefresh = () => {
    mutate()
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value)
    setPage(1)
  }

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination && page < pagination.total_pages) {
      setPage(page + 1)
    }
  }

  const formatCommandType = (type: string) => {
    switch (type) {
      case 'refresh_now':
        return 'Refresh Now'
      default:
        return type
    }
  }

  const renderResult = (command: Command) => {
    switch (command.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Success</span>
          </div>
        )
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            <span>Failed</span>
          </div>
        )
      case 'expired':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Expired</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Pending</span>
          </div>
        )
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-destructive" />
            <CardTitle>Error Loading Commands</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {error.message || 'Failed to load command history'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              <CardTitle>Command History</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <CreateCommandDialog
                deviceId={deviceId}
                onSuccess={handleRefresh}
              />
              
              <Select
                value={statusFilter || 'all'}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Commands Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : commands.length === 0 ? (
            <div className="text-center py-8">
              <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No commands found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter 
                  ? 'No commands match the selected filter.'
                  : 'No commands have been created for this device yet.'
                }
              </p>
              {!statusFilter && (
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'admin' 
                    ? 'Click "Create Command" to send a command to this device.'
                    : 'Commands will appear here once created by an administrator.'
                  }
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Command Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Executed</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell>
                      <CommandStatusBadge status={command.status} />
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {formatCommandType(command.command_type)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {safeFormatDistanceToNow(command.created_at, { addSuffix: true })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {safeFormatDate(command.created_at, 'PPpp')}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {command.executed_at ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {safeFormatDistanceToNow(command.executed_at, { addSuffix: true })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {safeFormatDate(command.executed_at, 'PPpp')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {renderResult(command)}
                    </TableCell>
                    
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} commands
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={page >= pagination.total_pages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}