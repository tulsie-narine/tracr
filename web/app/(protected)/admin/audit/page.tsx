'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Filter
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

import { fetchAuditLogs } from '@/lib/api-client'
import { config } from '@/lib/env'
import { useAuth } from '@/lib/auth-context'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AuditLogsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const limit = 50

  // Initialize from URL params
  useEffect(() => {
    const pageParam = searchParams.get('page')
    const actionParam = searchParams.get('action')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    if (pageParam) setPage(parseInt(pageParam, 10))
    if (actionParam) setAction(actionParam)
    if (startDateParam) setStartDate(startDateParam)
    if (endDateParam) setEndDate(endDateParam)
  }, [searchParams])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page.toString())
    if (action) params.set('action', action)
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)

    const query = params.toString()
    const url = query ? `/admin/audit?${query}` : '/admin/audit'
    router.push(url, { scroll: false })
  }, [page, action, startDate, endDate, router])

  const { data, error, isLoading, mutate } = useSWR(
    user?.role === 'admin' ? [config.apiUrl + '/v1/audit-logs', { page, limit, action, startDate, endDate }] : null,
    () => fetchAuditLogs(page, limit, { 
      action: action || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    }),
    { refreshInterval: 60000 }
  )

  // Role-based access control
  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You do not have permission to access this page. Only administrators can view audit logs.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  const handleRefresh = () => {
    mutate()
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleActionChange = (value: string) => {
    setAction(value === 'all' ? '' : value)
    setPage(1)
  }

  const handleStartDateChange = (value: string) => {
    setStartDate(value)
    setPage(1)
  }

  const handleEndDateChange = (value: string) => {
    setEndDate(value)
    setPage(1)
  }

  const clearFilters = () => {
    setAction('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const hasActiveFilters = action || startDate || endDate

  const getActionBadgeVariant = (actionType: string) => {
    if (actionType.startsWith('create_')) return 'default' // green
    if (actionType.startsWith('update_')) return 'secondary' // blue  
    if (actionType.startsWith('delete_')) return 'destructive' // red
    if (actionType === 'login') return 'outline' // gray
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            View system activity and user actions
            {data && (
              <span className="ml-2">
                • {data.pagination.total} total logs
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Action Filter */}
            <div className="w-full sm:w-48">
              <Select value={action || 'all'} onValueChange={handleActionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create_command">Create Command</SelectItem>
                  <SelectItem value="create_user">Create User</SelectItem>
                  <SelectItem value="update_user">Update User</SelectItem>
                  <SelectItem value="delete_user">Delete User</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Filters */}
            <div className="flex gap-4">
              <div>
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full sm:w-40"
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full sm:w-40"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
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
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Device</TableHead>
                <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                <TableHead className="hidden xl:table-cell">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
                    Error loading audit logs: {error.message}
                  </TableCell>
                </TableRow>
              ) : !data?.data.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {hasActiveFilters 
                      ? 'No audit logs match your filter criteria. Try adjusting your filters.'
                      : 'No audit logs found'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div 
                        className="text-sm"
                        title={format(new Date(log.timestamp), 'PPpp')}
                      >
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {log.username || 'System'}
                        </span>
                        {log.username && user?.username === log.username && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {log.hostname || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {log.ip_address}
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.details && typeof log.details === 'object' 
                          ? JSON.stringify(log.details)
                          : log.details || '-'
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {data && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, data.pagination.total)} of {data.pagination.total} logs
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {page} of {data.pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= data.pagination.total_pages}
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