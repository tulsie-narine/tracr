'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertCircle, 
  Loader2, 
  Search,
  HardDrive,
  Database,
  AlertTriangle,
  CheckCircle,
  Folder
} from 'lucide-react'
import { fetchDeviceSnapshots } from '@/lib/api-client'
import { formatBytes, getVolumeStatusColor } from '@/lib/utils'
import { Volume } from '@/types'

interface DeviceVolumesProps {
  deviceId: string
}

export default function DeviceVolumes({ deviceId }: DeviceVolumesProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('used_percent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { 
    data: response, 
    error, 
    isLoading 
  } = useSWR(
    ['device-volumes', deviceId],
    () => fetchDeviceSnapshots(deviceId, 1, 1), // Get latest snapshot with volume data
    { refreshInterval: 60000 }
  )

  const latestSnapshot = response?.data?.[0]
  let volumes: Volume[] = []

  // Extract volumes from latest snapshot  
  if (latestSnapshot && 'volumes' in latestSnapshot) {
    const snapshotWithVolumes = latestSnapshot as typeof latestSnapshot & { volumes?: Volume[] }
    volumes = snapshotWithVolumes.volumes || []
  }

  // Filter and sort volumes
  const filteredVolumes = volumes
    .filter(volume => 
      !search || 
      volume.name?.toLowerCase().includes(search.toLowerCase()) ||
      volume.filesystem?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const getValue = (vol: Volume) => {
        switch (sortBy) {
          case 'used_percent':
            return vol.total_bytes > 0 && vol.used_bytes ? (vol.used_bytes / vol.total_bytes) * 100 : 0
          case 'used_bytes':
            return vol.used_bytes || 0
          case 'size_bytes':
            return vol.total_bytes
          case 'free_bytes':
            return vol.free_bytes
          case 'device_id':
            return vol.name || ''
          case 'label':
            return vol.name || ''
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
  const totalVolumes = volumes.length
  const totalCapacity = volumes.reduce((sum, vol) => sum + vol.total_bytes, 0)
  const totalUsed = volumes.reduce((sum, vol) => sum + (vol.used_bytes || 0), 0)
  const totalFree = volumes.reduce((sum, vol) => sum + vol.free_bytes, 0)
  const avgUsedPercent = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0

  // Volume status counts
  const criticalVolumes = volumes.filter(vol => vol.total_bytes > 0 && vol.used_bytes && (vol.used_bytes / vol.total_bytes) * 100 >= 90).length
  const warningVolumes = volumes.filter(vol => vol.total_bytes > 0 && vol.used_bytes && (vol.used_bytes / vol.total_bytes) * 100 >= 80 && (vol.used_bytes / vol.total_bytes) * 100 < 90).length
  const healthyVolumes = volumes.filter(vol => vol.total_bytes > 0 && vol.used_bytes && (vol.used_bytes / vol.total_bytes) * 100 < 80).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading volume data...</p>
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
            <CardTitle>Error Loading Volume Data</CardTitle>
          </div>
          <CardDescription>
            {error.message || 'Failed to load device volume data'}
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
            <CardTitle>Storage Volumes</CardTitle>
          </div>
          <CardDescription>
            Disk drives and storage devices attached to this system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search volumes..."
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
                <SelectItem value="used_percent">Usage %</SelectItem>
                <SelectItem value="used_bytes">Used Space</SelectItem>
                <SelectItem value="size_bytes">Total Size</SelectItem>
                <SelectItem value="free_bytes">Free Space</SelectItem>
                <SelectItem value="device_id">Device ID</SelectItem>
                <SelectItem value="label">Label</SelectItem>
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
                <SelectItem value="desc">High to Low</SelectItem>
                <SelectItem value="asc">Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Volume Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">Total Volumes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolumes}</div>
            <p className="text-xs text-muted-foreground">
              Storage devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalCapacity)}</div>
            <p className="text-xs text-muted-foreground">
              Combined storage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium">Healthy Volumes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyVolumes}</div>
            <p className="text-xs text-muted-foreground">
              &lt; 80% used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <CardTitle className="text-sm font-medium">Warning</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningVolumes}</div>
            <p className="text-xs text-muted-foreground">
              80-90% used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalVolumes}</div>
            <p className="text-xs text-muted-foreground">
              &gt; 90% used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Usage Summary */}
      {totalVolumes > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Storage Usage</CardTitle>
            <CardDescription>
              Combined usage across all storage volumes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total Usage</span>
                <span>{avgUsedPercent.toFixed(1)}%</span>
              </div>
              <Progress 
                value={avgUsedPercent} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBytes(totalUsed)} used</span>
                <span>{formatBytes(totalFree)} free</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Volumes Grid */}
      {filteredVolumes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No volumes found</h3>
              <p className="text-muted-foreground">
                {search ? 'Try adjusting your search criteria.' : 'No storage volumes have been detected on this device.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVolumes.map((volume, index) => {
            const usedPercent = volume.total_bytes > 0 && volume.used_bytes ? (volume.used_bytes / volume.total_bytes) * 100 : 0
            const statusColor = getVolumeStatusColor(usedPercent)
            
            return (
              <Card key={`${volume.name}-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <CardTitle className="text-base">
                        {volume.name || 'Unknown Volume'}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant={usedPercent >= 90 ? 'destructive' : usedPercent >= 80 ? 'secondary' : 'default'}
                    >
                      {usedPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Usage</span>
                      <span>{formatBytes(volume.used_bytes || 0)} / {formatBytes(volume.total_bytes)}</span>
                    </div>
                    <Progress 
                      value={usedPercent} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Free Space</p>
                      <p className="font-medium">{formatBytes(volume.free_bytes)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">File System</p>
                      <p className="font-medium">{volume.filesystem || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <span className="text-xs text-muted-foreground">
                      {usedPercent >= 90 ? 'Critical' : usedPercent >= 80 ? 'Warning' : 'Healthy'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}