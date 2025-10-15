'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { fetchDevices } from '@/lib/api-client'
import { config } from '@/lib/env'
import { formatUptime, formatPercentage, safeFormatDistanceToNow } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { DeviceStatus } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DeviceStatusBadge from '@/components/device-status-badge'
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Monitor,
  Eye
} from 'lucide-react'

export default function DevicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL parameters
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [limit] = useState(50)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')

  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(searchInput, 500)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page.toString())
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (status) params.set('status', status)

    const url = `/devices${params.toString() ? '?' + params.toString() : ''}`
    router.push(url, { scroll: false })
  }, [page, debouncedSearch, status, router])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  // Fetch devices with SWR
  const { data, error, isLoading, mutate } = useSWR(
    [config.apiUrl + '/v1/devices', { page, limit, search: debouncedSearch, status }],
    () => fetchDevices(page, limit, debouncedSearch || undefined, status as DeviceStatus || undefined),
    { refreshInterval: 60000 }
  )

  const handleRefresh = () => {
    mutate()
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus === 'all' ? '' : newStatus)
  }

  const totalPages = data?.pagination.total_pages || 0
  const totalDevices = data?.pagination.total || 0
  const startItem = totalDevices === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(page * limit, totalDevices)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Devices</h1>
          <p className="text-muted-foreground mt-1">
            {totalDevices > 0 ? `Showing ${totalDevices} device${totalDevices !== 1 ? 's' : ''}` : 'No devices found'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Refresh Button */}
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Devices Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead className="hidden md:table-cell">OS</TableHead>
                <TableHead className="hidden lg:table-cell">Last Seen</TableHead>
                <TableHead className="hidden lg:table-cell">Uptime</TableHead>
                <TableHead className="hidden xl:table-cell">CPU</TableHead>
                <TableHead className="hidden xl:table-cell">Memory</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton rows
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Monitor className="h-8 w-8 mx-auto mb-2" />
                      <p>Failed to load devices</p>
                      <p className="text-sm mt-1">Please try refreshing the page</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <DeviceStatusBadge status={device.status} isOnline={device.is_online} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <Link 
                          href={`/devices/${device.id}`}
                          className="font-medium hover:underline"
                        >
                          {device.hostname}
                        </Link>
                        <div className="text-sm text-muted-foreground md:hidden">
                          {device.os_caption}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        <div>{device.os_caption}</div>
                        <div className="text-muted-foreground">{device.os_version}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {device.last_seen ? safeFormatDistanceToNow(device.last_seen, { addSuffix: true }) : 'Unknown'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {device.uptime_hours !== undefined && device.uptime_hours !== null 
                        ? formatUptime(device.uptime_hours)
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {device.latest_snapshot?.cpu_percent !== undefined && device.latest_snapshot?.cpu_percent !== null
                        ? `${device.latest_snapshot.cpu_percent.toFixed(1)}%`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {device.latest_snapshot?.memory_used_bytes !== undefined && 
                       device.latest_snapshot?.memory_total_bytes !== undefined &&
                       device.latest_snapshot?.memory_used_bytes !== null && 
                       device.latest_snapshot?.memory_total_bytes !== null
                        ? formatPercentage(device.latest_snapshot.memory_used_bytes, device.latest_snapshot.memory_total_bytes)
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/devices/${device.id}`} className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Monitor className="h-8 w-8 mx-auto mb-2" />
                      <p>No devices found</p>
                      <p className="text-sm mt-1">
                        {debouncedSearch || status 
                          ? 'Try adjusting your search or filter criteria'
                          : 'Devices will appear here once they are registered'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {totalDevices} devices
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {page} of {totalPages}
            </div>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}