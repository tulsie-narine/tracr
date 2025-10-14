'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { fetchSoftwareCatalog } from '@/lib/api-client'
import { useDebounce } from '@/lib/hooks/use-debounce'
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Package,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

export default function SoftwarePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize state from URL params
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [limit] = useState(50)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [publisher, setPublisher] = useState(searchParams.get('publisher') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'device_count')
  
  const debouncedSearch = useDebounce(search, 500)

  const {
    data,
    error,
    isLoading,
    mutate
  } = useSWR(
    ['software', page, limit, debouncedSearch, publisher, sortBy],
    () => fetchSoftwareCatalog(page, limit, debouncedSearch, publisher, sortBy),
    { refreshInterval: 120000 }
  )

  const software = data?.data || []
  const pagination = data?.pagination

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page.toString())
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (publisher) params.set('publisher', publisher)
    if (sortBy !== 'device_count') params.set('sort', sortBy)
    
    const queryString = params.toString()
    router.replace(queryString ? `/software?${queryString}` : '/software')
  }, [page, debouncedSearch, publisher, sortBy, router])

  // Extract unique publishers from software data
  const uniquePublishers = Array.from(
    new Set(software.map(item => item.publisher).filter(Boolean))
  ).sort()

  const handleRefresh = () => {
    mutate()
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handlePublisherChange = (value: string) => {
    setPublisher(value === 'all' ? '' : value)
    setPage(1)
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
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

  const isKnownPublisher = (pub: string) => {
    const knownPublishers = ['Microsoft', 'Adobe', 'Google', 'Apple', 'Oracle', 'Mozilla']
    return knownPublishers.some(known => pub.toLowerCase().includes(known.toLowerCase()))
  }

  // Calculate summary statistics
  const totalSoftware = pagination?.total || 0
  const totalDevices = software.reduce((sum, item) => sum + item.device_count, 0)
  const mostCommon = software.length > 0 ? software[0] : null

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Software Catalog</h1>
        </div>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Aggregated software inventory across all devices
      </p>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">Total Software</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSoftware}</div>
            <p className="text-xs text-muted-foreground">
              Unique applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium">Device Instances</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">
              Total installations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium">Most Common</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {mostCommon ? mostCommon.name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {mostCommon ? `${mostCommon.device_count} devices` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search software by name..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={publisher || 'all'}
              onValueChange={handlePublisherChange}
            >
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Publishers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publishers</SelectItem>
                {uniquePublishers.map((pub) => (
                  <SelectItem key={pub} value={pub}>
                    {pub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="device_count">Most Devices</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="latest_seen">Latest Seen</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Software Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Error loading software</h3>
              <p className="text-muted-foreground">
                {error.message || 'Failed to load software catalog'}
              </p>
            </div>
          ) : software.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No software found</h3>
              <p className="text-muted-foreground mb-4">
                {debouncedSearch || publisher 
                  ? 'No software matches your search criteria.'
                  : 'No software data available. Software will appear here once devices submit inventory data.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Software Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Version</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead>Device Count</TableHead>
                    <TableHead className="hidden md:table-cell">Latest Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {software.map((item, index) => (
                    <TableRow key={`${item.name}-${item.version}-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{item.version || 'Unknown'}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.publisher || 'Unknown'}</span>
                          {item.publisher && isKnownPublisher(item.publisher) && (
                            <Badge variant="outline" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.device_count}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(item.latest_seen), { addSuffix: true })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.latest_seen), 'PPP')}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} software items
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