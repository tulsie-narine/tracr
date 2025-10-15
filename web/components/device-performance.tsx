'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { 
  AlertCircle, 
  Loader2, 
  TrendingUp,
  Cpu,
  MemoryStick,
  Activity
} from 'lucide-react'
import { fetchDeviceSnapshots } from '@/lib/api-client'
import { format } from 'date-fns'
import { formatBytes, safeFormatDate, isValidDate } from '@/lib/utils'

interface DevicePerformanceProps {
  deviceId: string
}

interface PerformanceDataPoint {
  timestamp: string
  cpu_percent: number
  memory_used_percent: number
  memory_used_bytes: number
  memory_total_bytes: number
  formattedTime: string
}

export default function DevicePerformance({ deviceId }: DevicePerformanceProps) {
  const [timeRange, setTimeRange] = useState('24h')
  
  // Calculate page size and limit based on time range
  const getPageLimit = (range: string) => {
    switch (range) {
      case '1h': return 60   // 1 data point per minute
      case '6h': return 72   // 1 data point per 5 minutes  
      case '24h': return 96  // 1 data point per 15 minutes
      case '7d': return 168  // 1 data point per hour
      case '30d': return 180 // 1 data point per 4 hours
      default: return 96
    }
  }

  const { 
    data: response, 
    error, 
    isLoading 
  } = useSWR(
    ['device-performance', deviceId, timeRange],
    () => fetchDeviceSnapshots(deviceId, 1, getPageLimit(timeRange)),
    { 
      refreshInterval: 60000,
      revalidateOnFocus: false 
    }
  )

  const snapshots = response?.data || []

  // Process data for charts
  const performanceData: PerformanceDataPoint[] = snapshots
    .filter(snapshot => 
      (snapshot.cpu_percent !== undefined || 
      (snapshot.memory_used_bytes && snapshot.memory_total_bytes)) &&
      isValidDate(snapshot.collected_at) // Filter out invalid dates
    )
    .map(snapshot => {
      try {
        return {
          timestamp: snapshot.collected_at,
          cpu_percent: snapshot.cpu_percent || 0,
          memory_used_percent: snapshot.memory_used_bytes && snapshot.memory_total_bytes 
            ? (snapshot.memory_used_bytes / snapshot.memory_total_bytes) * 100 
            : 0,
          memory_used_bytes: snapshot.memory_used_bytes || 0,
          memory_total_bytes: snapshot.memory_total_bytes || 0,
          formattedTime: safeFormatDate(snapshot.collected_at, 'HH:mm', 'Invalid')
        }
      } catch {
        // Skip invalid entries
        return null
      }
    })
    .filter((item): item is PerformanceDataPoint => item !== null) // Remove null entries with type guard
    .reverse() // Show oldest to newest for chart

  // Calculate averages and statistics
  const avgCpuPercent = performanceData.length > 0 
    ? performanceData.reduce((sum, point) => sum + point.cpu_percent, 0) / performanceData.length
    : 0

  const avgMemoryPercent = performanceData.length > 0
    ? performanceData.reduce((sum, point) => sum + point.memory_used_percent, 0) / performanceData.length
    : 0

  const maxCpuPercent = performanceData.length > 0
    ? Math.max(...performanceData.map(point => point.cpu_percent))
    : 0

  const maxMemoryPercent = performanceData.length > 0
    ? Math.max(...performanceData.map(point => point.memory_used_percent))
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading performance data...</p>
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
            <CardTitle>Error Loading Performance Data</CardTitle>
          </div>
          <CardDescription>
            {error.message || 'Failed to load device performance data'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Performance Metrics</CardTitle>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            Real-time performance monitoring and historical trends
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Performance Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">Average CPU</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCpuPercent.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Peak: {maxCpuPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium">Average Memory</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMemoryPercent.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Peak: {maxMemoryPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-sm font-medium">Data Points</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.length}</div>
            <p className="text-xs text-muted-foreground">
              in {timeRange === '1h' ? '1 hour' : timeRange === '6h' ? '6 hours' : timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium">Memory Total</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.length > 0 ? formatBytes(performanceData[performanceData.length - 1].memory_total_bytes) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total system memory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CPU Usage Chart */}
      {performanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>CPU Usage Over Time</CardTitle>
            <CardDescription>
              Processor utilization percentage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formattedTime" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'CPU %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelFormatter={(label: string | number) => `Time: ${label}`}
                    formatter={(value: string | number | (string | number)[]) => [`${Number(value).toFixed(1)}%`, 'CPU Usage']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cpu_percent" 
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Usage Chart */}
      {performanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage Over Time</CardTitle>
            <CardDescription>
              RAM utilization percentage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formattedTime" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Memory %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelFormatter={(label: string | number) => `Time: ${label}`}
                    formatter={(value: string | number | (string | number)[]) => [`${Number(value).toFixed(1)}%`, 'Memory Usage']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="memory_used_percent" 
                    stroke="#10b981" 
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Combined Performance Chart */}
      {performanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Combined Performance Metrics</CardTitle>
            <CardDescription>
              CPU and memory usage comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formattedTime" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    label={{ value: 'Usage %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelFormatter={(label: string | number) => `Time: ${label}`}
                    formatter={(value: string | number | (string | number)[], name: string) => [
                      `${Number(value).toFixed(1)}%`, 
                      name === 'cpu_percent' ? 'CPU Usage' : 'Memory Usage'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cpu_percent" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="CPU Usage"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="memory_used_percent" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Memory Usage"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {performanceData.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No performance data available</h3>
              <p className="text-muted-foreground">
                Performance metrics will appear here once snapshots with CPU and memory data are collected.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}