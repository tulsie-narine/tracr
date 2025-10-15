'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Package,
  Building2,
  Calendar,
  HardDrive
} from 'lucide-react'
import { fetchDeviceDetail, fetchSnapshotDetail } from '@/lib/api-client'
import { formatBytes, safeFormatDistanceToNow, safeFormatDate } from '@/lib/utils'
import { Software } from '@/types'

interface DeviceSoftwareProps {
  deviceId: string
}

export default function DeviceSoftware({ deviceId }: DeviceSoftwareProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { data: device } = useSWR(['device', deviceId], () => fetchDeviceDetail(deviceId))
  
  const { 
    data: snapshot, 
    error, 
    isLoading 
  } = useSWR(
    device?.latest_snapshot?.id ? ['snapshot', deviceId, device.latest_snapshot.id] : null,
    () => fetchSnapshotDetail(deviceId, device!.latest_snapshot!.id),
    { refreshInterval: 60000 }
  )

  const software: Software[] = snapshot?.software || []

  // Filter and sort software
  const filteredSoftware = software
    .filter(item => 
      !search || 
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.version?.toLowerCase().includes(search.toLowerCase()) ||
      item.publisher?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const getValue = (sw: Software) => {
        switch (sortBy) {
          case 'name':
            return sw.name || ''
          case 'version':
            return sw.version || ''
          case 'publisher':
            return sw.publisher || ''
          case 'install_date':
            return sw.install_date || ''
          case 'size_kb':
            return sw.size_kb || 0
          default:
            return 0
        }
      }

      const aVal = getValue(a)
      const bVal = getValue(b)

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
      }

      return sortOrder === 'desc' ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal)
    })

  // Calculate statistics
  const totalSoftware = software.length
  const totalSizeKB = software.reduce((sum, item) => sum + (item.size_kb || 0), 0)
  const uniquePublishers = new Set(software.map(item => item.publisher).filter(Boolean)).size
  const recentInstalls = software.filter(item => {
    if (!item.install_date) return false
    const installDate = new Date(item.install_date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return installDate > thirtyDaysAgo
  }).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading software data...</p>
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
            <CardTitle>Error Loading Software Data</CardTitle>
          </div>
          <CardDescription>
            {error.message || 'Failed to load device software data'}
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
            <Package className="h-5 w-5" />
            <CardTitle>Installed Software</CardTitle>
          </div>
          <CardDescription>
            Applications and programs installed on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search software..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="version">Version</SelectItem>
                <SelectItem value="publisher">Publisher</SelectItem>
                <SelectItem value="install_date">Install Date</SelectItem>
                <SelectItem value="size_kb">Size</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">A to Z</SelectItem>
                <SelectItem value="desc">Z to A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredSoftware.length} of {totalSoftware} installed programs
          </div>
        </CardContent>
      </Card>

      {/* Software Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSoftware}</div>
            <p className="text-xs text-muted-foreground">
              Installed applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium">Publishers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniquePublishers}</div>
            <p className="text-xs text-muted-foreground">
              Unique vendors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-sm font-medium">Recent Installs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentInstalls}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalSizeKB * 1024)}</div>
            <p className="text-xs text-muted-foreground">
              Disk space used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Software Table */}
      <Card>
        <CardContent className="p-0">
          {filteredSoftware.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No software found</h3>
              <p className="text-muted-foreground">
                {search ? 'Try adjusting your search criteria.' : 'No software information has been collected for this device yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Install Date</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSoftware.map((item, index) => (
                  <TableRow key={`${item.name}-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {item.version ? (
                        <Badge variant="outline" className="text-xs">
                          {item.version}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unknown</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.publisher || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {item.install_date ? (
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {safeFormatDistanceToNow(item.install_date, { addSuffix: true })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {safeFormatDate(item.install_date, 'PPP')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unknown</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {item.size_kb ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium">
                            {formatBytes(item.size_kb * 1024)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.size_kb.toLocaleString()} KB
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unknown</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}