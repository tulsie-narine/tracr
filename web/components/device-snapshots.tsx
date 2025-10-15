'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  AlertCircle, 
  Loader2, 
  Search, 
  Eye,
  Calendar,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react'
import { fetchDeviceSnapshots } from '@/lib/api-client'
import { formatDistanceToNow, format } from 'date-fns'
import { safeFormatDistanceToNow, safeFormatDate, isValidDate } from '@/lib/utils'
import { formatBytes } from '@/lib/utils'

interface DeviceSnapshotsProps {
  deviceId: string
}

export default function DeviceSnapshots({ deviceId }: DeviceSnapshotsProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('collected_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { 
    data: response, 
    error, 
    isLoading 
  } = useSWR(
    ['device-snapshots', deviceId, page, search, sortBy, sortOrder],
    () => fetchDeviceSnapshots(deviceId, page, 20),
    { refreshInterval: 60000 }
  )

  const snapshots = response?.data || []
  const pagination = response?.pagination

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading snapshots...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Error Loading Snapshots</CardTitle>
          </div>
          <CardDescription>
            {error.message || 'Failed to load device snapshots'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            <CardTitle>Device Snapshots</CardTitle>
          </div>
          <CardDescription>
            System snapshots collected from this device over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search snapshots..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collected_at">Collection Time</SelectItem>
                <SelectItem value="cpu_percent">CPU Usage</SelectItem>
                <SelectItem value="memory_used_bytes">Memory Usage</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(value: 'asc' | 'desc') => {
                setSortOrder(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          {pagination && (
            <div className="text-sm text-muted-foreground mb-4">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} snapshots
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshots Table */}
      <Card>
        <CardContent className="p-0">
          {snapshots.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No snapshots found</h3>
              <p className="text-muted-foreground">
                {search ? 'Try adjusting your search criteria.' : 'No snapshots have been collected for this device yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Snapshot ID</TableHead>
                  <TableHead>Collected At</TableHead>
                  <TableHead>CPU Usage</TableHead>
                  <TableHead>Memory Usage</TableHead>
                  <TableHead>Boot Time</TableHead>
                  <TableHead>Agent Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {snapshot.id.substring(0, 8)}...
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {snapshot.collected_at && isValidDate(snapshot.collected_at) ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {safeFormatDistanceToNow(snapshot.collected_at, { addSuffix: true })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {safeFormatDate(snapshot.collected_at, 'PPpp')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Invalid date</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {snapshot.cpu_percent !== undefined ? (
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          <span>{snapshot.cpu_percent.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {snapshot.memory_used_bytes && snapshot.memory_total_bytes ? (
                        <div className="flex items-center gap-2">
                          <MemoryStick className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span>
                              {((snapshot.memory_used_bytes / snapshot.memory_total_bytes) * 100).toFixed(1)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(snapshot.memory_used_bytes)} / {formatBytes(snapshot.memory_total_bytes)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {snapshot.boot_time && isValidDate(snapshot.boot_time) ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {safeFormatDistanceToNow(snapshot.boot_time, { addSuffix: true })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        Unknown
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement snapshot detail modal/page
                          console.log('View snapshot:', snapshot.id)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
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
            Page {pagination.page} of {pagination.total_pages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.total_pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}